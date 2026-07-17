import { useRef } from "react";
import type { ColumnMenuProps } from "../contract.type";
import type { Props } from "./ColumnMenu.type";

/**
 * Scenario C wiring — the menu→dialog chain.
 *
 * The good news first: the classic "menu closes, `<body>` keeps
 * `pointer-events: none`, whole UI is dead" freeze does not reproduce on
 * 1.1.19. `DismissableLayer` now drops a layer out of the disabled set on
 * `disableOutsidePointerEvents` going false rather than only on unmount
 * (dismissable-layer.tsx:190-200, fixing radix-ui/primitives#3645), which is
 * exactly the overlapping-layers case the menu and the dialog create.
 *
 * The remaining sharp edge is focus, not pointer-events. `MenuItem.handleSelect`
 * dispatches its select event through `flushSync` (menu.tsx:633 →
 * react/primitive/primitive.tsx:104), so `onOpenDetail()` mounts the dialog
 * *synchronously*, and only then does `rootContext.onClose()` run. The menu
 * therefore unmounts with the dialog already focused, and
 * `DropdownMenuContent`'s built-in `onCloseAutoFocus`
 * (dropdown-menu.tsx:187-190) fires `context.triggerRef.current?.focus()` —
 * yanking focus out of the dialog that just opened. The dialog's own trap drags
 * it back, but a keyboard user gets two focus moves for one action.
 *
 * `preventDefault()` in our handler stops it: `composeEventHandlers` defaults
 * to `checkForDefaultPrevented: true` (core/primitive/primitive.tsx:14), so
 * Radix's handler is skipped. It has to be conditional, though — Rename and
 * Delete do want the focus returned to the trigger. Hence the ref: the menu has
 * no way to know what an `onSelect` is about to do.
 */
export function useColumnMenu({
  onOpenDetail,
  onRename,
  onDelete,
}: ColumnMenuProps): Props {
  const handsOffFocusRef = useRef(false);

  const onSelectDetail = () => {
    handsOffFocusRef.current = true;
    onOpenDetail();
  };

  const onCloseAutoFocus = (event: Event) => {
    if (!handsOffFocusRef.current) return;
    handsOffFocusRef.current = false;
    event.preventDefault();
  };

  return { onSelectDetail, onRename, onDelete, onCloseAutoFocus };
}
