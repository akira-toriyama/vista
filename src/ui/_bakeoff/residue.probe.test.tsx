/**
 * t-wf4p — does closing an overlay restore the page?
 *
 * This is the bug class the whole migration is about: Radix's famous #3645 left
 * `pointer-events: none` on <body> after a dialog closed, and working around it
 * meant reaching in and patching the DOM by hand.
 *
 * ## Why this probe does NOT assert `body.style.overflow`
 *
 * The first version did, and reported Base UI as leaking a scroll lock. That
 * was the INSTRUMENT, not the library. Diagnosis (see git history of
 * scrolllock.probe.test.tsx):
 *
 *   locked : overflow=hidden overflowY=""    position=relative height=calc(…)
 *   after  : overflow=hidden overflowY=""    position=""       height=""
 *
 * Everything Base UI restores through longhands came back clean — only the
 * `overflow` SHORTHAND stayed dirty, while its own longhands read empty. That
 * state is self-contradictory: a conformant CSSOM serialises the shorthand from
 * the longhands, so clearing both must clear `overflow`. jsdom's cssstyle keeps
 * them as separate slots, and Base UI writes the shorthand (`overflow:'hidden'`)
 * but saves/restores the longhands (`overflowY`/`overflowX`). Real WebKit is
 * conformant, so this cannot happen there — and it was independently reproduced
 * with zero Base UI code in the ergonomics scratch.
 *
 * So the honest assertions are the ones jsdom models correctly: the longhands,
 * the non-shorthand properties, `pointer-events`, and each library's own
 * lock marker. The geometric truth is deferred to a real engine (t-fn4k).
 */
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTID } from "./contract.type";
import { candidate as baseui } from "./baseui";
import { candidate as radix } from "./radix";

const TASK = { id: "t-0001", title: "residue probe" };

/** Only properties jsdom's CSSOM represents faithfully. */
const restored = () => ({
  pointerEvents: document.body.style.pointerEvents,
  overflowY: document.body.style.overflowY,
  overflowX: document.body.style.overflowX,
  position: document.body.style.position,
  height: document.body.style.height,
  width: document.body.style.width,
  boxSizing: document.body.style.boxSizing,
  baseUiLockMarker: document.documentElement.hasAttribute(
    "data-base-ui-scroll-locked",
  ),
});

const CLEAN = {
  pointerEvents: "",
  overflowY: "",
  overflowX: "",
  position: "",
  height: "",
  width: "",
  boxSizing: "",
  baseUiLockMarker: false,
};

beforeEach(() => {
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-base-ui-scroll-locked");
});

describe.each([
  { label: "Base UI", c: baseui },
  { label: "Radix (control)", c: radix },
])("$label", ({ c }) => {
  it("menu alone: the scroll lock is released when the menu closes", async () => {
    const user = userEvent.setup();
    render(
      <c.ColumnMenu
        onOpenDetail={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    );

    await user.click(screen.getByTestId(TESTID.menuTrigger));
    await screen.findByTestId(TESTID.menu);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId(TESTID.menu)).toBeNull());
    // Base UI's ScrollLocker.release() defers through `setTimeout(fn, 0)`, so a
    // synchronous read here reports a leak that does not exist.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(restored()).toEqual(CLEAN);
  });

  it("menu -> dialog -> close: the page is handed back intact", async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <c.ColumnMenu
            onOpenDetail={() => setOpen(true)}
            onRename={() => {}}
            onDelete={() => {}}
          />
          <c.SidePeek open={open} onOpenChange={setOpen} task={TASK} />
        </>
      );
    };
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId(TESTID.menuTrigger));
    await screen.findByTestId(TESTID.menu);
    await user.click(screen.getByTestId(TESTID.menuOpenDetail));
    await screen.findByTestId(TESTID.sidePeek);

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByTestId(TESTID.sidePeek)).toBeNull(),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(restored()).toEqual(CLEAN);
  });
});
