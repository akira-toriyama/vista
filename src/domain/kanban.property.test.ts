import { fc, test } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import {
  columnize,
  optimisticPriority,
  planDrop,
  type DropTarget,
  type KanbanCard,
  type RelativePlacement,
} from "./kanban";

/**
 * Property-based tests for the drag-and-drop domain logic. The oracle below
 * derives the expected visual order straight from the gesture, independently
 * of planDrop's implementation — the properties then pin the contract:
 * a plan reproduces the gesture, and null means "nothing would move".
 */

/** A column in render order: unique ids, strictly increasing priorities. */
const columnArb = fc
  .uniqueArray(fc.nat(99), { minLength: 1, maxLength: 8 })
  .map((ns) =>
    ns.map((n, i) => ({ id: `t-${n}`, status: "l", priority: (i + 1) * 10 })),
  );

/** What order the user asked for by dropping `draggedId` on `target`. */
function orderAfterGesture(
  cards: readonly KanbanCard[],
  draggedId: string,
  target: DropTarget,
): string[] {
  const original = cards.map((c) => c.id);
  if (target.type === "card" && target.id === draggedId) return original;
  const ids = original.filter((id) => id !== draggedId);
  if (target.type === "card") {
    const at = ids.indexOf(target.id);
    ids.splice(target.edge === "top" ? at : at + 1, 0, draggedId);
  } else {
    ids.push(draggedId);
  }
  return ids;
}

/** What order a relative placement produces once applied. */
function orderAfterPlacement(
  cards: readonly KanbanCard[],
  draggedId: string,
  placement: RelativePlacement,
): string[] {
  const ids = cards.map((c) => c.id).filter((id) => id !== draggedId);
  const anchor = "before" in placement ? placement.before : placement.after;
  const at = ids.indexOf(anchor);
  ids.splice("before" in placement ? at : at + 1, 0, draggedId);
  return ids;
}

function pickTarget(
  cards: readonly KanbanCard[],
  targetIndex: number,
  onCard: boolean,
  topEdge: boolean,
): DropTarget {
  if (!onCard || cards.length === 0) return { type: "column" };
  const card = cards[targetIndex % cards.length]!;
  return { type: "card", id: card.id, edge: topEdge ? "top" : "bottom" };
}

describe("planDrop properties", () => {
  test.prop([columnArb, fc.nat(), fc.nat(), fc.boolean(), fc.boolean()])(
    "same-lane: null iff the order would not change, otherwise the plan reproduces the gesture",
    (cards, draggedIndex, targetIndex, onCard, topEdge) => {
      const dragged = cards[draggedIndex % cards.length]!;
      const target = pickTarget(cards, targetIndex, onCard, topEdge);
      const plan = planDrop({
        draggedId: dragged.id,
        sourceLane: "l",
        targetLane: "l",
        targetCards: cards,
        target,
      });
      const original = cards.map((c) => c.id);
      const expected = orderAfterGesture(cards, dragged.id, target);
      if (plan === null) {
        expect(expected).toEqual(original);
      } else {
        expect(expected).not.toEqual(original);
        expect(plan.kind).toBe("reorder");
        expect(plan.placement).toBeDefined();
        expect(orderAfterPlacement(cards, dragged.id, plan.placement!)).toEqual(
          expected,
        );
      }
    },
  );

  test.prop([
    fc.oneof(columnArb, fc.constant([] as KanbanCard[])),
    fc.nat(),
    fc.boolean(),
    fc.boolean(),
  ])(
    "cross-lane: always a move; placement reproduces the gesture and is absent only on an empty column",
    (cards, targetIndex, onCard, topEdge) => {
      const draggedId = "t-foreign";
      const target = pickTarget(cards, targetIndex, onCard, topEdge);
      const plan = planDrop({
        draggedId,
        sourceLane: "src",
        targetLane: "l",
        targetCards: cards,
        target,
      });
      expect(plan).not.toBeNull();
      expect(plan!.kind).toBe("move");
      if (cards.length === 0) {
        expect(plan!.placement).toBeUndefined();
      } else {
        expect(plan!.placement).toBeDefined();
        expect(orderAfterPlacement(cards, draggedId, plan!.placement!)).toEqual(
          orderAfterGesture(cards, draggedId, target),
        );
      }
    },
  );

  test.prop([columnArb, fc.nat(), fc.nat(), fc.boolean()])(
    "optimistic priority sorts the dragged card into the placement's slot",
    (cards, draggedIndex, anchorIndex, before) => {
      const dragged = cards[draggedIndex % cards.length]!;
      const others = cards.filter((c) => c.id !== dragged.id);
      fc.pre(others.length > 0);
      const anchor = others[anchorIndex % others.length]!;
      const placement: RelativePlacement = before
        ? { before: anchor.id }
        : { after: anchor.id };

      const priority = optimisticPriority({
        cards,
        placement,
        draggedId: dragged.id,
      });
      const resorted = [...others, { ...dragged, priority }].sort(
        (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
      );
      const draggedAt = resorted.findIndex((c) => c.id === dragged.id);
      const anchorAt = resorted.findIndex((c) => c.id === anchor.id);
      expect(draggedAt).toBe(before ? anchorAt - 1 : anchorAt + 1);
      // the others keep their relative order
      expect(resorted.filter((c) => c.id !== dragged.id)).toEqual(others);
    },
  );
});

describe("columnize properties", () => {
  const lanesArb = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 3 }), {
    minLength: 1,
    maxLength: 4,
  });
  const tasksArb = (lanes: string[]) =>
    fc.uniqueArray(fc.nat(99), { maxLength: 12 }).chain((ids) =>
      fc
        .tuple(
          ...ids.map(() =>
            fc.tuple(
              fc.integer({ min: -100, max: 100 }),
              fc.nat(lanes.length * 2 - 1),
            ),
          ),
        )
        .map((picks) =>
          ids.map((n, i) => ({
            id: `t-${n}`,
            // half the picks land outside the board's lanes on purpose
            status: picks[i]![1] < lanes.length ? lanes[picks[i]![1]]! : "??",
            priority: picks[i]![0],
          })),
        ),
    );

  test.prop([
    lanesArb.chain((lanes) => fc.tuple(fc.constant(lanes), tasksArb(lanes))),
  ])(
    "partitions tasks into their lanes, sorted by (priority, id); unknown lanes are dropped",
    ([lanes, tasks]) => {
      const columns = columnize({ tasks, lanes });
      expect([...columns.keys()]).toEqual(lanes);

      const seen: string[] = [];
      for (const lane of lanes) {
        const column = columns.get(lane)!;
        for (const card of column) expect(card.status).toBe(lane);
        const resorted = [...column].sort(
          (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
        );
        expect(column).toEqual(resorted);
        seen.push(...column.map((c) => c.id));
      }
      const expected = tasks
        .filter((t) => lanes.includes(t.status))
        .map((t) => t.id)
        .sort();
      expect([...seen].sort()).toEqual(expected);
    },
  );
});
