/* eslint-disable testing-library/no-node-access --
   measurement probe: these tests assert on raw DOM/focus state (the point of
   the exercise) and some deliberately only RECORD behaviour via console.log
   rather than assert it, so the measured stage is not distorted. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { expect, test } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

/**
 * m3 follow-up. m3b showed Radix is IMMUNE to the react-aria focus trap: the
 * FocusScope lives inside `DropdownMenu.Content`, so focus enters the menu and
 * ArrowDown roves even with a hand-rolled trigger.
 *
 * So what DOES the hand-rolled trigger actually cost? That is the real question.
 * `DropdownMenu.Trigger` is what contributes aria-haspopup / aria-expanded /
 * aria-controls and what focus returns to on close. Measure both.
 */

function Correct() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger data-testid="trigger">
        Open menu
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Alpha</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function HandRolled() {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        data-testid="trigger"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open menu
      </button>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Alpha</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const ariaOf = (el: HTMLElement) => ({
  haspopup: el.getAttribute("aria-haspopup"),
  expanded: el.getAttribute("aria-expanded"),
  controls: el.getAttribute("aria-controls"),
  state: el.getAttribute("data-state"),
});

test("3e: trigger ARIA — correct vs hand-rolled", async () => {
  const user = userEvent.setup();

  const correct = render(<Correct />);
  await user.click(screen.getByTestId("trigger"));
  console.log(
    `[3e] CORRECT open:     ${JSON.stringify(ariaOf(screen.getByTestId("trigger")))}`,
  );
  correct.unmount();

  render(<HandRolled />);
  await user.click(screen.getByTestId("trigger"));
  const handRolled = ariaOf(screen.getByTestId("trigger"));
  console.log(`[3e] HAND-ROLLED open: ${JSON.stringify(handRolled)}`);

  // the menu is fully functional...
  expect(screen.getByRole("menu")).toBeVisible();
  // ...but the trigger tells assistive tech nothing about it
  expect(handRolled.haspopup).toBeNull();
  expect(handRolled.expanded).toBeNull();
  expect(handRolled.controls).toBeNull();
});

test("3f: focus restoration on Escape — correct vs hand-rolled", async () => {
  const user = userEvent.setup();

  const correct = render(<Correct />);
  await user.click(screen.getByTestId("trigger"));
  await user.keyboard("{Escape}");
  const correctRestored =
    document.activeElement === screen.getByTestId("trigger");
  console.log(
    `[3f] CORRECT — focus back on trigger after Escape = ${String(correctRestored)}`,
  );
  correct.unmount();

  render(<HandRolled />);
  await user.click(screen.getByTestId("trigger"));
  await user.keyboard("{Escape}");
  const handRestored = document.activeElement === screen.getByTestId("trigger");
  console.log(
    `[3f] HAND-ROLLED — focus back on trigger after Escape = ${String(handRestored)}`,
  );
  console.log(
    `[3f] HAND-ROLLED activeElement after Escape = ${document.activeElement?.tagName ?? "<null>"}`,
  );

  expect(correctRestored).toBe(true);
});
