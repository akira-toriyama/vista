import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

// Two more nesting mistakes, chosen because they are the ones most likely to
// slip past a throw: the parts are all PRESENT, just in the wrong place.

// --- Menu.Positioner without Menu.Portal -----------------------------------
test("Menu.Positioner without Portal THROWS", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() =>
    render(
      <Menu.Root defaultOpen>
        <Menu.Trigger>Menu</Menu.Trigger>
        {/* Portal omitted — the mistake */}
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>Item one</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Root>,
    ),
  ).toThrow(/<Menu\.Portal> is missing/);
  error.mockRestore();
});

// --- Dialog.Title rendered OUTSIDE Dialog.Popup ----------------------------
// Every part exists and is inside Dialog.Root, so no context throw fires.
// Does the dialog still get its accessible name from the misplaced Title?
function TitleOutsidePopup() {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        {/* Title is a sibling of Popup, not a child — the mistake */}
        <Dialog.Title>Misplaced title</Dialog.Title>
        <Dialog.Popup>
          <p>Body</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("Dialog.Title outside Popup: renders, silent — but is the name wired?", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  render(<TitleOutsidePopup />);
  const dialog = await screen.findByRole("dialog");

  // the Title text is on screen, and nothing complains
  expect(screen.getByText("Misplaced title")).toBeInTheDocument();
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();

  // MEASURED: the name survives. Base UI wires aria-labelledby through context
  // (Title registers its id with the Root store), not through DOM containment,
  // so the misplaced Title still names the dialog. This mistake self-heals —
  // it is not a defect, and is recorded here so the comparison stays honest.
  expect(dialog).toHaveAttribute("aria-labelledby");
  expect(dialog).toHaveAccessibleName("Misplaced title");

  warn.mockRestore();
  error.mockRestore();
});
