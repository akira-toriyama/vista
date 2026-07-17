import type { OuterProps, Props } from "./SidePeek.type";

/**
 * Barely anything to inject: Base UI owns the open/close machine inside
 * `Dialog.Root`, so the only real work here is narrowing Base UI's
 * `(open, eventDetails)` callback down to the contract's `(open)`.
 */
export function useSidePeek({ open, onOpenChange, task }: OuterProps): Props {
  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);
  }

  return { open, task, onOpenChange: handleOpenChange };
}
