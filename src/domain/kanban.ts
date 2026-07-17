import type { Lane } from "./task";

/**
 * Pure kanban logic for the Board view: grouping tasks into lane columns and
 * turning a drag-and-drop gesture into the single furrow write it maps to.
 * Framework-free — the UI layer feeds it data and executes the plan.
 */

/** The slice of a task the kanban logic reads. */
export interface KanbanCard {
  id: string;
  status: string;
  priority: number;
}

/** Slot immediately before/after a sibling — furrow computes the priority. */
export type RelativePlacement = { before: string } | { after: string };

/** Where a drag ended: on a card (with the nearest edge) or on the column body. */
export type DropTarget =
  { type: "card"; id: string; edge: "top" | "bottom" } | { type: "column" };

/**
 * The one write a drop maps to: same-lane → `reorder`, cross-lane → `move`
 * (a `set -s` when it carries a placement, so lane + position stay one write).
 * No placement only happens on a drop into an empty column.
 */
export type DropPlan =
  | { kind: "reorder"; placement: RelativePlacement }
  | { kind: "move"; placement?: RelativePlacement };

/**
 * Group tasks into board columns: one entry per lane in board order, each
 * column sorted by sparse priority ascending (lower = higher up), ties broken
 * by id. Tasks in a lane the board does not know are dropped.
 */
export function columnize<T extends KanbanCard>(params: {
  tasks: T[];
  lanes: Lane[];
}): Map<Lane, T[]> {
  const columns = new Map<Lane, T[]>(params.lanes.map((lane) => [lane, []]));
  for (const task of params.tasks) columns.get(task.status)?.push(task);
  for (const column of columns.values()) {
    column.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }
  return columns;
}

/** One lane's column: its tasks in board render order (see columnize). */
export function laneCards<T extends KanbanCard>(params: {
  tasks: T[];
  lane: Lane;
}): T[] {
  return params.tasks
    .filter((task) => task.status === params.lane)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export interface DropArgs<T extends KanbanCard> {
  draggedId: string;
  sourceLane: Lane;
  targetLane: Lane;
  /** the target lane's column in render order (includes the dragged card when same-lane). */
  targetCards: T[];
  target: DropTarget;
}

/** Turn a drop gesture into its furrow write, or null when nothing would change. */
export function planDrop<T extends KanbanCard>(
  args: DropArgs<T>,
): DropPlan | null {
  const sameLane = args.sourceLane === args.targetLane;

  let placement: RelativePlacement | undefined;
  if (args.target.type === "card") {
    if (args.target.id === args.draggedId) return null;
    placement =
      args.target.edge === "top"
        ? { before: args.target.id }
        : { after: args.target.id };
  } else {
    const last = args.targetCards[args.targetCards.length - 1];
    if (last === undefined) return sameLane ? null : { kind: "move" };
    if (last.id === args.draggedId) return null;
    placement = { after: last.id };
  }

  if (!sameLane) return { kind: "move", placement };

  // reordering next to an adjacent sibling lands where the card already is
  const anchorId = "before" in placement ? placement.before : placement.after;
  const anchorIndex = args.targetCards.findIndex((c) => c.id === anchorId);
  const draggedIndex = args.targetCards.findIndex(
    (c) => c.id === args.draggedId,
  );
  const noOpIndex = "before" in placement ? anchorIndex - 1 : anchorIndex + 1;
  if (draggedIndex !== -1 && draggedIndex === noOpIndex) return null;

  return { kind: "reorder", placement };
}

/**
 * A client-only stand-in priority that sorts the dragged card into its new
 * slot while the real write is in flight — fractional midpoints are fine here,
 * the refetch replaces them with furrow's canonical sparse integers.
 */
export function optimisticPriority(params: {
  cards: readonly KanbanCard[];
  placement: RelativePlacement;
  draggedId: string;
}): number {
  const others = params.cards.filter((c) => c.id !== params.draggedId);
  if (others.length === 0) return 0;

  const anchorId =
    "before" in params.placement
      ? params.placement.before
      : params.placement.after;
  const anchorIndex = others.findIndex((c) => c.id === anchorId);
  const anchor = others[anchorIndex];
  if (anchor === undefined)
    return Math.max(...others.map((c) => c.priority)) + 1;

  const neighbor =
    "before" in params.placement
      ? others[anchorIndex - 1]
      : others[anchorIndex + 1];
  if (neighbor === undefined) {
    return "before" in params.placement
      ? anchor.priority - 1
      : anchor.priority + 1;
  }
  return (anchor.priority + neighbor.priority) / 2;
}
