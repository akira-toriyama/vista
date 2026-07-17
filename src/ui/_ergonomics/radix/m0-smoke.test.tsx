/* eslint-disable testing-library/no-node-access --
   measurement probe: these tests assert on raw DOM/focus state (the point of
   the exercise) and some deliberately only RECORD behaviour via console.log
   rather than assert it, so the measured stage is not distorted. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "radix-ui";
import { expect, test } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

/**
 * Harness sanity check: a *correctly* written Radix dialog. If this is not
 * green, every "mistake" measurement below is measuring the harness instead.
 */
function CorrectDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Task detail</Dialog.Title>
          <Dialog.Description>The description</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("baseline: a correct Radix dialog has an accessible name and traps focus", async () => {
  const user = userEvent.setup();
  render(<CorrectDialog />);

  await user.click(screen.getByText("Open"));

  const dialog = screen.getByRole("dialog");
  // the name comes from Dialog.Title via aria-labelledby
  expect(dialog).toHaveAccessibleName("Task detail");
  expect(dialog).toHaveAccessibleDescription("The description");
  // focus moved into the dialog
  expect(dialog.contains(document.activeElement)).toBe(true);
});
