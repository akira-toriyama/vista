import { X } from "lucide-react";
import {
  Button as AriaButton,
  Dialog,
  Heading,
  Popover,
} from "react-aria-components";
import { cn } from "@/ui/lib/utils";
import { buttonVariants } from "@/ui/primitives/button";
import { TESTID } from "../contract.type";
import { useSidePeek } from "./SidePeek.hook";
import type { OuterProps, Props } from "./SidePeek.type";

/**
 * Scenario A — trap focus, keep the board scrollable behind.
 *
 * <Modal> cannot do this: useModalOverlay.ts:65 calls usePreventScroll with
 * `isDisabled: !state.isOpen`, i.e. scroll lock is unconditional while open and
 * has no prop to turn it off (it also inerts the background at :73). So the
 * peek is built from <Popover isNonModal> instead, where usePopover.ts:128-130
 * passes `isDisabled: isNonModal || !state.isOpen` — `isNonModal` is the only
 * lever RAC exposes over scroll lock.
 *
 * The catch is that `isNonModal` is not a scroll-lock switch, it is a modality
 * bundle. It also turns off:
 *   - the focus trap — Popover.tsx:272-274 makes `shouldBeDialog` false, so
 *     :368 passes `shouldContainFocus={false}` to <Overlay>; and
 *   - the backdrop — Popover.tsx:372 renders the underlay only when
 *     `!props.isNonModal`.
 *
 * The trap is won back through a context side-channel rather than a prop: the
 * nested <Dialog> calls useDialog, which calls useOverlayFocusContain
 * (useDialog.ts:90) → setContain(true) on OverlayContext → Overlay.tsx:78
 * re-enables the FocusScope via `contain={(shouldContainFocus || contain) && ...}`.
 * So <Popover isNonModal> + <Dialog> = trapped, not scroll-locked.
 *
 * The backdrop has no such side-channel and is hand-rolled below.
 */
export function SidePeekComponent({
  open,
  onOpenChange,
  task,
  anchorRef,
}: Props) {
  return (
    <>
      {/* Hand-rolled: RAC's own underlay is gated behind `!isNonModal`
          (Popover.tsx:372) — the one flag we had to set to keep the board
          scrollable. z-index stays under the popover's inline zIndex: 100000
          (useOverlayPosition.ts:396). Presentational only: outside-press
          dismissal is off under isNonModal (useOverlay `isDismissable:
          !isNonModal` — usePopover.ts:105), so this mirrors it explicitly. */}
      {open && (
        <div
          data-slot="sidepeek-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-foreground/20"
        />
      )}
      <Popover
        isOpen={open}
        onOpenChange={onOpenChange}
        isNonModal
        triggerRef={anchorRef}
        // Inline, not Tailwind: useOverlayPosition hands the popover inline
        // styles (`position: fixed; top: 0; left: 0; maxHeight: 100vh` when
        // there is no anchor — useOverlayPosition.ts:390-400) and inline beats
        // classes. Popover.tsx:325-332 spreads renderProps.style last, so this
        // is the supported way to win.
        style={{
          top: 0,
          bottom: 0,
          left: "auto",
          right: 0,
          maxHeight: "100vh",
        }}
        className="w-[22rem] outline-none"
      >
        <Dialog
          data-testid={TESTID.sidePeek}
          aria-label={`Task ${task.id}`}
          className="flex h-full flex-col gap-3 border-l bg-background p-4 shadow-lg outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <Heading
              slot="title"
              className="text-sm leading-snug font-medium text-balance"
            >
              {task.title}
            </Heading>
            <AriaButton
              data-testid={TESTID.sidePeekClose}
              aria-label="Close"
              onPress={() => {
                onOpenChange(false);
              }}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
              )}
            >
              <X />
            </AriaButton>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
        </Dialog>
      </Popover>
    </>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function SidePeek(props: OuterProps) {
  return <SidePeekComponent {...useSidePeek(props)} />;
}
/* c8 ignore stop */
