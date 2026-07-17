// MISTAKE 7 runtime half: `onClick` on MenuItem type-checks (the library's
// Omit<GlobalDOMAttributes,'onClick'> is defeated — see m7-probe.test-d.ts).
// So: does the handler actually fire, or is it silently dropped?
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { describe, expect, it, vi } from "vitest";

describe("m7: onClick vs onAction on MenuItem", () => {
  it("7a: MISTAKE — onClick handler: does it fire?", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MenuTrigger defaultOpen>
        <Button>Open</Button>
        <Popover>
          <Menu aria-label="Actions">
            <MenuItem id="a" onClick={onClick}>
              Alpha
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>,
    );
    await user.click(await screen.findByRole("menuitem", { name: "Alpha" }));
    console.log("[7a] onClick calls:", onClick.mock.calls.length);
    expect(onClick).toHaveBeenCalled();
  });

  it("7c: MISTAKE — onClick via KEYBOARD (Enter): does it fire?", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MenuTrigger defaultOpen>
        <Button>Open</Button>
        <Popover>
          <Menu aria-label="Actions">
            <MenuItem id="a" onClick={onClick}>
              Alpha
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>,
    );
    await screen.findByRole("menu");
    // focus lands on the first item; activate it the keyboard way
    await user.keyboard("{ArrowDown}");
    console.log(
      "[7c] activeElement before Enter:",
      JSON.stringify(document.activeElement?.textContent),
    );
    await user.keyboard("{Enter}");
    console.log("[7c] onClick calls after Enter:", onClick.mock.calls.length);
    expect(onClick.mock.calls.length).toBeGreaterThan(0);
  });

  it("7d: CONTROL — onAction via KEYBOARD (Enter) fires", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <MenuTrigger defaultOpen>
        <Button>Open</Button>
        <Popover>
          <Menu aria-label="Actions">
            <MenuItem id="a" onAction={onAction}>
              Alpha
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>,
    );
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    console.log("[7d] onAction calls after Enter:", onAction.mock.calls.length);
    expect(onAction.mock.calls.length).toBeGreaterThan(0);
  });

  it("7b: CONTROL — onAction handler fires", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <MenuTrigger defaultOpen>
        <Button>Open</Button>
        <Popover>
          <Menu aria-label="Actions">
            <MenuItem id="a" onAction={onAction}>
              Alpha
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>,
    );
    await user.click(await screen.findByRole("menuitem", { name: "Alpha" }));
    console.log("[7b] onAction calls:", onAction.mock.calls.length);
    expect(onAction).toHaveBeenCalled();
  });
});
