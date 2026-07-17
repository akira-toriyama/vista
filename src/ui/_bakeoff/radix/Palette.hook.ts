import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PaletteProps } from "../contract.type";
import type { Props } from "./Palette.type";

/**
 * Scenario B wiring — and this is where it becomes clear how little of a
 * command palette Radix actually owns. Radix contributes: portal, backdrop,
 * focus trap, Escape-to-dismiss, dismiss-on-outside-click. Everything below
 * — query state, filtering, the active option, Arrow navigation, Enter to
 * commit, and every last bit of IME handling — is hand-written, because there
 * is no first-party combobox/listbox/roving-focus in the public surface.
 *
 * IME: `grep -rn "isComposing\|compositionstart" packages/react` over the
 * clone returns **zero hits** — no Radix primitive is composition-aware. Two
 * separate leaks follow from that, and each needs its own guard:
 *
 *  1. Enter. Ours to catch, since the `<input>` is ours: `isComposing` on the
 *     native event, backed by a compositionstart/end ref.
 *  2. Escape. NOT ours — `DismissableLayer` listens on the *document* in the
 *     capture phase and only asks `event.key !== 'Escape'`
 *     (dismissable-layer.tsx:157), so a composition-cancelling Escape closes
 *     the whole palette and throws the half-typed text away. The escape hatch
 *     is `onEscapeKeyDown` + `preventDefault()`, which reaches the guard
 *     before `onDismiss`.
 */
export function usePalette({
  open,
  onOpenChange,
  tasks,
  onSelect,
}: PaletteProps): Props {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const composingRef = useRef(false);
  const listId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);

  // A palette is expected to reopen empty. Radix unmounts Content on close, but
  // the query state lives out here in the hook (the presenter must stay pure),
  // so the reset is ours. It cannot be an effect: `react-hooks/set-state-in-effect`
  // rejects that, so this is React's blessed "adjust state during render".
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const needle = query.trim().toLowerCase();
  const results =
    needle === ""
      ? tasks
      : tasks.filter((task) => task.title.toLowerCase().includes(needle));

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  const optionId = (id: string) => `${listId}-${id}`;

  const commit = (id: string) => {
    onSelect(id);
    onOpenChange(false);
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing || composingRef.current) return;
    const active = results[activeIndex];
    if (active === undefined) return;
    event.preventDefault();
    commit(active.id);
  };

  const onCompositionStart = () => {
    composingRef.current = true;
  };

  const onCompositionEnd = () => {
    composingRef.current = false;
  };

  const onEscapeKeyDown = (event: KeyboardEvent) => {
    if (!event.isComposing && !composingRef.current) return;
    event.preventDefault();
  };

  const onCloseAutoFocus = (event: Event) => {
    // Same trigger-less-dialog problem as SidePeek — see SidePeek.hook.ts.
    event.preventDefault();
    const previous = restoreRef.current;
    if (previous?.isConnected === true) previous.focus();
  };

  return {
    open,
    onOpenChange,
    query,
    onQueryChange,
    results,
    activeIndex,
    onItemClick: commit,
    onInputKeyDown,
    onCompositionStart,
    onCompositionEnd,
    onEscapeKeyDown,
    onCloseAutoFocus,
    listId,
    optionId,
  };
}
