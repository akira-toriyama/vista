/* eslint-disable testing-library/no-node-access --
   the whole point of this file is to inspect the raw a11y wiring (aria-labelledby
   and whether its target exists), which RTL queries deliberately abstract away. */

import { render, screen } from "@testing-library/react";
import { Dialog } from "radix-ui";
import { expect, test, vi } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

//
// MISTAKE 1 — Dialog with no accessible name: no <Dialog.Title>, no aria-label.
//
// RADIX HISTORY MATTERS HERE. Radix used to ship a dev-only `TitleWarning` that
// console.error'd "`DialogContent` requires a `DialogTitle`...". In
// @radix-ui/react-dialog@1.1.19 (what radix-ui@1.6.2 depends on) that warning is
// GONE from the source. `WarningProvider` survives only as a no-op, tagged in
// Radix's own source as deprecated "to avoid breaking changes"
// (packages/react/dialog/src/dialog.tsx:520-530):
//
//     export const WarningProvider = (props) => props.children;
//
// Verified not a prod-build artifact: zero `console.` and zero `NODE_ENV` guards
// in BOTH shipped builds (dist/index.mjs, dist/index.js) AND zero `console.` in
// the v1.1.19 source. The loudest a11y guardrail Radix was known for is gone.
//
function NamelessDialog() {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <Dialog.Content>
          {/* no Dialog.Title, no aria-label */}
          <p>Some body copy that is not a title</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("1a: nameless dialog — measure console + accessible name", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(<NamelessDialog />);

  const dialog = screen.getByRole("dialog");

  // --- what a plausible Claude-written test would assert (all green) ---
  expect(dialog).toBeInTheDocument();
  expect(screen.getByText("Some body copy that is not a title")).toBeVisible();

  // --- what is ACTUALLY true about the a11y tree ---
  const labelledBy = dialog.getAttribute("aria-labelledby");
  const describedBy = dialog.getAttribute("aria-describedby");
  console.log(`[1a] aria-labelledby = ${labelledBy}`);
  console.log(`[1a] aria-describedby = ${describedBy}`);
  console.log(
    `[1a] labelledby target exists = ${String(labelledBy !== null && document.getElementById(labelledBy) !== null)}`,
  );
  console.log(
    `[1a] console.error calls = ${String(errorSpy.mock.calls.length)}`,
  );
  console.log(
    `[1a] console.warn calls  = ${String(warnSpy.mock.calls.length)}`,
  );
  for (const call of errorSpy.mock.calls)
    console.log(`[1a] error: ${String(call[0])}`);
  for (const call of warnSpy.mock.calls)
    console.log(`[1a] warn: ${String(call[0])}`);

  // Radix ALWAYS emits aria-labelledby={titleId} even with no Title rendered,
  // so the attribute is a DANGLING reference — worse than absent.
  expect(labelledBy).not.toBeNull();
  expect(document.getElementById(labelledBy!)).toBeNull();
  expect(dialog).toHaveAccessibleName(""); // screen reader announces nothing

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

test("1b: does ANY console output mention title/description?", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(<NamelessDialog />);

  const all = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
    .map((c) => String(c[0]))
    .join("\n");
  console.log(`[1b] total console output length = ${String(all.length)}`);
  console.log(`[1b] mentions "Title" = ${String(/title/i.test(all))}`);
  console.log(
    `[1b] mentions "Description" = ${String(/description/i.test(all))}`,
  );

  expect(all).toBe(""); // no diagnostic whatsoever

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});
