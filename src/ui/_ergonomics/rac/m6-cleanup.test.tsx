// MISTAKE 6: unmount while the overlay is open — does anything leak?
// RAC portals overlays to document.body, so a missed cleanup shows up as
// residual DOM nodes and/or a stuck body scroll-lock / aria-hidden.
import { render, screen } from "@testing-library/react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Menu,
  MenuItem,
  MenuTrigger,
  Modal,
  Popover,
} from "react-aria-components";
import { describe, expect, it } from "vitest";

describe("m6: cleanup on unmount while open", () => {
  it("6a: Modal open -> unmount: body residue / scroll lock / aria-hidden", async () => {
    const { unmount } = render(
      <DialogTrigger defaultOpen>
        <Button>Open</Button>
        <Modal>
          <Dialog>
            <Heading slot="title">Title</Heading>
          </Dialog>
        </Modal>
      </DialogTrigger>,
    );
    await screen.findByRole("dialog");

    const lockedStyle = document.body.getAttribute("style");
    console.log("[6a] body style WHILE open:", JSON.stringify(lockedStyle));
    console.log(
      "[6a] body children WHILE open:",
      document.body.children.length,
      "| aria-hidden nodes:",
      document.querySelectorAll("[aria-hidden='true']").length,
    );

    unmount();

    const afterStyle = document.body.getAttribute("style");
    const dialogLeft = document.querySelectorAll("[role='dialog']").length;
    const ariaHiddenLeft = document.querySelectorAll(
      "[aria-hidden='true']",
    ).length;
    console.log("[6a] body style AFTER unmount:", JSON.stringify(afterStyle));
    console.log("[6a] role=dialog nodes AFTER unmount:", dialogLeft);
    console.log("[6a] aria-hidden nodes AFTER unmount:", ariaHiddenLeft);
    console.log(
      "[6a] body.innerHTML length AFTER unmount:",
      document.body.innerHTML.length,
      "| body children:",
      document.body.children.length,
    );

    expect(dialogLeft).toBe(0);
    // scroll lock must be released, or every later view inherits a frozen body
    expect(afterStyle === null || afterStyle === "").toBe(true);
    expect(ariaHiddenLeft).toBe(0);
  });

  it("6b: Menu popover open -> unmount: residue?", async () => {
    const { unmount } = render(
      <MenuTrigger defaultOpen>
        <Button>Open</Button>
        <Popover>
          <Menu aria-label="Actions">
            <MenuItem id="a">Alpha</MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>,
    );
    await screen.findByRole("menu");
    console.log(
      "[6b] body children WHILE open:",
      document.body.children.length,
    );

    unmount();

    const menusLeft = document.querySelectorAll("[role='menu']").length;
    console.log("[6b] role=menu nodes AFTER unmount:", menusLeft);
    console.log(
      "[6b] body style AFTER unmount:",
      JSON.stringify(document.body.getAttribute("style")),
      "| body children:",
      document.body.children.length,
    );
    expect(menusLeft).toBe(0);
  });
});
