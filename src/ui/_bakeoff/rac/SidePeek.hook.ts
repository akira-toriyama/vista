import { useRef } from "react";
import type { OuterProps, Props } from "./SidePeek.type";

/**
 * Scenario A wants a *partial* modality: trap focus, show a backdrop, but leave
 * the board scrollable. RAC bundles those three axes into one `isNonModal`
 * boolean, so this hook exists mostly to hold the one escape hatch that makes
 * the combination reachable at all.
 *
 * Why an anchor ref that is never attached to anything:
 *
 * <Popover> requires a `triggerRef` and treats it as an anchor. usePopover
 * hands it to useOverlayPosition (react-aria/src/overlays/usePopover.ts:117-126),
 * which wires useCloseOnScroll (useOverlayPosition.ts:383-388). useCloseOnScroll
 * dismisses the overlay whenever a scroll event's target *contains* the trigger
 * (useCloseOnScroll.ts:39-48) — and since `nodeContains(document, trigger)` is
 * just `document.contains(trigger)`, scrolling the page closes the popover.
 * That is precisely the interaction scenario A is built to keep working, so an
 * anchored popover cannot express a side-peek.
 *
 * Leaving `.current` null defuses the anchoring machinery instead of fighting it:
 *   - useCloseOnScroll bails on `!triggerRef.current` (useCloseOnScroll.ts:44)
 *     → scrolling the board no longer dismisses the peek.
 *   - useOverlayPosition's updatePosition bails on `!targetRef.current`
 *     (useOverlayPosition.ts:239) → no computed anchor position to fight; the
 *     panel keeps the fixed edge placement the presenter sets inline.
 *
 * This is off-label. RAC has no unanchored non-modal overlay primitive.
 */
export function useSidePeek({ open, onOpenChange, task }: OuterProps): Props {
  const anchorRef = useRef<HTMLElement>(null);
  return { open, onOpenChange, task, anchorRef };
}
