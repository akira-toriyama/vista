import { Dialog } from "@base-ui/react/dialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";

// MISTAKE 4: controlled `open` with no `onOpenChange`.
// Both props are optional in DialogRootProps, so tsc cannot see this.

function StuckDialog() {
  // open is hard-wired true and nothing listens for change requests
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Popup>
          <Dialog.Title>Stuck</Dialog.Title>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("4: open without onOpenChange — compiles, silent, and the dialog cannot be closed", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  const user = userEvent.setup();
  render(<StuckDialog />);

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeInTheDocument();
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();

  // press the Close button — a user's only visible escape
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeInTheDocument(); // still open

  // press Escape — the other escape
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeInTheDocument(); // still open

  warn.mockRestore();
  error.mockRestore();
});

// Control: the same component wired correctly does close, proving the above is
// a real defect and not just "jsdom can't close dialogs".
function WiredDialog() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Popup>
          <Dialog.Title>Wired</Dialog.Title>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("4-control: same tree WITH onOpenChange closes on Close", async () => {
  const user = userEvent.setup();
  render(<WiredDialog />);
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
