import { describe, expect, it } from "vitest";
import { columnize, laneCards, optimisticPriority, planDrop } from "./kanban";

/** Minimal card — kanban logic only reads id/status/priority. */
const card = (id: string, status: string, priority: number) => ({
  id,
  status,
  priority,
});

describe("columnize", () => {
  it("groups by lane in board order, each column sorted by priority ascending", () => {
    const tasks = [
      card("t-c", "ready", 300),
      card("t-a", "backlog", 100),
      card("t-b", "ready", 100),
    ];
    const columns = columnize(tasks, ["backlog", "ready"]);
    expect([...columns.keys()]).toEqual(["backlog", "ready"]);
    expect(columns.get("backlog")!.map((t) => t.id)).toEqual(["t-a"]);
    expect(columns.get("ready")!.map((t) => t.id)).toEqual(["t-b", "t-c"]);
  });

  it("keeps lanes with no tasks as empty columns", () => {
    const columns = columnize([card("t-a", "ready", 1)], ["backlog", "ready"]);
    expect(columns.get("backlog")).toEqual([]);
  });

  it("drops tasks whose status is not a board lane", () => {
    const columns = columnize([card("t-x", "no-such-lane", 1)], ["backlog"]);
    expect(columns.get("backlog")).toEqual([]);
  });

  it("breaks priority ties by id so order is deterministic", () => {
    const columns = columnize(
      [card("t-b", "ready", 100), card("t-a", "ready", 100)],
      ["ready"],
    );
    expect(columns.get("ready")!.map((t) => t.id)).toEqual(["t-a", "t-b"]);
  });
});

describe("laneCards", () => {
  it("picks one lane's tasks in render order, ties broken by id", () => {
    const tasks = [
      card("t-b", "ready", 100),
      card("t-a", "ready", 100),
      card("t-c", "backlog", 50),
      card("t-d", "ready", 20),
    ];
    expect(laneCards(tasks, "ready").map((t) => t.id)).toEqual([
      "t-d",
      "t-a",
      "t-b",
    ]);
  });
});

describe("planDrop", () => {
  const ready = [
    card("t-1", "ready", 100),
    card("t-2", "ready", 200),
    card("t-3", "ready", 300),
  ];

  it("same lane, top edge of a later card → reorder before it", () => {
    const plan = planDrop({
      draggedId: "t-1",
      sourceLane: "ready",
      targetLane: "ready",
      targetCards: ready,
      target: { type: "card", id: "t-3", edge: "top" },
    });
    expect(plan).toEqual({ kind: "reorder", placement: { before: "t-3" } });
  });

  it("same lane, bottom edge → reorder after the anchor", () => {
    const plan = planDrop({
      draggedId: "t-1",
      sourceLane: "ready",
      targetLane: "ready",
      targetCards: ready,
      target: { type: "card", id: "t-3", edge: "bottom" },
    });
    expect(plan).toEqual({ kind: "reorder", placement: { after: "t-3" } });
  });

  it("dropping a card onto itself is a no-op", () => {
    for (const edge of ["top", "bottom"] as const) {
      expect(
        planDrop({
          draggedId: "t-2",
          sourceLane: "ready",
          targetLane: "ready",
          targetCards: ready,
          target: { type: "card", id: "t-2", edge },
        }),
      ).toBeNull();
    }
  });

  it("dropping just above the next card or just below the previous card is a no-op", () => {
    expect(
      planDrop({
        draggedId: "t-2",
        sourceLane: "ready",
        targetLane: "ready",
        targetCards: ready,
        target: { type: "card", id: "t-3", edge: "top" },
      }),
    ).toBeNull();
    expect(
      planDrop({
        draggedId: "t-2",
        sourceLane: "ready",
        targetLane: "ready",
        targetCards: ready,
        target: { type: "card", id: "t-1", edge: "bottom" },
      }),
    ).toBeNull();
  });

  it("same lane, column target → reorder after the last card", () => {
    const plan = planDrop({
      draggedId: "t-1",
      sourceLane: "ready",
      targetLane: "ready",
      targetCards: ready,
      target: { type: "column" },
    });
    expect(plan).toEqual({ kind: "reorder", placement: { after: "t-3" } });
  });

  it("same lane, column target when already last → no-op", () => {
    expect(
      planDrop({
        draggedId: "t-3",
        sourceLane: "ready",
        targetLane: "ready",
        targetCards: ready,
        target: { type: "column" },
      }),
    ).toBeNull();
  });

  it("cross lane onto a card → move with the placement", () => {
    const plan = planDrop({
      draggedId: "t-x",
      sourceLane: "backlog",
      targetLane: "ready",
      targetCards: ready,
      target: { type: "card", id: "t-2", edge: "top" },
    });
    expect(plan).toEqual({ kind: "move", placement: { before: "t-2" } });
  });

  it("cross lane into an empty column → move without placement", () => {
    const plan = planDrop({
      draggedId: "t-x",
      sourceLane: "backlog",
      targetLane: "ready",
      targetCards: [],
      target: { type: "column" },
    });
    expect(plan).toEqual({ kind: "move" });
  });

  it("cross lane onto the column → move after the last card", () => {
    const plan = planDrop({
      draggedId: "t-x",
      sourceLane: "backlog",
      targetLane: "ready",
      targetCards: ready,
      target: { type: "column" },
    });
    expect(plan).toEqual({ kind: "move", placement: { after: "t-3" } });
  });
});

describe("planDrop degenerate inputs", () => {
  it("same-lane column drop with no cards → nothing to change", () => {
    const plan = planDrop({
      draggedId: "t-1",
      sourceLane: "ready",
      targetLane: "ready",
      targetCards: [],
      target: { type: "column" },
    });
    expect(plan).toBeNull();
  });
});

describe("optimisticPriority", () => {
  const cards = [
    card("t-1", "ready", 100),
    card("t-2", "ready", 200),
    card("t-3", "ready", 300),
  ];

  it("between two cards → midpoint of the anchor and its neighbor", () => {
    expect(optimisticPriority(cards, { before: "t-3" }, "t-x")).toBe(250);
    expect(optimisticPriority(cards, { after: "t-1" }, "t-x")).toBe(150);
  });

  it("before the first card / after the last card → just outside the range", () => {
    expect(optimisticPriority(cards, { before: "t-1" }, "t-x")).toBeLessThan(
      100,
    );
    expect(optimisticPriority(cards, { after: "t-3" }, "t-x")).toBeGreaterThan(
      300,
    );
  });

  it("ignores the dragged card when picking the neighbor (same-lane reorder)", () => {
    // t-1 dragged after t-2: neighbor above the slot is t-3, not the dragged t-1
    expect(optimisticPriority(cards, { after: "t-2" }, "t-1")).toBe(250);
  });

  it("unknown anchor falls back to keeping order stable at the end", () => {
    expect(
      optimisticPriority(cards, { before: "t-missing" }, "t-x"),
    ).toBeGreaterThan(300);
  });
});

describe("optimisticPriority degenerate inputs", () => {
  it("a column holding only the dragged card → 0", () => {
    expect(
      optimisticPriority([card("t-1", "ready", 100)], { after: "t-1" }, "t-1"),
    ).toBe(0);
  });
});
