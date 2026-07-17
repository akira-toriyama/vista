import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useState } from "react";
import { useBoardInfo, useDropTask, useTaskList } from "@/application/hooks";
import { columnize, planDrop } from "@/domain/kanban";
import { Button } from "@/ui/components/ui/button";
import { BoardColumn } from "./BoardColumn";
import { dropTargetFrom, isCardDragData } from "./drag-data";
import type { CardDisplayOptions } from "./TaskCard";

const DISPLAY_FIELDS: readonly {
  key: keyof CardDisplayOptions;
  label: string;
}[] = [
  { key: "id", label: "ID" },
  { key: "pips", label: "Pips" },
  { key: "labels", label: "Labels" },
  { key: "repo", label: "Repo" },
];

/**
 * The kanban board: one column per board lane, cards ordered by furrow's
 * sparse priority. A drop is planned by domain planDrop and lands as one
 * furrow write (reorder / set / move) with an optimistic cache patch.
 */
export function BoardView() {
  const board = useBoardInfo();
  const tasks = useTaskList();
  const dropTask = useDropTask();
  const { mutate: executeDrop } = dropTask;
  const [display, setDisplay] = useState<CardDisplayOptions>({
    id: true,
    pips: true,
    labels: true,
    repo: true,
  });

  const lanes = board.data.lanes;
  // React Compiler memoizes this — identity is stable for the effect below
  const columns = columnize(tasks.data, lanes);
  const readOnly = !board.data.writable;

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isCardDragData(source.data),
      onDrop: ({ source, location }) => {
        if (!isCardDragData(source.data)) return;
        const resolved = dropTargetFrom(location.current.dropTargets);
        if (resolved === null) return;
        const plan = planDrop({
          draggedId: source.data.id,
          sourceLane: source.data.lane,
          targetLane: resolved.lane,
          targetCards: columns.get(resolved.lane) ?? [],
          target: resolved.target,
        });
        if (plan !== null)
          executeDrop({ id: source.data.id, targetLane: resolved.lane, plan });
      },
    });
  }, [columns, executeDrop]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-end gap-1 px-3 py-1.5">
        {DISPLAY_FIELDS.map(({ key, label }) => (
          <Button
            key={key}
            variant="ghost"
            size="xs"
            aria-pressed={display[key]}
            className={display[key] ? "" : "text-muted-foreground/50"}
            onClick={() => {
              setDisplay((d) => ({ ...d, [key]: !d[key] }));
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 items-stretch gap-2.5 overflow-x-auto px-3 pb-3">
        {lanes.map((lane) => (
          <BoardColumn
            key={lane}
            lane={lane}
            cards={columns.get(lane) ?? []}
            display={display}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
