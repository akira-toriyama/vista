import type { BakeoffTask } from "../contract.type";
import type { OuterProps, Props } from "./Palette.type";

/**
 * No query state and no filtering here on purpose: `Autocomplete.Root` owns the
 * input value and does the filtering itself (`mode` defaults to `'list'`, whose
 * filter is `useCoreFilter().contains` over `itemToStringValue`). So the hook
 * only composes the contract's two callbacks into the one gesture Base UI
 * reports — "an item was activated".
 */
export function usePalette({
  open,
  onOpenChange,
  tasks,
  onSelect,
}: OuterProps): Props {
  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);
  }

  function onItemSelect(task: BakeoffTask): void {
    onSelect(task.id);
    onOpenChange(false);
  }

  function taskToLabel(task: BakeoffTask): string {
    return task.title;
  }

  return {
    open,
    tasks,
    onOpenChange: handleOpenChange,
    onItemSelect,
    taskToLabel,
  };
}
