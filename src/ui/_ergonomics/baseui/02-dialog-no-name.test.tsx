import { Dialog } from "@base-ui/react/dialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

// MISTAKE 1: Dialog with no accessible name (no Title, no aria-label).
// tsc: does it compile? vitest: does anything complain? a11y: is it broken?

function NamelessDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup>
          {/* no Dialog.Title, no aria-label — the mistake */}
          <p>Body text with no title.</p>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("nameless dialog: renders fine, console stays silent, a11y name is empty", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  const user = userEvent.setup();
  render(<NamelessDialog />);
  await user.click(screen.getByRole("button", { name: "Open" }));

  const dialog = await screen.findByRole("dialog");

  // it renders — a naive "does the dialog show up" test is GREEN
  expect(dialog).toBeInTheDocument();
  expect(screen.getByText("Body text with no title.")).toBeInTheDocument();

  // no dev warning of any kind
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();

  // ...but the dialog has NO accessible name. Screen readers announce nothing.
  expect(dialog).toHaveAccessibleName("");
  expect(dialog.getAttribute("aria-labelledby")).toBeNull();

  warn.mockRestore();
  error.mockRestore();
});
