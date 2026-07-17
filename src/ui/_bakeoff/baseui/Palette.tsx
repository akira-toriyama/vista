import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import type { BakeoffTask } from "../contract.type";
import { TESTID } from "../contract.type";
import { usePalette } from "./Palette.hook";
import type { OuterProps, Props } from "./Palette.type";

/**
 * Scenario B — trigger-less command palette.
 *
 * Shape is Base UI's own `autocomplete/demos/command-palette`: a controlled
 * `Dialog.Root` supplies the modality and the centering, and an always-open
 * `Autocomplete.Root inline` renders its list straight into the popup — no
 * Positioner, no anchor, hence no trigger needed in the tree. Dropping the
 * demo's `Dialog.Trigger` is the only edit; controlled `open` carries it.
 *
 * IME: `Autocomplete.Input` *is* `ComboboxInput` (autocomplete/index.parts.ts
 * re-exports it), and ComboboxInput.tsx:429-432 early-returns on
 * `event.which === 229` *before* the `key === 'Enter'` branch — so a composition
 * commit cannot fall through to `clickHighlightedItem`. First-party, no work
 * from me. See `fought` for the caveat about that guard.
 */
export function PaletteComponent({
  open,
  onOpenChange,
  tasks,
  onItemSelect,
  taskToLabel,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          data-slot="palette-backdrop"
          className="fixed inset-0 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50"
        />
        <Dialog.Viewport className="fixed inset-0 flex items-start justify-center overflow-hidden px-4 pt-24 pb-4">
          <Dialog.Popup
            data-slot="palette-popup"
            data-testid={TESTID.palette}
            aria-label="Command palette"
            className="flex max-h-[min(24rem,calc(100dvh-8rem))] w-full max-w-md flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg transition-[translate,scale,opacity] duration-150 outline-none data-ending-style:-translate-y-2 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:scale-95 data-starting-style:opacity-0"
          >
            <Autocomplete.Root
              open
              inline
              items={tasks}
              itemToStringValue={taskToLabel}
              autoHighlight="always"
              keepHighlight
            >
              <Autocomplete.Input
                data-testid={TESTID.paletteInput}
                aria-label="Search tasks"
                placeholder="Search tasks…"
                className="h-10 w-full border-b bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              {/* Escape route for touch screen readers, per the modal docstring. */}
              <Dialog.Close className="sr-only">Close palette</Dialog.Close>
              <div className="min-h-0 flex-1 overflow-y-auto p-1">
                <Autocomplete.Empty className="px-3 py-6 text-sm text-muted-foreground empty:m-0 empty:p-0">
                  No tasks found.
                </Autocomplete.Empty>
                <Autocomplete.List>
                  {(task: BakeoffTask) => (
                    <Autocomplete.Item
                      key={task.id}
                      value={task}
                      data-testid={TESTID.paletteItem}
                      onClick={() => {
                        onItemSelect(task);
                      }}
                      className="flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      <span className="min-w-0 truncate">{task.title}</span>
                      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                        {task.id}
                      </span>
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </div>
            </Autocomplete.Root>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function Palette(props: OuterProps) {
  return <PaletteComponent {...usePalette(props)} />;
}
/* c8 ignore stop */
