/* eslint-disable testing-library/no-node-access, vitest/expect-expect --
   measurement probe: these tests assert on raw DOM/focus state (the point of
   the exercise) and some deliberately only RECORD behaviour via console.log
   rather than assert it, so the measured stage is not distorted. */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { expect, test } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

const describeActive = () => {
  const el = document.activeElement;
  if (el === null) return "<null>";
  return `${el.tagName} "${el.textContent.slice(0, 20)}"`;
};

/**
 * MISTAKE 3 — "the menu opens but focus never enters it".
 *
 * The react-aria version of this trap is: hand-roll the overlay, keep <Menu>,
 * pass every render assertion, focus never lands. The Radix equivalent is to
 * drive `open` yourself from your own button and skip `DropdownMenu.Trigger`.
 */

test("3a: CONTROL — correct Trigger + Content, focus enters the menu", async () => {
  const user = userEvent.setup();
  render(
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item>Beta</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>,
  );

  await user.click(screen.getByText("Open menu"));

  const menu = screen.getByRole("menu");
  console.log(`[3a] activeElement = ${describeActive()}`);
  console.log(
    `[3a] menu.contains(activeElement) = ${String(menu.contains(document.activeElement))}`,
  );
  expect(menu.contains(document.activeElement)).toBe(true);
});

/**
 * 3b — THE MISTAKE: own state, own button, no DropdownMenu.Trigger.
 * This is exactly what a "I already have a styled button" refactor produces.
 */
function HandRolledTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      {/* a plain button instead of DropdownMenu.Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open menu
      </button>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item>Beta</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

test("3b: MISTAKE — hand-rolled trigger, no DropdownMenu.Trigger", async () => {
  const user = userEvent.setup();
  render(<HandRolledTrigger />);

  await user.click(screen.getByText("Open menu"));

  const menu = screen.getByRole("menu");

  // --- assertions a Claude-written test would plausibly make: ALL GREEN ---
  expect(menu).toBeInTheDocument();
  expect(menu).toBeVisible();
  expect(screen.getByText("Alpha")).toBeVisible();
  expect(screen.getByText("Beta")).toBeVisible();
  expect(screen.getAllByRole("menuitem")).toHaveLength(2);

  // --- the truth ---
  console.log(`[3b] activeElement = ${describeActive()}`);
  console.log(
    `[3b] menu.contains(activeElement) = ${String(menu.contains(document.activeElement))}`,
  );
});

test("3c: 3b keyboard nav — does ArrowDown move focus between items?", async () => {
  const user = userEvent.setup();
  render(<HandRolledTrigger />);
  await user.click(screen.getByText("Open menu"));

  await user.keyboard("{ArrowDown}");
  console.log(`[3c] after ArrowDown activeElement = ${describeActive()}`);
  await user.keyboard("{ArrowDown}");
  console.log(`[3c] after 2x ArrowDown activeElement = ${describeActive()}`);
});

/**
 * 3d — the OTHER Radix focus trap, already noted in _bakeoff/radix/ColumnMenu:
 * the trigger opens on POINTERDOWN, not click. fireEvent.click therefore never
 * opens the menu. Measure which stage catches that.
 */
test("3d: fireEvent.click on a correct Trigger — does the menu open?", () => {
  render(
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Alpha</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>,
  );

  fireEvent.click(screen.getByText("Open menu"));

  const menu = screen.queryByRole("menu");
  console.log(
    `[3d] menu after fireEvent.click = ${menu === null ? "NOT OPEN" : "open"}`,
  );
  expect(menu).toBeNull(); // documents the trap: click does not open it
});
