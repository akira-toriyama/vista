/**
 * t-wf4p — where does focus actually go when a Base UI menu is opened by
 * pointer?
 *
 * The ergonomics scratch asserts "pointer open leaves focus on the trigger (by
 * design, APG)" and that assertion passes in isolation but FAILS in the full
 * suite. That smells like a race, not a design: Base UI's focus choreography
 * runs through rAF, so under load the frame lands before the assertion and
 * focus is already inside the popup.
 *
 * This matters beyond the flake — the belief was about to become a repo rule
 * ("assert menu focus only after {ArrowDown}"). A rule derived from a race
 * would be wrong.
 */
import { expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTID } from "./contract.type";
import { candidate as baseui } from "./baseui";

const where = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return "body";
  return `${el.tagName.toLowerCase()}[${el.getAttribute("data-testid") ?? el.getAttribute("aria-label") ?? el.className.slice(0, 20)}]`;
};

it("pointer-open: focus immediately after click vs after frames settle", async () => {
  const user = userEvent.setup();
  render(
    <baseui.ColumnMenu
      onOpenDetail={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
    />,
  );

  await user.click(screen.getByTestId(TESTID.menuTrigger));
  await screen.findByTestId(TESTID.menu);
  const immediately = where();

  // let every pending rAF/timeout run
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
  const settled = where();

  console.log(`immediately=${immediately} settled=${settled}`);
  expect({ immediately, settled }).toBeTruthy();
});
