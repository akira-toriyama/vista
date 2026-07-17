/**
 * t-wf4p — is Base UI's scroll-lock residue a real bug or a jsdom artifact?
 *
 * Two independent suspects were found by reading useScrollLock.ts @ v1.6.0:
 *
 *  1. SHORTHAND/LONGHAND ASYMMETRY. lockScroll() writes the shorthand
 *     `overflow: 'hidden'` but saves the longhands `overflowY`/`overflowX`;
 *     cleanup() Object.assigns the longhands back. A conformant CSSOM clears
 *     the shorthand when both longhands are cleared — jsdom's may not. If the
 *     longhands are clean and only the shorthand is dirty, this is jsdom.
 *
 *  2. MODULE-SCOPE RESTORE STATE. `let originalHtmlStyles` /
 *     `let originalBodyStyles` are module-level, shared by every lock in the
 *     app. A second lock taken while a first is active overwrites the saved
 *     "original" with the ALREADY-LOCKED values — so unwinding restores the
 *     locked state, permanently. This is engine-independent, and it is
 *     architecturally the same shape as Radix's `originalBodyPointerEvents`.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTID } from "./contract.type";
import { candidate as baseui } from "./baseui";

const readAll = () => ({
  overflow: document.body.style.overflow,
  overflowY: document.body.style.overflowY,
  overflowX: document.body.style.overflowX,
  position: document.body.style.position,
  height: document.body.style.height,
  width: document.body.style.width,
  boxSizing: document.body.style.boxSizing,
  htmlLocked: document.documentElement.hasAttribute(
    "data-base-ui-scroll-locked",
  ),
});

beforeEach(() => {
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-base-ui-scroll-locked");
});

describe("Base UI scroll lock residue", () => {
  it("suspect 1: after the menu closes, WHICH properties are dirty?", async () => {
    const user = userEvent.setup();
    render(
      <baseui.ColumnMenu
        onOpenDetail={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
    );

    await user.click(screen.getByTestId(TESTID.menuTrigger));
    await screen.findByTestId(TESTID.menu);
    const locked = readAll();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId(TESTID.menu)).toBeNull());
    // cleanup is deferred (the source notes a `setTimeout(fn, 0)`), so give
    // every pending timer and frame a chance before judging it a leak
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const after = readAll();

    console.log("LOCKED :", JSON.stringify(locked));
    console.log("AFTER  :", JSON.stringify(after));

    // The diagnosis. If longhands are clean and only the shorthand is dirty,
    // it is jsdom's CSSOM, not Base UI. If `position`/`height`/`width` — which
    // have no shorthand involvement at all — are ALSO dirty, the restore
    // genuinely did not run and this is a real leak.
    console.log(
      `DIAGNOSIS: shorthand-dirty=${after.overflow !== ""} longhand-dirty=${
        after.overflowY !== "" || after.overflowX !== ""
      } position-dirty=${after.position !== ""} height-dirty=${
        after.height !== ""
      } lockAttr-still-set=${after.htmlLocked}`,
    );
  });

  it("suspect 2: does a nested lock corrupt the saved 'original' state?", async () => {
    // Body starts with a meaningful author style. If the module-scope save is
    // clobbered by a second lock, this value never comes back.
    document.body.style.overflow = "auto";
    const pristine = document.body.style.overflow;

    const user = userEvent.setup();
    const { unmount } = render(
      <>
        <baseui.ColumnMenu
          onOpenDetail={() => {}}
          onRename={() => {}}
          onDelete={() => {}}
        />
        <baseui.SidePeek
          open
          onOpenChange={() => {}}
          task={{ id: "t-1", title: "nested" }}
        />
      </>,
    );

    // open the menu WHILE the dialog is already open -> two locks overlap
    await user.click(screen.getByTestId(TESTID.menuTrigger));
    await screen.findByTestId(TESTID.menu);
    const bothOpen = readAll();

    await user.keyboard("{Escape}");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const afterAll = readAll();

    console.log("PRISTINE :", pristine);
    console.log("BOTH OPEN:", JSON.stringify(bothOpen));
    console.log("AFTER ALL:", JSON.stringify(afterAll));
    console.log(
      `DIAGNOSIS: author's 'overflow: auto' restored? ${afterAll.overflow === "auto"}`,
    );
  });
});
