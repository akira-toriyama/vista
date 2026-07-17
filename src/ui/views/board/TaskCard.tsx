import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Lane, Task } from "@/domain/task";
import { cn } from "@/ui/lib/utils";
import { cardDragData, isCardDragData } from "./drag-data";

/** Which optional card fields the board currently renders. */
export interface CardDisplayOptions {
  id: boolean;
  pips: boolean;
  labels: boolean;
  repo: boolean;
}

interface TaskCardProps {
  task: Task;
  lane: Lane;
  display: CardDisplayOptions;
  /** board not writable → cards render but never register as draggable. */
  readOnly: boolean;
}

export function TaskCard({ task, lane, display, readOnly }: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const dropTarget = dropTargetForElements({
      element,
      getData: ({ input }) =>
        attachClosestEdge(cardDragData(task.id, lane), {
          element,
          input,
          allowedEdges: ["top", "bottom"],
        }),
      canDrop: ({ source }) =>
        isCardDragData(source.data) && source.data.id !== task.id,
      onDrag: ({ self }) => {
        setClosestEdge(extractClosestEdge(self.data));
      },
      onDragLeave: () => {
        setClosestEdge(null);
      },
      onDrop: () => {
        setClosestEdge(null);
      },
    });
    if (readOnly) return dropTarget;
    return combine(
      draggable({
        element,
        getInitialData: () => cardDragData(task.id, lane),
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      }),
      dropTarget,
    );
  }, [task.id, lane, readOnly]);

  const blocked = task.blocked_by.length > 0;

  return (
    <div
      ref={ref}
      data-testid="task-card"
      data-task-id={task.id}
      data-blocked={blocked || undefined}
      className={cn(
        "relative cursor-grab rounded-lg border bg-card p-2 text-sm shadow-xs",
        blocked && "opacity-60",
        isDragging && "opacity-40",
      )}
    >
      {closestEdge !== null && (
        <div
          className={cn(
            "absolute inset-x-0.5 h-0.5 rounded-full bg-primary",
            closestEdge === "top" ? "-top-[5px]" : "-bottom-[5px]",
          )}
        />
      )}
      <div className="flex items-start gap-1.5">
        {blocked && (
          <Flag
            role="img"
            aria-label={`blocked by ${task.blocked_by.join(", ")}`}
            className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500"
          />
        )}
        <span className="leading-snug font-medium">{task.title}</span>
      </div>
      <CardMeta task={task} display={display} />
    </div>
  );
}

function CardMeta({
  task,
  display,
}: {
  task: Task;
  display: CardDisplayOptions;
}) {
  const showRepo = display.repo && task.repos.length > 0;
  const showLabels = display.labels && task.labels.length > 0;
  const showPips =
    display.pips && (task.value !== undefined || task.effort !== undefined);
  if (!display.id && !showRepo && !showLabels && !showPips) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
      {display.id && <span className="font-mono">{task.id}</span>}
      {showRepo && (
        <span className="truncate">
          {task.repos.map(repoShorthand).join(" ")}
        </span>
      )}
      {showLabels && (
        <span className="flex items-center gap-1">
          {task.labels.map((label) => (
            <LabelDot key={label} label={label} />
          ))}
        </span>
      )}
      {showPips && (
        <span className="ml-auto flex items-center gap-1.5">
          {task.value !== undefined && <Pips kind="value" count={task.value} />}
          {task.effort !== undefined && (
            <Pips kind="effort" count={task.effort} />
          )}
        </span>
      )}
    </div>
  );
}

/** owner/repo → repo (the board is usually scoped to one owner anyway). */
function repoShorthand(repo: string): string {
  const parts = repo.split("/");
  return parts[parts.length - 1] ?? repo;
}

function LabelDot({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={`label ${label}`}
      title={label}
      className="size-2 rounded-full"
      style={{ backgroundColor: `oklch(0.65 0.15 ${labelHue(label)})` }}
    />
  );
}

/** Deterministic hue so a label keeps its color across sessions and views. */
function labelHue(label: string): number {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 360;
  return hash;
}

/** 1..5 estimate as pips — value round, effort square, to tell them apart. */
function Pips({ kind, count }: { kind: "value" | "effort"; count: number }) {
  return (
    <span
      role="img"
      aria-label={`${kind} ${count} of 5`}
      className="flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "size-1",
            kind === "value" ? "rounded-full" : "rounded-[1px]",
            i <= count ? "bg-muted-foreground" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}
