import type { ColumnMenuProps } from "../contract.type";

/** ColumnMenuProps plus everything useColumnMenu injects into the presenter. */
export interface Props {
  /** Wraps `onOpenDetail` so the menu knows a dialog is taking over focus. */
  onSelectDetail: () => void;
  onRename: ColumnMenuProps["onRename"];
  onDelete: ColumnMenuProps["onDelete"];
  /** Suppresses the menu's focus-return-to-trigger for the detail item only. */
  onCloseAutoFocus: (event: Event) => void;
}
