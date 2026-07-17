/**
 * t-wf4p bake-off — measurement instrument.
 *
 * Neutral by construction: it knows only `contract.type.ts`, never a library's
 * internals. Every candidate is driven through byte-identical steps, so a
 * difference in the report is a difference in the library.
 *
 * jsdom can observe: activeElement, body inline styles, aria-hidden/inert
 * attributes, composition events, render counts. It CANNOT observe: geometric
 * occlusion, real focus semantics of `inert`, or floating-ui positioning —
 * those are deferred to the real WKWebView pass and to Browser Mode (t-fn4k).
 */

/**
 * Inline style state. Reads BOTH <body> and <html>: libraries disagree about
 * which one they mutate (Radix locks `body`, React Aria locks
 * `documentElement`), and an instrument that reads only one silently scores
 * the other as clean. Learned the hard way — the first version read `body`
 * only and would have reported React Aria as never scroll-locking.
 */
export type BodyState = {
  readonly pointerEvents: string;
  readonly overflow: string;
  readonly paddingRight: string;
  readonly htmlOverflow: string;
  readonly htmlPaddingRight: string;
  readonly position: string;
};

export const readBodyState = (): BodyState => ({
  pointerEvents: document.body.style.pointerEvents,
  overflow: document.body.style.overflow,
  paddingRight: document.body.style.paddingRight,
  htmlOverflow: document.documentElement.style.overflow,
  htmlPaddingRight: document.documentElement.style.paddingRight,
  position: document.body.style.position,
});

/** Clean == the library restored every inline style it set, on both elements. */
export const isBodyClean = (s: BodyState): boolean =>
  s.pointerEvents === "" &&
  s.overflow === "" &&
  s.paddingRight === "" &&
  s.htmlOverflow === "" &&
  s.htmlPaddingRight === "" &&
  s.position === "";

/**
 * Scroll-locked in the *narrow* sense: the page itself cannot scroll.
 * Necessary but NOT sufficient for scenario A — see `isBackgroundDead`.
 */
export const isScrollLocked = (s: BodyState): boolean =>
  s.overflow === "hidden" ||
  s.paddingRight !== "" ||
  s.htmlOverflow === "hidden" ||
  s.htmlPaddingRight !== "" ||
  s.position === "fixed";

/**
 * The trap this instrument nearly fell into (caught by the Radix prototype,
 * against its own interest): a library can leave `overflow` untouched — so a
 * naive "is it scroll-locked?" assertion goes green — while setting
 * `body.style.pointerEvents = 'none'`, which makes the background *visible but
 * not hit-testable*. A wheel over a nested scroll container then scrolls
 * nothing. For a kanban board, made entirely of nested scrollers, that is the
 * same failure as a scroll lock, arriving by a different door.
 *
 * Scenario A asks for "visible AND scrollable". Both doors must be shut.
 */
export const isBackgroundDead = (s: BodyState): boolean =>
  s.pointerEvents === "none";

/**
 * How the library hides the background from assistive tech. Reported, not
 * judged: `aria-hidden` and `inert` are both legitimate, but they differ —
 * `inert` also removes from tab order, `aria-hidden` alone does not (which is
 * exactly the WCAG 4.1.2 hazard behind base-ui#4678).
 */
export type BackgroundShielding = {
  readonly ariaHiddenCount: number;
  readonly inertCount: number;
  readonly technique: "aria-hidden" | "inert" | "both" | "none";
};

/**
 * Asks the question that matters — "is THIS background element shielded?" —
 * by walking up from the outside content, rather than counting matches in some
 * scope. The first version queried `outside.parentElement`'s descendants and
 * reported 0 for Base UI while Base UI's own prototype measured 5: shielding
 * is applied to *ancestors* of the outside content (markOthers walks the
 * portal's siblings), which a descendant query cannot see.
 */
export const readBackgroundShielding = (
  outside: HTMLElement,
): BackgroundShielding => {
  let ariaHidden = 0;
  let inert = 0;
  for (
    let el: HTMLElement | null = outside;
    el && el !== document.documentElement;
    el = el.parentElement
  ) {
    if (el.getAttribute("aria-hidden") === "true") ariaHidden++;
    if (el.hasAttribute("inert")) inert++;
  }
  return {
    ariaHiddenCount: ariaHidden,
    inertCount: inert,
    technique:
      ariaHidden > 0 && inert > 0
        ? "both"
        : ariaHidden > 0
          ? "aria-hidden"
          : inert > 0
            ? "inert"
            : "none",
  };
};

/** Where focus actually is, described without library knowledge. */
export const describeFocus = (container: HTMLElement | null): string => {
  const el = document.activeElement;
  if (!el || el === document.body) return "body";
  const inside = container?.contains(el) ?? false;
  const label =
    el.getAttribute("data-testid") ??
    el.getAttribute("aria-label") ??
    el.textContent?.trim().slice(0, 24) ??
    el.tagName.toLowerCase();
  return `${inside ? "inside" : "outside"}:${el.tagName.toLowerCase()}[${label}]`;
};

/** One candidate's measured behaviour, written to a JSON report. */
export type CandidateReport = {
  candidate: string;
  pkg: string;
  version: string;
  jsdomWorks: boolean;
  jsdomError: string | null;
  sidePeek: {
    bodyWhileOpen: BodyState | null;
    bodyAfterClose: BodyState | null;
    scrollLocked: boolean | null;
    /** visible but not hit-testable — the second door to the same failure */
    backgroundDead: boolean | null;
    focusTrapped: boolean | null;
    shielding: BackgroundShielding | null;
    focusWhileOpen: string | null;
    focusAfterClose: string | null;
    /**
     * The decisive one: focus trapped AND the board still genuinely usable —
     * neither scroll-locked nor pointer-dead.
     */
    partialModalityAchieved: boolean | null;
  };
  cycles: {
    count: number;
    bodyCleanAfterAll: boolean | null;
    residue: BodyState | null;
  };
  menuToDialog: {
    chainWorks: boolean | null;
    bodyAfterBothClosed: BodyState | null;
    error: string | null;
  };
  ime: {
    /** Enter during IME composition must NOT commit a selection */
    prematureCommit: boolean | null;
    error: string | null;
  };
  compiler: {
    /** presenter renders on an unrelated parent re-render; 1 == memo hit */
    presenterRendersOnUnrelatedUpdate: number | null;
  };
  notes: string[];
};

export const emptyReport = (
  candidate: string,
  pkg: string,
  version: string,
): CandidateReport => ({
  candidate,
  pkg,
  version,
  jsdomWorks: false,
  jsdomError: null,
  sidePeek: {
    bodyWhileOpen: null,
    bodyAfterClose: null,
    scrollLocked: null,
    backgroundDead: null,
    focusTrapped: null,
    shielding: null,
    focusWhileOpen: null,
    focusAfterClose: null,
    partialModalityAchieved: null,
  },
  cycles: { count: 0, bodyCleanAfterAll: null, residue: null },
  menuToDialog: { chainWorks: null, bodyAfterBothClosed: null, error: null },
  ime: { prematureCommit: null, error: null },
  compiler: { presenterRendersOnUnrelatedUpdate: null },
  notes: [],
});
