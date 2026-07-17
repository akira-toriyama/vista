import type { OuterProps, Props } from "./ColumnMenu.type";

/**
 * Nothing to inject at all. `Menu.Root` is uncontrolled here — Base UI owns the
 * open state, `Menu.Item` closes on click by default (MenuItem.tsx:28,
 * `closeOnClick = true`), and the contract's three callbacks pass straight
 * through. The hook exists to satisfy the house injection pattern; it is an
 * identity function, and pretending otherwise would be dishonest.
 */
export function useColumnMenu({
  onOpenDetail,
  onRename,
  onDelete,
}: OuterProps): Props {
  return { onOpenDetail, onRename, onDelete };
}
