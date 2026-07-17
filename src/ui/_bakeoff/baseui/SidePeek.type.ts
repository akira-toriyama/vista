import type { BakeoffTask, SidePeekProps } from "../contract.type";

/** What the harness passes in — the shared bake-off contract, verbatim. */
export type OuterProps = SidePeekProps;

/** OuterProps plus everything useSidePeek injects into the presenter. */
export interface Props {
  open: boolean;
  task: BakeoffTask;
  /**
   * Base UI calls `onOpenChange` with `(open, eventDetails)`; the bake-off
   * contract is `(open)`. The hook narrows it so the presenter can hand this
   * straight to `Dialog.Root` without leaking the extra argument.
   */
  onOpenChange: (open: boolean) => void;
}
