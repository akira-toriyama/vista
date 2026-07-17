import {
  Autocomplete,
  Dialog,
  Input,
  Menu,
  MenuItem,
  Modal,
  ModalOverlay,
  SearchField,
} from "react-aria-components";
import { TESTID } from "../contract.type";
import { usePalette } from "./Palette.hook";
import type { OuterProps, Props } from "./Palette.type";

/**
 * Scenario B — Cmd+K palette: controlled `open`, no trigger in the tree.
 *
 * <ModalOverlay isOpen onOpenChange> takes controlled open directly — no
 * DialogTrigger needed. Modal.tsx:184-186 picks its local (controlled) state
 * whenever `isOpen` is passed, falling back to trigger context only when it is
 * not, so a trigger-less palette is a supported configuration rather than a
 * workaround. Scroll lock is unconditional here (useModalOverlay.ts:65) but a
 * command palette wants it, so <Modal> is the right primitive for B — unlike A.
 *
 * IME: RAC handles composition itself, so there is no onCompositionStart
 * bookkeeping in this file. useAutocomplete.ts:327-331 early-returns from its
 * keydown handler when `e.nativeEvent.isComposing`, so Enter that merely commits
 * a kana→kanji conversion never reaches the menu and cannot fire onAction.
 * useKeyboard.ts:55 applies the same guard to shortcuts (`isComposing &&
 * !allowComposing` → continuePropagation), and FocusScope.tsx:361 skips its Tab
 * handling while composing. useAutocomplete.ts:300-306 additionally treats the
 * `insertCompositionText` inputType as forward typing, so the first item stays
 * virtually focused *during* composition rather than only after it commits.
 */
export function PaletteComponent({
  open,
  onOpenChange,
  tasks,
  onSelect,
  contains,
}: Props) {
  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 pt-[12vh]"
    >
      <Modal className="w-full max-w-lg outline-none">
        <Dialog
          data-testid={TESTID.palette}
          aria-label="Command palette"
          className="overflow-hidden rounded-xl border bg-background shadow-lg outline-none"
        >
          <Autocomplete filter={contains}>
            <SearchField
              aria-label="Search tasks"
              // eslint-disable-next-line jsx-a11y-x/no-autofocus -- a Cmd+K palette must land focus in the query field; without it useDialog focuses the dialog element itself (useDialog.ts:65-67) and typing goes nowhere. This is overlay-open focus, not page-load autofocus.
              autoFocus
              className="border-b"
            >
              <Input
                data-testid={TESTID.paletteInput}
                placeholder="Search tasks…"
                className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </SearchField>
            <Menu
              items={tasks}
              onAction={(key) => {
                onSelect(String(key));
              }}
              className="max-h-72 overflow-y-auto p-1 outline-none"
              renderEmptyState={() => (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No tasks
                </p>
              )}
            >
              {(task) => (
                <MenuItem
                  id={task.id}
                  textValue={task.title}
                  data-testid={TESTID.paletteItem}
                  className="flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none focus:bg-muted data-[focused]:bg-muted"
                >
                  <span className="truncate">{task.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {task.id}
                  </span>
                </MenuItem>
              )}
            </Menu>
          </Autocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function Palette(props: OuterProps) {
  return <PaletteComponent {...usePalette(props)} />;
}
/* c8 ignore stop */
