/* eslint-disable testing-library/no-node-access, vitest/expect-expect --
   measurement probe: these tests assert on raw DOM/focus state (the point of
   the exercise) and some deliberately only RECORD behaviour via console.log
   rather than assert it, so the measured stage is not distorted. */

import { render, screen } from "@testing-library/react";
import { Dialog, DropdownMenu } from "radix-ui";
import { expect, test, vi } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

/**
 * MISTAKE 2 — get the part nesting wrong.
 *
 * Radix has two distinct classes of nesting error and they land in totally
 * different places on the severity ladder. That split is the finding.
 */

test("2a: part rendered OUTSIDE its Root — createContextScope throws", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() =>
    render(
      <Dialog.Content>
        <Dialog.Title>Orphan</Dialog.Title>
      </Dialog.Content>,
    ),
  ).toThrow();

  try {
    render(<Dialog.Content />);
  } catch (e) {
    console.log(`[2a] throw message = ${(e as Error).message}`);
  }

  errorSpy.mockRestore();
});

test("2b: DropdownMenu.Item outside DropdownMenu.Content", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  let message = "<did not throw>";
  try {
    render(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        {/* Item is NOT inside DropdownMenu.Content */}
        <DropdownMenu.Item>Rename</DropdownMenu.Item>
      </DropdownMenu.Root>,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  console.log(`[2b] result = ${message}`);

  errorSpy.mockRestore();
});

/**
 * 2c — the DANGEROUS half: Portal is OPTIONAL in Radix. Omitting it is a
 * no-op for every DOM/role assertion; the only difference is where in the tree
 * the content lands (and therefore whether an ancestor's overflow/z-index/
 * transform clips it). jsdom has no layout, so nothing can possibly catch it.
 */
test("2c: Dialog.Content WITHOUT Dialog.Portal — renders inline, all assertions pass", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(
    <div data-testid="clipping-ancestor" style={{ overflow: "hidden" }}>
      <Dialog.Root defaultOpen>
        {/* no Dialog.Portal */}
        <Dialog.Content>
          <Dialog.Title>Inline</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>
    </div>,
  );

  const dialog = screen.getByRole("dialog");
  // every assertion a reasonable test would make: green
  expect(dialog).toBeInTheDocument();
  expect(dialog).toBeVisible();
  expect(dialog).toHaveAccessibleName("Inline");

  const ancestor = screen.getByTestId("clipping-ancestor");
  const inBody = dialog.parentElement === document.body;
  console.log(`[2c] content is a direct child of <body> = ${String(inBody)}`);
  console.log(
    `[2c] content is INSIDE the overflow:hidden ancestor = ${String(ancestor.contains(dialog))}`,
  );
  console.log(`[2c] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[2c] console.warn  = ${String(warnSpy.mock.calls.length)}`);

  // the dialog is trapped inside the clipping ancestor — real-browser bug,
  // invisible to jsdom and to every role/name assertion above
  expect(ancestor.contains(dialog)).toBe(true);
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

/**
 * 2d — Dialog.Title placed OUTSIDE Dialog.Content (but inside Root). Radix
 * wires the label by ID, not by DOM containment, so this "works" — the name
 * resolves even though the title is not in the dialog subtree.
 */
test("2d: Dialog.Title outside Dialog.Content — labelled by id, not containment", () => {
  render(
    <Dialog.Root defaultOpen>
      <Dialog.Title>Outside title</Dialog.Title>
      <Dialog.Content>
        <p>body</p>
      </Dialog.Content>
    </Dialog.Root>,
  );

  const dialog = screen.getByRole("dialog");
  const name = dialog.getAttribute("aria-labelledby");
  const target = name === null ? null : document.getElementById(name);
  console.log(`[2d] accessible name resolves = ${String(target?.textContent)}`);
  console.log(
    `[2d] title is inside dialog subtree = ${String(target !== null && dialog.contains(target))}`,
  );
});
