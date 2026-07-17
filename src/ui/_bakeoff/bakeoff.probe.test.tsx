/**
 * t-wf4p bake-off — the neutral suite.
 *
 * One `describe.each` over all candidates, driving byte-identical steps. This
 * file must never import a library directly: everything goes through
 * `contract.type.ts` + `TESTID`. It emits a JSON report rather than asserting
 * a winner — the point is to MEASURE, and let the ledger judge.
 *
 * Run: pnpm vitest run --project unit src/ui/_bakeoff --coverage=false
 * Report: src/ui/_bakeoff/report.json
 */
import { StrictMode, useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  render,
  screen,
  cleanup,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTID, type BakeoffCandidate } from "./contract.type";
import {
  readBodyState,
  isBodyClean,
  isScrollLocked,
  isBackgroundDead,
  readBackgroundShielding,
  describeFocus,
  emptyReport,
  type CandidateReport,
} from "./probe";

import { candidate as baseui } from "./baseui";
import { candidate as rac } from "./rac";
import { candidate as radix } from "./radix";

const CANDIDATES: BakeoffCandidate[] = [baseui, rac, radix];
const reports: CandidateReport[] = [];

/**
 * Module scope on purpose: the React Compiler hoists components out of the
 * enclosing test callback, so a Harness defined inside `it` cannot close over
 * an `it`-local binding (it throws "x is not defined" at event time).
 */
const selectedIds: string[] = [];
let presenterRenders = 0;

const TASK = { id: "t-0001", title: "側面ピークの検証タスク" };
const TASKS = [
  TASK,
  { id: "t-0002", title: "たすくを さがす" },
  { id: "t-0003", title: "another task" },
];

/**
 * The Enter a browser delivers when it commits an IME composition.
 *
 * Fairness matters here more than anywhere else in this suite: the libraries
 * detect composition by DIFFERENT signals — Base UI reads the legacy
 * `which === 229` (combobox/input/ComboboxInput.tsx:429), React Aria reads
 * `nativeEvent.isComposing` (useAutocomplete.ts:327). An event carrying only
 * one signal doesn't measure IME safety, it measures which library happens to
 * read the signal the test author picked. A real browser sets BOTH, so this
 * does too — and asserts it, because `keyCode` is not settable via
 * KeyboardEventInit in every engine and would fail silently.
 */
const makeCompositionEnter = (): KeyboardEvent => {
  const e = new KeyboardEvent("keydown", {
    key: "Enter",
    isComposing: true,
    bubbles: true,
    cancelable: true,
  });
  // `which`/`keyCode` are readonly getters; jsdom ignores them in the init dict
  Object.defineProperty(e, "which", { get: () => 229 });
  Object.defineProperty(e, "keyCode", { get: () => 229 });
  if (e.which !== 229 || !e.isComposing) {
    throw new Error(
      `IME probe is not measuring what it claims: which=${e.which} isComposing=${e.isComposing}`,
    );
  }
  return e;
};

/** A board-like background, so shielding of the outside tree is observable. */
const Outside = () => (
  <div data-testid="bakeoff-outside">
    <button type="button">background button</button>
    <p>board content behind the overlay</p>
  </div>
);

/**
 * jsdom keeps ONE document for the whole file, and `cleanup()` only unmounts
 * React trees — it does not undo inline styles a library leaked onto
 * <body>/<html>. Without this reset, one candidate's residue is read as the
 * next candidate's behaviour: Base UI's menu leaked `overflow: hidden`, and
 * React Aria was then scored as scroll-locking when it had not run yet.
 *
 * Leak detection is the *measurement* (see the cycles test), so it must be
 * observed inside a test and then wiped — never allowed to cross a boundary.
 */
beforeEach(() => {
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  for (const el of document.querySelectorAll("[aria-hidden], [inert]")) {
    el.removeAttribute("aria-hidden");
    el.removeAttribute("inert");
  }
});

describe.each(CANDIDATES)("$meta.label", (c) => {
  const report = emptyReport(c.meta.label, c.meta.pkg, c.meta.version);
  reports.push(report);

  it("renders in jsdom at all", () => {
    try {
      const Harness = () => {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Outside />
            <c.SidePeek open={open} onOpenChange={setOpen} task={TASK} />
          </>
        );
      };
      render(<Harness />);
      report.jsdomWorks = true;
    } catch (e) {
      report.jsdomWorks = false;
      report.jsdomError = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      cleanup();
    }
  });

  it("side-peek: partial modality — focus trapped, page NOT scroll-locked", async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Outside />
          <button
            type="button"
            data-testid="bakeoff-opener"
            onClick={() => setOpen(true)}
          >
            open
          </button>
          <c.SidePeek open={open} onOpenChange={setOpen} task={TASK} />
        </>
      );
    };
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId("bakeoff-opener"));
    const peek = await screen.findByTestId(TESTID.sidePeek);

    const body = readBodyState();
    report.sidePeek.bodyWhileOpen = body;
    report.sidePeek.scrollLocked = isScrollLocked(body);
    report.sidePeek.backgroundDead = isBackgroundDead(body);
    report.sidePeek.shielding = readBackgroundShielding(
      screen.getByTestId("bakeoff-outside"),
    );
    report.sidePeek.focusWhileOpen = describeFocus(peek);

    const focusTrapped = peek.contains(document.activeElement);
    report.sidePeek.focusTrapped = focusTrapped;

    // The decisive decomposition. Both doors to "board unusable" must be shut:
    // a scroll lock (overflow/padding) AND a pointer-dead body. Checking only
    // the first scores a false PASS — see probe.ts:isBackgroundDead.
    report.sidePeek.partialModalityAchieved =
      focusTrapped &&
      !report.sidePeek.scrollLocked &&
      !report.sidePeek.backgroundDead;

    await user.keyboard("{Escape}");
    report.sidePeek.bodyAfterClose = readBodyState();
    report.sidePeek.focusAfterClose = describeFocus(null);
    cleanup();
  });

  it("survives 20 open/close cycles without leaving residue on body", async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Outside />
          <button
            type="button"
            data-testid="bakeoff-opener"
            onClick={() => setOpen((o) => !o)}
          >
            toggle
          </button>
          <c.SidePeek open={open} onOpenChange={setOpen} task={TASK} />
        </>
      );
    };
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByTestId("bakeoff-opener");

    // Open by clicking (background is alive while closed), close by Escape.
    // Closing via the outside toggle would be unfair: a library that makes the
    // background pointer-dead while open — which Radix legitimately does —
    // would fail here for a reason this test isn't about. That property is
    // measured once, deliberately, in `sidePeek.backgroundDead`.
    for (let i = 0; i < 20; i++) {
      await user.click(toggle);
      await screen.findByTestId(TESTID.sidePeek);
      await user.keyboard("{Escape}");
      // not waitForElementToBeRemoved: some candidates close synchronously, and
      // it throws when the element is already gone before the first poll.
      await waitFor(() =>
        expect(screen.queryByTestId(TESTID.sidePeek)).toBeNull(),
      );
    }
    await act(async () => {});

    const residue = readBodyState();
    report.cycles = {
      count: 20,
      bodyCleanAfterAll: isBodyClean(residue),
      residue,
    };
    cleanup();
  });

  it("menu -> dialog chain does not freeze the UI", async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Outside />
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
    try {
      render(<Harness />);
      await user.click(screen.getByTestId(TESTID.menuTrigger));
      await screen.findByTestId(TESTID.menu);
      await user.click(screen.getByTestId(TESTID.menuOpenDetail));
      await screen.findByTestId(TESTID.sidePeek);
      await user.keyboard("{Escape}");
      await act(async () => {});

      report.menuToDialog = {
        chainWorks: true,
        bodyAfterBothClosed: readBodyState(),
        error: null,
      };
    } catch (e) {
      report.menuToDialog = {
        chainWorks: false,
        bodyAfterBothClosed: readBodyState(),
        error: e instanceof Error ? e.message : String(e),
      };
    } finally {
      cleanup();
    }
  });

  it("palette: Enter during IME composition must not commit", async () => {
    selectedIds.length = 0;
    const Harness = () => (
      <c.Palette
        open
        onOpenChange={() => {}}
        tasks={TASKS}
        onSelect={(id) => selectedIds.push(id)}
      />
    );
    const user = userEvent.setup();
    try {
      render(<Harness />);
      const input = await screen.findByTestId(TESTID.paletteInput);
      input.focus();

      // simulate a Japanese IME: composing "たすく", Enter commits the
      // *composition*, not the palette selection.
      await act(async () => {
        input.dispatchEvent(
          new CompositionEvent("compositionstart", { bubbles: true }),
        );
      });
      await user.type(input, "たすく");
      await act(async () => {
        input.dispatchEvent(makeCompositionEnter());
      });

      report.ime = { prematureCommit: selectedIds.length > 0, error: null };
    } catch (e) {
      report.ime = {
        prematureCommit: null,
        error: e instanceof Error ? e.message : String(e),
      };
    } finally {
      cleanup();
    }
  });

  it("compiler: presenter does not re-render on unrelated parent update", async () => {
    presenterRenders = 0;
    const Counting = (p: {
      open: boolean;
      onOpenChange: (o: boolean) => void;
    }) => {
      presenterRenders++;
      return <c.SidePeek {...p} task={TASK} />;
    };
    const Harness = () => {
      const [, setTick] = useState(0);
      const [open, setOpen] = useState(true);
      return (
        <>
          <button
            type="button"
            data-testid="bakeoff-tick"
            onClick={() => setTick((t) => t + 1)}
          >
            tick
          </button>
          <Counting open={open} onOpenChange={setOpen} />
        </>
      );
    };
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await screen.findByTestId(TESTID.sidePeek);
    presenterRenders = 0;
    // fireEvent, not user-event: the tick button sits in the background, and
    // user-event refuses to click through `pointer-events: none` — which Radix
    // legitimately sets. fireEvent dispatches regardless, so this measures
    // memoisation rather than re-measuring modality.
    const tick = screen.getByTestId("bakeoff-tick");
    await act(async () => {
      fireEvent.click(tick);
    });
    await act(async () => {
      fireEvent.click(tick);
    });

    report.compiler.presenterRendersOnUnrelatedUpdate = presenterRenders;
    cleanup();
    expect(presenterRenders).toBeGreaterThanOrEqual(0);
  });
});

/**
 * Written to disk, not logged: vitest's console interception did not surface
 * this block through the default reporter (neither from `afterAll` nor from a
 * test body), and a measurement you cannot read is not a measurement. Declared
 * last so it runs last.
 *
 * The import is untyped here because `src`'s tsconfig carries no node types —
 * this file is the one place in `src` that legitimately touches the fs, and it
 * dies with the branch.
 */
it("writes the bake-off report", async () => {
  // @ts-expect-error node types are absent from src's tsconfig; vitest is node
  const { writeFileSync } = await import("node:fs");
  // a plain path, not `new URL(..., import.meta.url)`: under vite import.meta
  // .url is an http:// URL and node:fs rejects it ("URL must be of scheme file")
  writeFileSync(
    "src/ui/_bakeoff/report.json",
    JSON.stringify(reports, null, 2) + "\n",
  );
  expect(reports).toHaveLength(CANDIDATES.length);
});
