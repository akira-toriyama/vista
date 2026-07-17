/* eslint-disable testing-library/no-node-access, vitest/expect-expect --
   measurement probe: these tests assert on raw DOM/focus state (the point of
   the exercise) and some deliberately only RECORD behaviour via console.log
   rather than assert it, so the measured stage is not distorted. */

import { render, screen } from "@testing-library/react";
import { Dialog } from "radix-ui";
import { expect, test, vi } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

/**
 * MISTAKE 6 — unmount the tree while a modal dialog is still open (route
 * change, parent conditional flips, error boundary swaps the subtree).
 *
 * Radix modal mode mutates GLOBAL state: RemoveScroll locks body scroll and
 * DismissableLayer sets document.body.style.pointerEvents = 'none'. If either
 * survives unmount, the whole app becomes inert with no dialog on screen —
 * the single most user-visible failure possible, and DOM assertions about the
 * dialog itself all pass because the dialog is correctly gone.
 */

const bodyState = () => ({
  pointerEvents: document.body.style.pointerEvents,
  overflow: document.body.style.overflow,
  portals: document.querySelectorAll("[data-radix-portal]").length,
  dialogs: document.querySelectorAll("[role='dialog']").length,
  bodyChildren: document.body.children.length,
});

function Modal() {
  return (
    <Dialog.Root defaultOpen modal>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Open at unmount</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("6a: unmount while modal dialog is OPEN — is global body state restored?", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  console.log(`[6a] before mount: ${JSON.stringify(bodyState())}`);

  const view = render(<Modal />);
  expect(screen.getByRole("dialog")).toBeVisible();
  console.log(`[6a] while open:   ${JSON.stringify(bodyState())}`);

  view.unmount();
  const after = bodyState();
  console.log(`[6a] after unmount:${JSON.stringify(after)}`);
  console.log(`[6a] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[6a] console.warn  = ${String(warnSpy.mock.calls.length)}`);

  // the assertion a Claude-written cleanup test would make — passes either way
  expect(screen.queryByRole("dialog")).toBeNull();

  // the assertion that actually matters
  console.log(
    `[6a] VERDICT body inert after unmount = ${String(after.pointerEvents === "none")}`,
  );

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

test("6b: same, but dialog is closed FIRST then unmounted (the happy path)", () => {
  const view = render(<Modal />);
  view.rerender(
    <Dialog.Root open={false} modal>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Open at unmount</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  );
  console.log(`[6b] after close:  ${JSON.stringify(bodyState())}`);
  view.unmount();
  console.log(`[6b] after unmount:${JSON.stringify(bodyState())}`);
});

/**
 * 6c — the realistic shape: a parent conditionally renders the dialog and flips
 * the condition while open (route change). Same global-state question, but via
 * a parent rerender rather than an explicit unmount().
 */
test("6c: parent drops the dialog subtree while open (route-change shape)", () => {
  function Parent({ show }: { show: boolean }) {
    return <div>{show ? <Modal /> : <p>other route</p>}</div>;
  }

  const view = render(<Parent show />);
  expect(screen.getByRole("dialog")).toBeVisible();
  console.log(`[6c] while open:   ${JSON.stringify(bodyState())}`);

  view.rerender(<Parent show={false} />);
  const after = bodyState();
  console.log(`[6c] after route change: ${JSON.stringify(after)}`);
  expect(screen.getByText("other route")).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
  console.log(
    `[6c] VERDICT body inert on new route = ${String(after.pointerEvents === "none")}`,
  );
});
