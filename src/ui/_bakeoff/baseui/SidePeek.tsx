import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import { cn } from "@/ui/lib/utils";
import { TESTID } from "../contract.type";
import { useSidePeek } from "./SidePeek.hook";
import type { OuterProps, Props } from "./SidePeek.type";

/**
 * Scenario A — partial modality.
 *
 * `modal="trap-focus"` is the whole story, and Base UI really does decompose it
 * into three independent gates (verified against the v1.6.0 tag, not the docs):
 *
 * - `dialog/root/useDialogRoot.ts:106` — `useScrollLock(open && modal === true, …)`
 *   Strict `=== true`, so `'trap-focus'` never scroll-locks the board.
 * - `dialog/portal/DialogPortal.tsx:35` — `{mounted && modal === true && <InternalBackdrop/>}`
 *   Also strict `=== true`, so `'trap-focus'` renders no pointer-blocking layer.
 * - `dialog/popup/DialogPopup.tsx:118` — `modal={modal !== false}` into FloatingFocusManager
 *   `!== false`, so `'trap-focus'` still traps focus.
 *
 * Trap yes, scroll-lock no, pointer-block no — exactly the decomposition the
 * contract asks for, expressed by one prop value.
 */
export function SidePeekComponent({ open, onOpenChange, task }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal="trap-focus">
      <Dialog.Portal>
        {/*
         * `pointer-events-none` is deliberate, not decoration. Base UI withholds
         * its pointer-blocking InternalBackdrop for `trap-focus` on purpose; a
         * pointer-events-auto backdrop of my own would silently re-block the
         * board and undo exactly what `trap-focus` grants. Dismissal survives:
         * useDialogRoot's `outsidePressEvent()` keys off `backdropRef.current`
         * existing in the DOM, which it still does.
         */}
        <Dialog.Backdrop
          data-slot="sidepeek-backdrop"
          className="pointer-events-none fixed inset-0 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50"
        />
        <Dialog.Popup
          data-slot="sidepeek-popup"
          data-testid={TESTID.sidePeek}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 border-l bg-card p-4 shadow-lg outline-none",
            "transition-transform duration-150 data-ending-style:translate-x-full data-starting-style:translate-x-full",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Dialog.Title className="text-sm leading-snug font-medium">
              {task.title}
            </Dialog.Title>
            {/*
             * The `modal` docstring (DialogRoot.tsx:32) explicitly asks for a
             * Close inside the Popup whenever modal is `true` or `'trap-focus'`,
             * so touch screen readers can escape the popup.
             */}
            <Dialog.Close
              data-testid={TESTID.sidePeekClose}
              render={<Button variant="ghost" size="icon-xs" />}
              aria-label="Close detail"
            >
              <X />
            </Dialog.Close>
          </div>
          <Dialog.Description className="font-mono text-xs text-muted-foreground">
            {task.id}
          </Dialog.Description>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function SidePeek(props: OuterProps) {
  return <SidePeekComponent {...useSidePeek(props)} />;
}
/* c8 ignore stop */
