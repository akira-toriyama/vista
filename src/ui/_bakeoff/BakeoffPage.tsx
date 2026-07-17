/**
 * t-wf4p — the WKWebView specimen page.
 *
 * Everything jsdom cannot answer lives here: the real accessibility tree, real
 * geometric occlusion, and real floating-ui positioning. jsdom has no layout
 * engine and does not enforce `inert`, so the 100% coverage gate happily greens
 * modal behaviour it has never actually executed.
 *
 * The overlays render OPEN BY DEFAULT, on purpose. House rule bans simulating
 * GUI input on the host (drag/click/move) — read-only inspection is allowed —
 * so the specimen puts itself into the state we need to observe, and peekaboo
 * only ever reads. Anything that genuinely needs input (Escape, Tab, IME,
 * open/close cycles) belongs in Browser Mode on WebKit (t-fn4k), not here.
 *
 * Mount: `VITE_BAKEOFF=baseui|rac|radix pnpm tauri dev`
 */
import { useState } from "react";

import type { BakeoffCandidate } from "./contract.type";
import { candidate as baseui } from "./baseui";
import { candidate as rac } from "./rac";
import { candidate as radix } from "./radix";

const CANDIDATES: Record<string, BakeoffCandidate> = { baseui, rac, radix };

const TASK = { id: "t-wf4p", title: "side-peek AX 検証タスク" };
const TASKS = [
  TASK,
  { id: "t-0002", title: "たすくを さがす" },
  { id: "t-0003", title: "another task" },
];

/**
 * A board-shaped background: nested scroll containers are exactly where a
 * pointer-dead body stops being a cosmetic detail and starts eating wheel
 * events, and they are unrepresentable in jsdom.
 */
const Board = () => (
  <div className="flex h-full gap-3 overflow-x-auto p-3" data-testid="ax-board">
    {["backlog", "ready", "in-progress", "done"].map((lane) => (
      <section
        key={lane}
        aria-label={lane}
        className="flex h-full w-56 shrink-0 flex-col gap-2 overflow-y-auto rounded-lg bg-muted/40 p-2"
      >
        <h2 className="text-sm font-medium">{lane}</h2>
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            type="button"
            className="rounded border border-border bg-background p-2 text-left text-xs"
          >
            {lane}-card-{i}
          </button>
        ))}
      </section>
    ))}
  </div>
);

export const BakeoffPage = ({ which }: { which: string }) => {
  const c = CANDIDATES[which];
  const [open, setOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  if (!c) {
    return (
      <p className="p-4">
        unknown candidate {JSON.stringify(which)} — expected one of{" "}
        {Object.keys(CANDIDATES).join(", ")}
      </p>
    );
  }

  return (
    <main className="h-dvh">
      <header className="flex items-center gap-3 border-b border-border p-2">
        <span data-testid="ax-candidate" className="text-sm font-medium">
          {c.meta.label} {c.meta.version}
        </span>
        <c.ColumnMenu
          onOpenDetail={() => setOpen(true)}
          onRename={() => {}}
          onDelete={() => {}}
        />
        <button
          type="button"
          data-testid="ax-open-palette"
          onClick={() => setPaletteOpen(true)}
        >
          palette
        </button>
      </header>
      <Board />
      <c.SidePeek open={open} onOpenChange={setOpen} task={TASK} />
      <c.Palette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        tasks={TASKS}
        onSelect={() => setPaletteOpen(false)}
      />
    </main>
  );
};
