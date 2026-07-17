// MISTAKE 2: wrong part nesting.
// RAC has no Positioner/Portal parts (Popover portals itself), so the equivalent
// mistakes are: Menu without its Popover wrapper, and Popover placed outside its
// trigger (no trigger context -> no triggerRef).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

let warnSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  errSpy.mockRestore();
});

describe("m2: part nesting", () => {
  it("2a: MISTAKE — Menu directly under MenuTrigger, Popover omitted", async () => {
    const user = userEvent.setup();
    let threw: unknown = null;
    try {
      render(
        <MenuTrigger>
          <Button>Open</Button>
          {/* Popover omitted — tsc? throw? silent? */}
          <Menu aria-label="Actions">
            <MenuItem id="a">Alpha</MenuItem>
          </Menu>
        </MenuTrigger>,
      );
    } catch (e) {
      threw = e;
    }
    console.log("[2a] render threw:", threw ? String(threw) : "NO");
    console.log("[2a] warn:", JSON.stringify(warnSpy.mock.calls));
    console.log(
      "[2a] error:",
      JSON.stringify(
        errSpy.mock.calls.map((c: unknown[]) => String(c[0]).slice(0, 120)),
      ),
    );

    if (!threw) {
      // is the menu visible BEFORE opening? (Popover is what gates visibility)
      const menuBefore = screen.queryByRole("menu");
      console.log("[2a] menu present before open?", menuBefore !== null);

      await user.click(screen.getByRole("button", { name: "Open" }));
      const menuAfter = screen.queryByRole("menu");
      console.log("[2a] menu present after click?", menuAfter !== null);
      if (menuAfter) {
        console.log(
          "[2a] focus inside menu after click?",
          menuAfter.contains(document.activeElement),
          "| activeElement:",
          document.activeElement?.tagName,
        );
      }
    }
  });

  it("2b: MISTAKE — Popover+Menu rendered OUTSIDE the MenuTrigger", async () => {
    const user = userEvent.setup();
    let threw: unknown = null;
    try {
      render(
        <div>
          <MenuTrigger>
            <Button>Open</Button>
          </MenuTrigger>
          {/* Popover outside its trigger: no trigger context, no triggerRef */}
          <Popover>
            <Menu aria-label="Actions">
              <MenuItem id="a">Alpha</MenuItem>
            </Menu>
          </Popover>
        </div>,
      );
    } catch (e) {
      threw = e;
    }
    console.log(
      "[2b] render threw:",
      threw ? String(threw).slice(0, 200) : "NO",
    );
    console.log("[2b] warn:", JSON.stringify(warnSpy.mock.calls));
    console.log(
      "[2b] error:",
      JSON.stringify(
        errSpy.mock.calls.map((c: unknown[]) => String(c[0]).slice(0, 150)),
      ),
    );
    if (!threw) {
      console.log("[2b] menu present?", screen.queryByRole("menu") !== null);
      const btn = screen.queryByRole("button", { name: "Open" });
      if (btn) {
        let clickThrew: unknown = null;
        try {
          await user.click(btn);
        } catch (e) {
          clickThrew = e;
        }
        console.log(
          "[2b] click threw:",
          clickThrew ? String(clickThrew).slice(0, 200) : "NO",
        );
        console.log(
          "[2b] menu present after click?",
          screen.queryByRole("menu") !== null,
        );
      }
    }
  });
});
