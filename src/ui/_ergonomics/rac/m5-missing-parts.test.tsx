// MISTAKE 5: omit a required child part (no trigger element; Modal omitted).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("m5: missing required parts", () => {
  it("5a: MISTAKE — MenuTrigger with NO trigger button", () => {
    let threw: unknown = null;
    try {
      render(
        <MenuTrigger>
          <Popover>
            <Menu aria-label="Actions">
              <MenuItem id="a">Alpha</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>,
      );
    } catch (e) {
      threw = e;
    }
    console.log("[5a] threw:", threw ? String(threw).slice(0, 160) : "NO");
    console.log("[5a] warn:", JSON.stringify(warnSpy.mock.calls));
    console.log(
      "[5a] error:",
      JSON.stringify(
        errSpy.mock.calls.map((c: unknown[]) => String(c[0]).slice(0, 130)),
      ),
    );
    if (!threw) {
      console.log("[5a] buttons:", screen.queryAllByRole("button").length);
      console.log("[5a] menu present:", screen.queryByRole("menu") !== null);
    }
  });

  it("5b: MISTAKE — DialogTrigger > Dialog with Modal/Popover omitted", async () => {
    const user = userEvent.setup();
    let threw: unknown = null;
    try {
      render(
        <DialogTrigger>
          <Button>Open</Button>
          {/* no <Modal> / <Popover> wrapper: nothing gates visibility */}
          <Dialog>
            <Heading slot="title">Title</Heading>
          </Dialog>
        </DialogTrigger>,
      );
    } catch (e) {
      threw = e;
    }
    console.log("[5b] threw:", threw ? String(threw).slice(0, 160) : "NO");
    console.log("[5b] warn:", JSON.stringify(warnSpy.mock.calls));
    console.log(
      "[5b] error:",
      JSON.stringify(
        errSpy.mock.calls.map((c: unknown[]) => String(c[0]).slice(0, 130)),
      ),
    );
    if (!threw) {
      // dialog visible before ever opening?
      const before = screen.queryByRole("dialog") !== null;
      console.log("[5b] dialog present BEFORE open?", before);
      await user.click(screen.getByRole("button", { name: "Open" }));
      const after = screen.queryByRole("dialog") !== null;
      console.log("[5b] dialog present after click?", after);
      if (after) {
        const d = screen.getByRole("dialog");
        console.log(
          "[5b] focus inside dialog?",
          d.contains(document.activeElement),
          "| activeElement:",
          document.activeElement?.tagName,
        );
      }
      // the breakage: always-visible dialog, never gated by open state
      expect(before).toBe(true);
    }
  });
});
