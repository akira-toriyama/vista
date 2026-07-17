import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "radix-ui";
import { expect, test, vi } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

/**
 * MISTAKE 4 — controlled `open` with no `onOpenChange`: the classic write-only
 * controlled component. The dialog can be opened but never closed.
 *
 * In Radix both props are independently optional:
 *   interface DialogProps { open?: boolean; onOpenChange?(open: boolean): void }
 * There is no discriminated union tying them together, so nothing at the type
 * level can object.
 */
function StuckDialog() {
  return (
    // `open` hard-wired true, no onOpenChange — nothing can ever close it
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Cannot be closed</Dialog.Title>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("4a: `open` without `onOpenChange` — Escape and Close are dead", async () => {
  const user = userEvent.setup();
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(<StuckDialog />);

  // --- green assertions ---
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("button", { name: "Close" })).toBeVisible();

  // --- the UI is a roach motel ---
  await user.keyboard("{Escape}");
  const afterEscape = screen.queryByRole("dialog") !== null;
  console.log(`[4a] still open after Escape = ${String(afterEscape)}`);

  await user.click(screen.getByRole("button", { name: "Close" }));
  const afterClose = screen.queryByRole("dialog") !== null;
  console.log(
    `[4a] still open after clicking Dialog.Close = ${String(afterClose)}`,
  );

  console.log(`[4a] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[4a] console.warn  = ${String(warnSpy.mock.calls.length)}`);
  for (const c of [...errorSpy.mock.calls, ...warnSpy.mock.calls]) {
    console.log(`[4a] msg: ${String(c[0])}`);
  }

  expect(afterEscape).toBe(true);
  expect(afterClose).toBe(true);
  // React's own "controlled without onChange" warning does NOT apply here —
  // that is an <input value> heuristic, not a Radix one. Nothing warns.
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

/**
 * 4b — the subtler half: does Radix warn when a component FLIPS from
 * uncontrolled to controlled (the thing React itself warns about for inputs)?
 * This is the one place Radix DOES still speak up.
 */
function Flipper({ open }: { open?: boolean | undefined }) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content>
          <Dialog.Title>Flip</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("4b: uncontrolled -> controlled flip — Radix DOES warn here", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const { rerender } = render(<Flipper />); // uncontrolled
  rerender(<Flipper open />); // now controlled

  console.log(`[4b] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[4b] console.warn  = ${String(warnSpy.mock.calls.length)}`);
  for (const c of [...errorSpy.mock.calls, ...warnSpy.mock.calls]) {
    console.log(`[4b] msg: ${String(c[0])}`);
  }

  // contrast with 4a: the flip warns, the missing handler does not
  expect(warnSpy).toHaveBeenCalledOnce();
  expect(String(warnSpy.mock.calls[0]?.[0])).toContain(
    "changing from uncontrolled to controlled",
  );

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});
