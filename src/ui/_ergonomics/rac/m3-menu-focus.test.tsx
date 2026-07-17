// MISTAKE 3: a Menu that renders but never receives focus.
// The canonical RAC trap: hand-rolling the overlay ({open && <Menu>}) instead of
// using MenuTrigger + Popover. Render assertions all pass; focus never enters.
//
// CONTROL FIRST: 3a proves the CORRECT wiring DOES move focus in jsdom, so a
// focus failure in 3b is a real signal and not a jsdom limitation.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { describe, expect, it } from "vitest";

describe("m3: menu focus", () => {
  it("3a: CONTROL — correct MenuTrigger + Popover + Menu moves focus into menu", async () => {
    const user = userEvent.setup();
    render(
      <MenuTrigger>
        <Button>Open menu</Button>
        <Popover>
          <Menu aria-label="Actions">
            <MenuItem id="a">Alpha</MenuItem>
            <MenuItem id="b">Beta</MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>,
    );

    // keyboard open: ArrowDown on the trigger should open AND focus first item
    await user.tab();
    await user.keyboard("{ArrowDown}");

    const menu = await screen.findByRole("menu");
    console.log(
      "[3a] activeElement =",
      document.activeElement?.tagName,
      JSON.stringify(document.activeElement?.textContent),
      "| menu.contains(activeElement) =",
      menu.contains(document.activeElement),
    );
    expect(menu.contains(document.activeElement)).toBe(true);
  });

  it("3b: MISTAKE — hand-rolled overlay, <Menu> without MenuTrigger/Popover", async () => {
    const user = userEvent.setup();

    function HandRolled() {
      // NOTE: this is what an agent writes when it reaches for familiar React
      // idioms instead of the library's trigger part.
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen((o) => !o)}>
            Open menu
          </button>
          {open ? (
            <div>
              <Menu aria-label="Actions">
                <MenuItem id="a">Alpha</MenuItem>
                <MenuItem id="b">Beta</MenuItem>
              </Menu>
            </div>
          ) : null}
        </div>
      );
    }

    render(<HandRolled />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // ---- the render assertions an agent would naturally write: ALL PASS ----
    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    // ---------------------------------------------------------------------

    console.log(
      "[3b] activeElement =",
      document.activeElement?.tagName,
      JSON.stringify(document.activeElement?.textContent?.slice(0, 20)),
      "| menu.contains(activeElement) =",
      menu.contains(document.activeElement),
    );

    // the truth: focus never entered the menu
    expect(menu.contains(document.activeElement)).toBe(false);
  });

  it("3c: 3b keyboard nav — does ArrowDown move between items?", async () => {
    const user = userEvent.setup();
    function HandRolled() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen((o) => !o)}>
            Open menu
          </button>
          {open ? (
            <Menu aria-label="Actions">
              <MenuItem id="a">Alpha</MenuItem>
              <MenuItem id="b">Beta</MenuItem>
            </Menu>
          ) : null}
        </div>
      );
    }
    render(<HandRolled />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");

    await user.keyboard("{ArrowDown}");
    console.log(
      "[3c] after ArrowDown activeElement =",
      document.activeElement?.tagName,
      JSON.stringify(document.activeElement?.textContent?.slice(0, 20)),
    );
  });
});
