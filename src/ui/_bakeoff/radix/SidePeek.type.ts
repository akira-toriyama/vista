import type { SidePeekProps } from "../contract.type";

/** SidePeekProps plus everything useSidePeek injects into the presenter. */
export interface Props extends SidePeekProps {
  /**
   * Hand-rolled focus restoration. Radix's own `onCloseAutoFocus` always wins
   * over FocusScope's restore and focuses `triggerRef.current`, which is `null`
   * for a controlled trigger-less dialog like this one — see SidePeek.hook.ts.
   */
  onCloseAutoFocus: (event: Event) => void;
}
