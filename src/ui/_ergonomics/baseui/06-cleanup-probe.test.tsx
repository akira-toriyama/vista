import { Dialog } from "@base-ui/react/dialog";
import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";

// Probe for MISTAKE 6. The first cut of 05-cleanup asserted body style was
// restored SYNCHRONOUSLY on unmount, and failed. Before calling that a leak,
// find out whether it is merely deferred: ScrollLocker.release() schedules
// unlock via setTimeout(fn, 0) (see @base-ui/utils/useScrollLock.js), so the
// restore is a macrotask behind unmount. Distinguish "leaks" from "deferred".

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

const bodyStyle = () => document.body.getAttribute("style") ?? "";

test("probe: is body scroll-lock restored sync, async, or never?", async () => {
  const before = bodyStyle();

  const { unmount } = render(<OpenDialog />);
  await screen.findByRole("dialog");
  const whileOpen = bodyStyle();

  unmount();
  const immediatelyAfterUnmount = bodyStyle();

  // let the setTimeout(0) macrotask run
  await new Promise((r) => setTimeout(r, 0));
  const afterOneMacrotask = bodyStyle();

  console.log(
    "\n[cleanup probe]\n" +
      JSON.stringify(
        { before, whileOpen, immediatelyAfterUnmount, afterOneMacrotask },
        null,
        2,
      ),
  );

  // portal DOM itself: gone synchronously?
  expect(document.body.textContent).not.toContain("Leak check");
});

test("verdict: body style IS restored, just one macrotask after unmount", async () => {
  const before = bodyStyle();

  const { unmount } = render(<OpenDialog />);
  await screen.findByRole("dialog");
  expect(bodyStyle()).not.toBe(before); // lock applied

  unmount();

  // this is the honest assertion: restored, but not synchronously
  await waitFor(() => expect(bodyStyle()).toBe(before));
});
