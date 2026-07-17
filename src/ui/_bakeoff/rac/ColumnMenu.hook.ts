import type { OuterProps, Props } from "./ColumnMenu.type";

/**
 * Deliberately empty of state. <MenuTrigger> keeps its own open state
 * (useMenuTriggerState) and there is no controlled-open requirement in scenario
 * C, so there is nothing for this hook to hold — the honest amount of behavior
 * RAC leaves to the app here is zero.
 */
export function useColumnMenu({
  onOpenDetail,
  onRename,
  onDelete,
}: OuterProps): Props {
  return { onOpenDetail, onRename, onDelete };
}
