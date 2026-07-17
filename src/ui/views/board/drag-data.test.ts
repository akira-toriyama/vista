import { describe, expect, it } from "vitest";
import {
  cardDragData,
  columnDropData,
  dropTargetFrom,
  isCardDragData,
} from "./drag-data";

const top = () => "top" as const;

describe("isCardDragData", () => {
  it("accepts card payloads and rejects everything else", () => {
    expect(isCardDragData(cardDragData({ id: "t-1", lane: "ready" }))).toBe(
      true,
    );
    expect(isCardDragData(columnDropData("ready"))).toBe(false);
    expect(isCardDragData({})).toBe(false);
  });
});

describe("dropTargetFrom", () => {
  it("innermost card target wins over the column that contains it", () => {
    const resolved = dropTargetFrom({
      targets: [
        { data: cardDragData({ id: "t-2", lane: "ready" }) },
        { data: columnDropData("ready") },
      ],
      extractEdge: top,
    });
    expect(resolved).toEqual({
      lane: "ready",
      target: { type: "card", id: "t-2", edge: "top" },
    });
  });

  it("a bare column drop resolves to a column target", () => {
    expect(
      dropTargetFrom({
        targets: [{ data: columnDropData("done") }],
        extractEdge: top,
      }),
    ).toEqual({
      lane: "done",
      target: { type: "column" },
    });
  });

  it("returns null when no vista drop target participated", () => {
    expect(dropTargetFrom({ targets: [], extractEdge: top })).toBeNull();
    expect(
      dropTargetFrom({
        targets: [{ data: { anything: 1 } }],
        extractEdge: top,
      }),
    ).toBeNull();
  });

  it("falls back to the bottom edge when edge extraction yields nothing", () => {
    const resolved = dropTargetFrom({
      targets: [{ data: cardDragData({ id: "t-2", lane: "ready" }) }],
      extractEdge: () => null,
    });
    expect(resolved?.target).toEqual({
      type: "card",
      id: "t-2",
      edge: "bottom",
    });
  });
});
