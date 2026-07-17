import type { BakeoffTask, PaletteProps } from "../contract.type";

/** What the harness passes in — the shared bake-off contract, verbatim. */
export type OuterProps = PaletteProps;

/** OuterProps plus everything usePalette injects into the presenter. */
export interface Props {
  open: boolean;
  tasks: readonly BakeoffTask[];
  onOpenChange: (open: boolean) => void;
  /** Enter on the highlighted item, or a click — commits, then closes. */
  onItemSelect: (task: BakeoffTask) => void;
  /** Feeds Autocomplete's built-in filter + a11y label; matches on title. */
  taskToLabel: (task: BakeoffTask) => string;
}
