/**
 * t-wf4p headless UI bake-off — the shared contract.
 *
 * Every candidate implements these three components with byte-identical props
 * so one neutral test suite can drive all of them (`describe.each`). Any
 * difference the suite reports is therefore attributable to the library, not
 * to how the prototype was written.
 *
 * Throwaway: this whole directory dies with the branch.
 */

export type BakeoffTask = {
  readonly id: string;
  readonly title: string;
};

/**
 * Scenario A — side-peek. Task detail slides in from the trailing edge while
 * the board stays visible AND scrollable behind it. This is the scenario that
 * forces each library's "partial modality" story: focus should be trapped and
 * a backdrop should be present, but the page must not be scroll-locked.
 */
export type SidePeekProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly task: BakeoffTask;
};

/**
 * Scenario B — command palette. Opens without a trigger in the tree (Cmd+K
 * from anywhere), takes text input, filters, commits on Enter. Exercises
 * controlled-open-without-anchor and IME composition.
 */
export type PaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly tasks: readonly BakeoffTask[];
  readonly onSelect: (id: string) => void;
};

/**
 * Scenario C — column header "..." menu. Click-open (not hover), three items,
 * one of which opens the side-peek dialog. Exercises the menu→dialog chain
 * that is the classic "UI freezes" bug class.
 */
export type ColumnMenuProps = {
  readonly onOpenDetail: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
};

/** What every candidate module must export. */
export type BakeoffCandidate = {
  readonly meta: {
    readonly key: string;
    readonly label: string;
    readonly pkg: string;
    readonly version: string;
  };
  readonly SidePeek: (props: SidePeekProps) => React.ReactNode;
  readonly Palette: (props: PaletteProps) => React.ReactNode;
  readonly ColumnMenu: (props: ColumnMenuProps) => React.ReactNode;
};

/**
 * Stable hooks every candidate must attach, so the neutral suite and the
 * WKWebView AX dump can find things without knowing library internals.
 */
export const TESTID = {
  sidePeek: "bakeoff-sidepeek",
  sidePeekClose: "bakeoff-sidepeek-close",
  palette: "bakeoff-palette",
  paletteInput: "bakeoff-palette-input",
  paletteItem: "bakeoff-palette-item",
  menuTrigger: "bakeoff-menu-trigger",
  menu: "bakeoff-menu",
  menuOpenDetail: "bakeoff-menu-open-detail",
  menuRename: "bakeoff-menu-rename",
  menuDelete: "bakeoff-menu-delete",
} as const;
