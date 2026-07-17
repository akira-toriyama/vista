// Companion to m2: what happens when an agent writes the NATURAL assertion
// ("click the trigger, expect the menu") against each nesting mistake?
// This is what decides silent-breakage vs test-failure.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { describe, expect, it } from "vitest";

describe("m2-natural: the assertion an agent actually writes", () => {
  it("2a-natural: Popover omitted — natural assertion PASSES (green, but UI broken)", async () => {
    const user = userEvent.setup();
    render(
      <MenuTrigger>
        <Button>Open</Button>
        <Menu aria-label="Actions">
          <MenuItem id="a">Alpha</MenuItem>
        </Menu>
      </MenuTrigger>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    // this is the whole test an agent writes. It is green.
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Alpha" })).toBeVisible();
  });

  // .fails() = vitest asserts this test DOES fail. Proof the natural assertion
  // catches 2b. Verified raw (without .fails) it reports:
  //   TestingLibraryElementError: Unable to find an accessible element with the
  //   role "menu"  -> Test Files 1 failed, Tests 1 failed | 1 passed
  it.fails(
    "2b-natural: Popover outside trigger — natural assertion FAILS (loud)",
    async () => {
      const user = userEvent.setup();
      render(
        <div>
          <MenuTrigger>
            <Button>Open</Button>
          </MenuTrigger>
          <Popover>
            <Menu aria-label="Actions">
              <MenuItem id="a">Alpha</MenuItem>
            </Menu>
          </Popover>
        </div>,
      );
      await user.click(screen.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
    },
  );
});
