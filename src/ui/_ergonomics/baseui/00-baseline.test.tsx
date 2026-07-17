import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

// Baseline: the CORRECT way, per Base UI docs. Establishes that the harness
// works and that a correct dialog/menu really does what we later assert is
// broken in the mistake files.

function CorrectDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Title>Correct title</Dialog.Title>
          <Dialog.Description>Correct description</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("baseline dialog: has accessible name from Title", async () => {
  const user = userEvent.setup();
  render(<CorrectDialog />);
  await user.click(screen.getByRole("button", { name: "Open" }));

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveAccessibleName("Correct title");
});

function CorrectMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger>Menu</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>Item one</Menu.Item>
            <Menu.Item>Item two</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// Established by 01-focus-probe.test.tsx: Base UI moves focus into the menu on
// KEYBOARD open, and deliberately leaves it on the trigger for pointer open.
// Both are correct (APG). The baseline pins both so the mistake files below
// are measured against real behaviour, not my assumption about it.

test("baseline menu: pointer open leaves focus on the trigger (by design)", async () => {
  const user = userEvent.setup();
  render(<CorrectMenu />);
  const trigger = screen.getByRole("button", { name: "Menu" });
  await user.click(trigger);

  await screen.findByRole("menu");
  expect(document.activeElement).toBe(trigger);
});

test("baseline menu: keyboard open moves focus to the first item", async () => {
  const user = userEvent.setup();
  render(<CorrectMenu />);
  screen.getByRole("button", { name: "Menu" }).focus();
  await user.keyboard("{ArrowDown}");

  const menu = await screen.findByRole("menu");
  expect(menu.contains(document.activeElement)).toBe(true);
  expect(document.activeElement).toHaveTextContent("Item one");
});
