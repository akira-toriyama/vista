import { describe, expect, it } from "vitest";
import { buildDepGraph } from "./dep-graph";

const task = (id: string, deps: string[] = []) => ({ id, deps });

describe("buildDepGraph", () => {
  it("builds one edge per dep, pointing dep → dependent (left-to-right flow)", () => {
    const g = buildDepGraph([task("t-a"), task("t-b", ["t-a"])]);
    expect(g.edges).toEqual([{ from: "t-a", to: "t-b" }]);
  });

  it("keeps every input task as a node, even without edges", () => {
    const g = buildDepGraph([task("t-a"), task("t-b")]);
    expect(g.nodes.map((n) => n.id)).toEqual(["t-a", "t-b"]);
    expect(g.edges).toEqual([]);
  });

  it("reports deps outside the given set as dangling instead of edges", () => {
    const g = buildDepGraph([task("t-b", ["t-filtered-out"])]);
    expect(g.edges).toEqual([]);
    expect(g.dangling).toEqual([{ taskId: "t-b", depId: "t-filtered-out" }]);
  });

  it("preserves furrow's canonical input order in nodes and edges", () => {
    const g = buildDepGraph([
      task("t-c", ["t-a", "t-b"]),
      task("t-a"),
      task("t-b", ["t-a"]),
    ]);
    expect(g.nodes.map((n) => n.id)).toEqual(["t-c", "t-a", "t-b"]);
    expect(g.edges).toEqual([
      { from: "t-a", to: "t-c" },
      { from: "t-b", to: "t-c" },
      { from: "t-a", to: "t-b" },
    ]);
  });
});
