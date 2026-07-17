import { Dialog } from "@base-ui/react/dialog";
import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";

// MISTAKE 6: unmount while the dialog is still open — does anything leak?
//
// VERDICT (measured, see 06-cleanup-probe + 07-jsdom-shorthand-probe):
// Base UI cleans up correctly. Two things had to be ruled out first:
//   1. The scroll-lock restore is deferred one macrotask — ScrollLocker.release()
//      schedules unlock via setTimeout(fn, 0). A synchronous post-unmount
//      assertion fails; that is a bad test, not a leak.
//   2. jsdom leaves `overflow: hidden` behind because cssstyle does not link the
//      `overflow` shorthand (which Base UI writes) to the overflowX/overflowY
//      longhands (which Base UI restores). 07-jsdom-shorthand-probe reproduces
//      this with zero Base UI code. Real CSSOM clears it. Artifact, not a leak.

function OpenDialog() {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Title>Leak check</Dialog.Title>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("6: portalled DOM is removed synchronously on unmount-while-open", async () => {
  const { unmount } = render(<OpenDialog />);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(document.querySelector("[data-base-ui-portal]")).not.toBeNull();

  unmount();

  // no residue in the portal container, checked synchronously
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.textContent).not.toContain("Leak check");
  expect(document.querySelector("[data-base-ui-portal]")).toBeNull();
});

test("6b: scroll lock is released after unmount (deferred one macrotask)", async () => {
  const { unmount } = render(<OpenDialog />);
  await screen.findByRole("dialog");

  // lock is on: <html> carries the marker attribute while open
  expect(document.documentElement).toHaveAttribute(
    "data-base-ui-scroll-locked",
  );
  expect(document.body.style.position).toBe("relative");

  unmount();

  // still locked at this instant — the release is a setTimeout(0) behind us.
  // This is the trap: a naive sync assert here reports a leak that isn't one.
  expect(document.documentElement).toHaveAttribute(
    "data-base-ui-scroll-locked",
  );

  // ...and it does get released.
  await waitFor(() => {
    expect(document.documentElement).not.toHaveAttribute(
      "data-base-ui-scroll-locked",
    );
  });
  expect(document.body.style.position).toBe("");
  expect(document.body.style.height).toBe("");
  expect(document.body.style.width).toBe("");
});
