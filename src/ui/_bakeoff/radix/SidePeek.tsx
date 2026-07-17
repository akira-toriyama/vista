import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { SidePeekProps } from "../contract.type";
import { TESTID } from "../contract.type";
import { buttonVariants } from "@/ui/primitives/button";
import { cn } from "@/ui/lib/utils";
import { useSidePeek } from "./SidePeek.hook";
import type { Props } from "./SidePeek.type";

/**
 * Scenario A — "trap focus, show a backdrop, but do NOT scroll-lock the board".
 *
 * Radix cannot express that split through props. `Dialog.Root`'s `modal` is the
 * only knob and it is all-or-nothing; the three ingredients it bundles
 * (`trapFocus`, `disableOutsidePointerEvents`, scroll lock) exist separately in
 * the implementation but two of them are deleted from the public type:
 *
 *   dialog.tsx:269-272
 *     interface DialogContentTypeProps extends Omit<
 *       DialogContentImplProps, 'trapFocus' | 'disableOutsidePointerEvents'
 *     > {}
 *
 * The one seam that does exist is compositional, not prop-based: `RemoveScroll`
 * is mounted by `<Dialog.Overlay>` (dialog.tsx:221) while the focus trap is
 * mounted by `<Dialog.Content>` (dialog.tsx:422-425). So *not rendering the
 * Overlay* is what unbundles the scroll lock, and a plain `<div>` gives the
 * backdrop back.
 *
 * That gets 2/3. The third is out of reach: `DialogContentModal` hard-codes
 * `disableOutsidePointerEvents={context.open}` (dialog.tsx:297), which sets
 * `document.body.style.pointerEvents = 'none'`
 * (dismissable-layer.tsx:181-182). The board therefore stays *visible* but
 * stops being hit-testable, so a wheel over a board column scrolls nothing —
 * "scrollable behind" fails for exactly the nested scroll containers a kanban
 * is made of. Going `modal={false}` instead trades the focus trap away
 * (dialog.tsx:337 hard-codes `trapFocus={false}`) and makes `Dialog.Overlay`
 * return `null` outright (dialog.tsx:189). No public-API combination wins.
 *
 * Left as-is on purpose: the honest answer for the control group is "2/3, and
 * the miss is invisible to a DOM-only assertion".
 */
export function SidePeekComponent({
  open,
  onOpenChange,
  task,
  onCloseAutoFocus,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        {/* Deliberately NOT <Dialog.Overlay> — see the note above. */}
        <div
          data-slot="sidepeek-backdrop"
          aria-hidden="true"
          className="fixed inset-0 bg-black/40"
          // body is pointer-events:none while the dialog is open, so the
          // backdrop has to opt itself back in to be clickable-to-dismiss.
          style={{ pointerEvents: "auto" }}
        />
        <Dialog.Content
          data-testid={TESTID.sidePeek}
          data-slot="sidepeek"
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed inset-y-0 right-0 z-50 flex w-96 max-w-full flex-col gap-3 border-l bg-background p-4 shadow-lg outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <Dialog.Title className="text-sm leading-snug font-medium">
              {task.title}
            </Dialog.Title>
            <Dialog.Close
              data-testid={TESTID.sidePeekClose}
              data-slot="sidepeek-close"
              aria-label="Close side peek"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
              )}
            >
              <X />
            </Dialog.Close>
          </div>
          <Dialog.Description className="font-mono text-xs text-muted-foreground">
            {task.id}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function SidePeek(props: SidePeekProps) {
  return <SidePeekComponent {...useSidePeek(props)} />;
}
/* c8 ignore stop */
