import type { ColumnMenuProps } from "../contract.type";

/** What the harness passes in — the shared bake-off contract, verbatim. */
export type OuterProps = ColumnMenuProps;

/** OuterProps plus everything useColumnMenu injects into the presenter. */
export interface Props {
  onOpenDetail: () => void;
  onRename: () => void;
  onDelete: () => void;
}
