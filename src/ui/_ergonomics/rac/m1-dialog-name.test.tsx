// MISTAKE 1: Dialog without an accessible name (no <Heading slot="title">, no aria-label).
// Measures: type error? dev warning? or silently broken a11y?
import { render, screen } from "@testing-library/react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
} from "react-aria-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let warnSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

describe("m1: dialog accessible name", () => {
  it("1a: STANDALONE Dialog, no title, no aria-label", () => {
    // tsc: does this compile? (children are optional, aria-label optional)
    render(<Dialog>body text</Dialog>);

    const dialog = screen.getByRole("dialog");
    // record the actual accessible-name inputs
    console.log(
      "[1a] aria-label=",
      dialog.getAttribute("aria-label"),
      "aria-labelledby=",
      dialog.getAttribute("aria-labelledby"),
    );
    console.log(
      "[1a] console.warn calls:",
      JSON.stringify(warnSpy.mock.calls, null, 0),
    );
    // is it actually unnamed? (the "broken" part)
    expect(dialog.getAttribute("aria-label")).toBeNull();
    expect(dialog.getAttribute("aria-labelledby")).toBeNull();
    // did it warn? (the "loud" part)
    expect(warnSpy).toHaveBeenCalled();
  });

  it("1b: Dialog inside DialogTrigger, no title -> auto-labelled by trigger?", async () => {
    render(
      <DialogTrigger defaultOpen>
        <Button>Open</Button>
        <Modal>
          <Dialog>body text</Dialog>
        </Modal>
      </DialogTrigger>,
    );

    const dialog = await screen.findByRole("dialog");
    const labelledby = dialog.getAttribute("aria-labelledby");
    console.log(
      "[1b] aria-label=",
      dialog.getAttribute("aria-label"),
      "aria-labelledby=",
      labelledby,
    );
    console.log(
      "[1b] resolved name target text =",
      labelledby ? document.getElementById(labelledby)?.textContent : "(none)",
    );
    console.log(
      "[1b] console.warn calls:",
      JSON.stringify(warnSpy.mock.calls, null, 0),
    );
  });

  it("1c: correct version (Heading slot=title) for comparison", async () => {
    render(
      <DialogTrigger defaultOpen>
        <Button>Open</Button>
        <Modal>
          <Dialog>
            <Heading slot="title">Real Title</Heading>
            body
          </Dialog>
        </Modal>
      </DialogTrigger>,
    );
    const dialog = await screen.findByRole("dialog");
    const labelledby = dialog.getAttribute("aria-labelledby");
    console.log(
      "[1c] aria-labelledby target text =",
      labelledby ? document.getElementById(labelledby)?.textContent : "(none)",
    );
    console.log("[1c] warn calls:", warnSpy.mock.calls.length);
  });
});
