import { Flag } from "lucide-react";
import type { Task } from "@/domain/task";
import { cn } from "@/ui/lib/utils";
import { useTaskCard } from "./useTaskCard";
import type { CardDisplayOptions, OuterProps, Props } from "./TaskCard.type";

/** Pure card renderer: every piece of state and behavior arrives via props. */
// react-hooks/refs: split the injected ref into its own binding — reading other
// props off an object that also carries a ref trips the rule, so `...props` (the
// rest) is ref-free and stays on the `props.` read style.
export function TaskCardComponent({ ref, ...props }: Props) {
  const blocked = props.task.blocked_by.length > 0;
  return (
    <div
      ref={ref}
      data-testid="task-card"
      data-task-id={props.task.id}
      data-blocked={blocked || undefined}
      className={cn(
        "relative cursor-grab rounded-lg border bg-card p-2 text-sm shadow-xs",
        blocked && "opacity-60",
        props.isDragging && "opacity-40",
      )}
    >
      {props.closestEdge !== null && (
        <div
          data-testid="drop-indicator"
          className={cn(
            "absolute inset-x-0.5 h-0.5 rounded-full bg-primary",
            props.closestEdge === "top" ? "-top-[5px]" : "-bottom-[5px]",
          )}
        />
      )}
      <div className="flex items-start gap-1.5">
        {blocked && (
          <Flag
            role="img"
            aria-label={`blocked by ${props.task.blocked_by.join(", ")}`}
            className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500"
          />
        )}
        <span className="leading-snug font-medium">{props.task.title}</span>
      </div>
      <CardMeta task={props.task} display={props.display} />
    </div>
  );
}

function CardMeta(props: { task: Task; display: CardDisplayOptions }) {
  const showRepo = props.display.repo && props.task.repos.length > 0;
  const showLabels = props.display.labels && props.task.labels.length > 0;
  const showPips =
    props.display.pips &&
    (props.task.value !== undefined || props.task.effort !== undefined);
  if (!props.display.id && !showRepo && !showLabels && !showPips) return null;
  return (
    <div
      data-testid="card-meta"
      className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"
    >
      {props.display.id && <span className="font-mono">{props.task.id}</span>}
      {showRepo && (
        <span className="truncate">
          {props.task.repos.map(repoShorthand).join(" ")}
        </span>
      )}
      {showLabels && (
        <span className="flex items-center gap-1">
          {props.task.labels.map((label) => (
            <LabelDot key={label} label={label} />
          ))}
        </span>
      )}
      {showPips && (
        <span className="ml-auto flex items-center gap-1.5">
          {props.task.value !== undefined && (
            <Pips kind="value" count={props.task.value} />
          )}
          {props.task.effort !== undefined && (
            <Pips kind="effort" count={props.task.effort} />
          )}
        </span>
      )}
    </div>
  );
}

/** owner/repo → repo (the board is usually scoped to one owner anyway). */
function repoShorthand(repo: string): string {
  return repo.slice(repo.lastIndexOf("/") + 1);
}

function LabelDot(props: { label: string }) {
  return (
    <span
      role="img"
      aria-label={`label ${props.label}`}
      title={props.label}
      className="size-2 rounded-full"
      style={{ backgroundColor: `oklch(0.65 0.15 ${labelHue(props.label)})` }}
    />
  );
}

/** Deterministic hue so a label keeps its color across sessions and views. */
function labelHue(label: string): number {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

/** 1..5 estimate as pips — value round, effort square, to tell them apart. */
function Pips(props: { kind: "value" | "effort"; count: number }) {
  return (
    <span
      role="img"
      aria-label={`${props.kind} ${props.count} of 5`}
      className="flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "size-1",
            props.kind === "value" ? "rounded-full" : "rounded-[1px]",
            i <= props.count ? "bg-muted-foreground" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

/* c8 ignore start -- composition line: presenter × hook, covered by board.test */
export function TaskCard(props: OuterProps) {
  return <TaskCardComponent {...useTaskCard(props)} />;
}
/* c8 ignore stop */
