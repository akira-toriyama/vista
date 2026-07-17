import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

// MISTAKE 2 & 5: wrong part nesting / missing required parts.
// Each case renders a structurally-invalid tree and records what happens.

// --- 2a: Dialog.Popup with no Dialog.Portal wrapper -------------------------
function PopupWithoutPortal() {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Open</Dialog.Trigger>
      {/* Portal omitted — the mistake */}
      <Dialog.Popup>
        <Dialog.Title>Title</Dialog.Title>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

test("2a: Dialog.Popup without Portal THROWS at render", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<PopupWithoutPortal />)).toThrow(
    /<Dialog\.Portal> is missing/,
  );
  error.mockRestore();
});

// --- 2b: Menu.Popup outside Menu.Positioner --------------------------------
function PopupOutsidePositioner() {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>Menu</Menu.Trigger>
      <Menu.Portal>
        {/* Positioner omitted — the mistake */}
        <Menu.Popup>
          <Menu.Item>Item one</Menu.Item>
        </Menu.Popup>
      </Menu.Portal>
    </Menu.Root>
  );
}

test("2b: Menu.Popup outside Positioner THROWS at render", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<PopupOutsidePositioner />)).toThrow(
    /MenuPositionerContext is missing/,
  );
  error.mockRestore();
});

// --- 5a: Menu part used entirely outside Menu.Root --------------------------
test("5a: Menu.Item outside Menu.Root THROWS at render", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Menu.Item>orphan</Menu.Item>)).toThrow(
    /MenuRootContext is missing/,
  );
  error.mockRestore();
});

// --- 5b: Dialog.Trigger outside Dialog.Root --------------------------------
test("5b: Dialog.Trigger outside Dialog.Root THROWS at render", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Dialog.Trigger>orphan</Dialog.Trigger>)).toThrow(
    /<Dialog\.Trigger> must be used within <Dialog\.Root>/,
  );
  error.mockRestore();
});

// --- 5c: Trigger omitted entirely (uncontrolled dialog, no way to open) -----
function DialogWithNoTrigger() {
  return (
    <Dialog.Root>
      {/* no Trigger — the mistake. nothing can ever open this. */}
      <Dialog.Portal>
        <Dialog.Popup>
          <Dialog.Title>Unreachable</Dialog.Title>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("5c: omitting Trigger is SILENT — renders nothing, no error", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() => render(<DialogWithNoTrigger />)).not.toThrow();

  // no dialog, no trigger, no complaint: a dead component
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();

  warn.mockRestore();
  error.mockRestore();
});

// --- 3-equivalent: raw <div role="menuitem"> instead of Menu.Item ----------
// This is the Base UI analogue of the react-aria trap: the tree LOOKS right to
// a render assertion (getByRole('menuitem') finds them) but the items are not
// registered with the menu's composite focus manager.
function MenuWithRawItems() {
  return (
    <Menu.Root>
      <Menu.Trigger>Menu</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            {/* raw divs instead of <Menu.Item> — the mistake */}
            <div role="menuitem">Item one</div>
            <div role="menuitem">Item two</div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

test("3: raw role=menuitem divs — render assertions PASS, focus never enters", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  const user = userEvent.setup();
  render(<MenuWithRawItems />);
  screen.getByRole("button", { name: "Menu" }).focus();
  await user.keyboard("{ArrowDown}");

  const menu = await screen.findByRole("menu");

  // a naive test suite is fully GREEN here:
  expect(menu).toBeInTheDocument();
  expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  expect(screen.getByText("Item one")).toBeInTheDocument();
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();

  // ...but keyboard focus never reaches an ITEM. The baseline (00-baseline)
  // puts activeElement on the "Item one" menuitem; here it stops at the popup
  // container, because raw divs are never registered with the composite focus
  // manager that <Menu.Item> registers with.
  expect(document.activeElement).toBe(menu);
  expect(document.activeElement?.getAttribute("role")).not.toBe("menuitem");

  // and arrow keys cannot move focus onto an item either — it is a dead menu
  await user.keyboard("{ArrowDown}");
  expect(document.activeElement?.getAttribute("role")).not.toBe("menuitem");
  await user.keyboard("{ArrowDown}");
  expect(document.activeElement?.getAttribute("role")).not.toBe("menuitem");

  warn.mockRestore();
  error.mockRestore();
});
