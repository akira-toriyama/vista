// MISTAKE 4: controlled wiring — pass `isOpen` but forget `onOpenChange`.
// RAC source (react-stately/useOverlayTriggerState -> useControlledState):
//   isOpen !== undefined => controlled; without onOpenChange the setter is a
//   no-op. The overlay can never close.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
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

describe("m4: controlled wiring", () => {
  it("4a: MISTAKE — isOpen with no onOpenChange: tsc ok, no warning, cannot close", async () => {
    const user = userEvent.setup();
    // tsc: isOpen?: boolean and onOpenChange?: (b: boolean) => void are
    // INDEPENDENT optionals — no discriminated union ties them together.
    render(
      <DialogTrigger isOpen>
        <Button>Open</Button>
        <Modal>
          <Dialog>
            <Heading slot="title">Title</Heading>
            <Button slot="close">Close</Button>
          </Dialog>
        </Modal>
      </DialogTrigger>,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    const afterClose = screen.queryByRole("dialog") !== null;
    console.log("[4a] dialog still open after clicking Close?", afterClose);

    await user.keyboard("{Escape}");
    const afterEsc = screen.queryByRole("dialog") !== null;
    console.log("[4a] dialog still open after Escape?", afterEsc);

    console.log("[4a] console.warn:", JSON.stringify(warnSpy.mock.calls));
    console.log(
      "[4a] console.error:",
      JSON.stringify(
        errSpy.mock.calls.map((c: unknown[]) => String(c[0]).slice(0, 120)),
      ),
    );

    // THE BREAKAGE: an un-closeable dialog, with zero diagnostics
    expect(afterClose).toBe(true);
    expect(afterEsc).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("4b: CONTROL — uncontrolled defaultOpen closes fine (close path works here)", async () => {
    const user = userEvent.setup();
    render(
      <DialogTrigger defaultOpen>
        <Button>Open</Button>
        <Modal>
          <Dialog>
            <Heading slot="title">Title</Heading>
            <Button slot="close">Close</Button>
          </Dialog>
        </Modal>
      </DialogTrigger>,
    );
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));
    const closed = screen.queryByRole("dialog") === null;
    console.log("[4b] dialog closed after Close click?", closed);
    expect(closed).toBe(true);
  });
});
