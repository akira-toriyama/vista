import { Search } from "lucide-react";
import { Dialog, VisuallyHidden } from "radix-ui";
import type { PaletteProps } from "../contract.type";
import { TESTID } from "../contract.type";
import { cn } from "@/ui/lib/utils";
import { usePalette } from "./Palette.hook";
import type { Props } from "./Palette.type";

/**
 * Scenario B — a Cmd+K palette with no trigger in the tree.
 *
 * Built on `Dialog`, not `Popover`, and that is a finding rather than a taste
 * call. `Popover.Content` renders through `Popper.Content`, which feeds
 * `useFloating({ elements: { reference: context.anchor } })` (popper.tsx:226).
 * With no `Popover.Trigger` and no `Popover.Anchor` the anchor is `null`,
 * floating-ui never positions, `isPositioned` stays `false`, and the wrapper
 * keeps its measuring transform:
 *
 *   popper.tsx:299
 *     transform: isPositioned ? floatingStyles.transform : 'translate(0, -200%)'
 *
 * i.e. a trigger-less Popover renders the palette *off-screen*. Popover is an
 * anchored surface by construction; "controlled open, no anchor" is outside
 * what it models. Dialog has no anchor to miss, so it is the right primitive —
 * at the cost of Dialog's other assumption (that a trigger exists), which
 * costs us the focus restore. Radix's modality menu here is: anchored or
 * centered, and if centered, fully modal.
 */
export function PaletteComponent({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  activeIndex,
  onItemClick,
  onInputKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onEscapeKeyDown,
  onCloseAutoFocus,
  listId,
  optionId,
}: Props) {
  const active = results[activeIndex];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        {/* A palette *wants* full modality, so unlike SidePeek this one keeps
            Dialog.Overlay and the RemoveScroll that rides along with it. */}
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          data-testid={TESTID.palette}
          data-slot="palette"
          onEscapeKeyDown={onEscapeKeyDown}
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed top-24 left-1/2 z-50 flex w-[32rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border bg-popover shadow-lg outline-none"
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>Command palette</Dialog.Title>
          </VisuallyHidden.Root>
          <VisuallyHidden.Root asChild>
            <Dialog.Description>
              Search tasks and press Enter
            </Dialog.Description>
          </VisuallyHidden.Root>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              data-testid={TESTID.paletteInput}
              data-slot="palette-input"
              // Radix has no combobox primitive, so the ARIA wiring is manual.
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={
                active === undefined ? undefined : optionId(active.id)
              }
              aria-label="Search tasks"
              autoComplete="off"
              placeholder="Search tasks…"
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
              }}
              onKeyDown={onInputKeyDown}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label="Tasks"
            className="max-h-72 overflow-y-auto p-1"
          >
            {results.map((task, index) => (
              <button
                key={task.id}
                type="button"
                id={optionId(task.id)}
                role="option"
                aria-selected={index === activeIndex}
                data-testid={TESTID.paletteItem}
                data-slot="palette-item"
                onClick={() => {
                  onItemClick(task.id);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none",
                  index === activeIndex && "bg-muted text-foreground",
                )}
              >
                <span className="truncate">{task.title}</span>
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                  {task.id}
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No tasks match “{query}”
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function Palette(props: PaletteProps) {
  return <PaletteComponent {...usePalette(props)} />;
}
/* c8 ignore stop */
