import { useEffect, useRef } from "react";
import type { SidePeekProps } from "../contract.type";
import type { Props } from "./SidePeek.type";

/**
 * Scenario A wiring.
 *
 * Almost nothing to do: Radix owns open/close, escape, dismiss-outside and the
 * focus trap. The one thing it gets wrong here is focus *restoration*, because
 * `Dialog` assumes a `Dialog.Trigger` exists somewhere in the tree:
 *
 *   dialog.tsx:298-301 (DialogContentModal)
 *     onCloseAutoFocus={composeEventHandlers(props.onCloseAutoFocus, (event) => {
 *       event.preventDefault();
 *       context.triggerRef.current?.focus();
 *     })}
 *
 * That `preventDefault()` disables FocusScope's own restore
 * (focus-scope.tsx:159-160 `focus(previouslyFocusedElement ?? document.body)`),
 * and then the `?.` swallows the fact that there is no trigger. Net effect for
 * this contract (`open` is controlled from outside, no trigger in the tree):
 * closing the side-peek drops focus on the `<body>`.
 *
 * `composeEventHandlers` defaults to `checkForDefaultPrevented: true`
 * (core/primitive/primitive.tsx:14), so calling `preventDefault()` from *our*
 * handler is the only way to stop Radix's, at which point restoring focus
 * becomes our job.
 */
export function useSidePeek({
  open,
  onOpenChange,
  task,
}: SidePeekProps): Props {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    const previous = restoreRef.current;
    // In the menu→dialog chain the remembered element is the menu item, which
    // has already unmounted by the time we close — nothing to restore to.
    if (previous?.isConnected === true) previous.focus();
  };

  return { open, onOpenChange, task, onCloseAutoFocus };
}
