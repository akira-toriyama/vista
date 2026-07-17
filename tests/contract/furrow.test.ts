/**
 * Contract tests: the exact adapter core the app ships (createFurrowClient)
 * driven against the REAL furrow binary on a throwaway board — no Tauri, no
 * mocks. This is what keeps vista's JSON contract honest when furrow moves.
 * Skipped when furrow is not on PATH so CI without furrow stays green.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FurrowError } from "@/application/furrow-error";
import type { ExecResult, FurrowExec } from "@/infrastructure/exec";
import { createFurrowClient, type FurrowClient } from "@/infrastructure/furrow-client";

const run = promisify(execFile);

const furrowAvailable = await run("furrow", ["--version"]).then(
  () => true,
  () => false,
);

/** child_process stand-in for the Rust exec bridge (same ExecResult shape). */
function makeExec(cwd: string): FurrowExec {
  return (args) =>
    new Promise<ExecResult>((resolve, reject) => {
      execFile("furrow", args, { cwd }, (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") {
          // spawn failure (ENOENT…), not a furrow exit code. A real Error at
          // runtime — @types/node's Omit<ErrnoException> hides the parentage.
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
          return;
        }
        resolve({ code: error ? (error.code as number) : 0, stdout, stderr });
      });
    });
}

async function vendoredSchema(): Promise<{ required: string[] } & Record<string, unknown>> {
  const path = new URL("../../src/domain/generated/furrow.task.schema.json", import.meta.url);
  return JSON.parse(await readFile(path, "utf8")) as { required: string[] } & Record<
    string,
    unknown
  >;
}

describe.skipIf(!furrowAvailable)("furrow contract", () => {
  let boardDir: string;
  let client: FurrowClient;

  beforeAll(async () => {
    boardDir = await mkdtemp(join(tmpdir(), "vista-contract-"));
    await run("furrow", ["init"], { cwd: boardDir });
    client = createFurrowClient(makeExec(boardDir));
  });

  afterAll(async () => {
    await rm(boardDir, { recursive: true, force: true });
  });

  it("--version exits 0 and identifies itself", async () => {
    const { stdout } = await run("furrow", ["--version"]);
    expect(stdout).toMatch(/^furrow /);
  });

  it("board() reports a writable, current-schema board with lanes", async () => {
    const board = await client.board();
    expect(board.writable).toBe(true);
    expect(board.schema_state).toBe("current");
    expect(board.lanes.length).toBeGreaterThan(0);
    expect(board.lanes).toContain(board.default_lane);
    expect(board.lanes).toContain(board.done_lane);
  });

  it("the live `furrow schema task` matches the vendored codegen snapshot", async () => {
    const { stdout } = await run("furrow", ["schema", "task"]);
    // drift here means the generated Task type no longer matches furrow —
    // regenerate with: pnpm codegen (and review the type diff)
    expect(JSON.parse(stdout)).toEqual(await vendoredSchema());
  });

  it("addTask round-trips every field through the real binary", async () => {
    const board = await client.board();
    const lane = board.lanes.find((l) => l !== board.default_lane)!;
    const added = await client.addTask({
      title: "contract: full add",
      status: lane,
      value: 4,
      effort: 2,
      labels: ["bug", "ui"],
      body: "# contract body",
      checklist: ["step one", "step two"],
    });
    expect(added.id).toMatch(/^t-/);
    expect(added.status).toBe(lane);
    expect(added.value).toBe(4);
    expect(added.effort).toBe(2);
    expect(added.labels).toEqual(["bug", "ui"]);
    expect(added.checklist).toEqual([
      { text: "step one", done: false },
      { text: "step two", done: false },
    ]);
  });

  it("listTasks returns rows carrying furrow's computed board flags", async () => {
    const added = await client.addTask({ title: "contract: list me" });
    const tasks = await client.listTasks();
    const row = tasks.find((t) => t.id === added.id);
    expect(row).toBeDefined();
    expect(typeof row!.actionable).toBe("boolean");
    expect(Array.isArray(row!.blocked_by)).toBe(true);
    expect(typeof row!.container).toBe("boolean");
    expect(typeof row!.stuck).toBe("boolean");
  });

  it("listTasks lane filter narrows to that lane only", async () => {
    const board = await client.board();
    const lane = board.lanes.find((l) => l !== board.default_lane && l !== board.done_lane)!;
    const added = await client.addTask({ title: "contract: filtered", status: lane });
    const filtered = await client.listTasks({ lanes: [lane] });
    expect(filtered.some((t) => t.id === added.id)).toBe(true);
    expect(filtered.every((t) => t.status === lane)).toBe(true);
  });

  it("every listTasks row satisfies the schema's required fields", async () => {
    const { required } = await vendoredSchema();
    const tasks = await client.listTasks();
    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) {
      for (const key of required) {
        expect(task, `${task.id} is missing required field ${key}`).toHaveProperty(key);
      }
    }
  });

  it("showTask resolves the body markdown", async () => {
    const added = await client.addTask({ title: "contract: show", body: "# hello body" });
    const detail = await client.showTask(added.id);
    expect(detail.id).toBe(added.id);
    expect(detail.body_text).toContain("hello body");
  });

  it("moveTask / doneTask report before/after and stamp closed", async () => {
    const board = await client.board();
    const added = await client.addTask({ title: "contract: move" });
    const lane = board.lanes.find((l) => l !== board.default_lane && l !== board.done_lane)!;
    const moved = await client.moveTask(added.id, lane);
    expect(moved.before.status).toBe(board.default_lane);
    expect(moved.after.status).toBe(lane);
    expect(moved.changed).toContain("status");
    expect(moved.after.closed).toBeNull();
    const done = await client.doneTask(added.id);
    expect(done.after.status).toBe(board.done_lane);
    expect(done.after.closed).not.toBeNull();
  });

  it("setTask applies lane+estimates+labels in one write, null clears", async () => {
    const board = await client.board();
    const lane = board.lanes.find((l) => l !== board.default_lane)!;
    const added = await client.addTask({ title: "contract: set", labels: ["wip"] });
    const set = await client.setTask(added.id, {
      status: lane,
      value: 5,
      addLabels: ["bug"],
      removeLabels: ["wip"],
    });
    expect(set.after.status).toBe(lane);
    expect(set.after.value).toBe(5);
    expect(set.after.labels).toEqual(["bug"]);
    const cleared = await client.setTask(added.id, { value: null });
    expect(cleared.after.value).toBeUndefined();
  });

  it("reorderTask --before/--after slots the task between its lane siblings", async () => {
    const top = await client.addTask({ title: "contract: reorder top", priority: 100 });
    const bottom = await client.addTask({ title: "contract: reorder bottom", priority: 200 });
    const moved = await client.addTask({ title: "contract: reorder me", priority: 300 });

    const before = await client.reorderTask(moved.id, { before: bottom.id });
    expect(before.changed).toContain("priority");
    expect(before.after.priority).toBeGreaterThan(top.priority);
    expect(before.after.priority).toBeLessThan(bottom.priority);

    const after = await client.reorderTask(moved.id, { after: bottom.id });
    expect(after.after.priority).toBeGreaterThan(bottom.priority);
  });

  it("reorderTask respaces an exhausted gap atomically and reports renumbered", async () => {
    const first = await client.addTask({ title: "contract: gap a", priority: 1000 });
    await client.addTask({ title: "contract: gap b", priority: 1001 });
    const squeezed = await client.addTask({ title: "contract: gap squeeze", priority: 2000 });
    const report = await client.reorderTask(squeezed.id, { after: first.id });
    expect(report.renumbered).toBeDefined();
    expect(report.renumbered!.length).toBeGreaterThan(0);
    for (const move of report.renumbered!) {
      expect(move.id).toMatch(/^t-/);
      expect(typeof move.from).toBe("number");
      expect(typeof move.to).toBe("number");
    }
  });

  it("setTask lands lane + relative position in one write (cross-lane drop)", async () => {
    const board = await client.board();
    const lane = board.lanes.find((l) => l !== board.default_lane && l !== board.done_lane)!;
    const anchor = await client.addTask({ title: "contract: drop anchor", status: lane });
    const dropped = await client.addTask({ title: "contract: dropped card" });
    const report = await client.setTask(dropped.id, {
      status: lane,
      placement: { before: anchor.id },
    });
    expect(report.after.status).toBe(lane);
    expect(report.after.priority).toBeLessThan(anchor.priority);
    expect(report.changed).toEqual(expect.arrayContaining(["status", "priority"]));
  });

  it("reorderTask across lanes is refused as validation", async () => {
    const board = await client.board();
    const lane = board.lanes.find((l) => l !== board.default_lane && l !== board.done_lane)!;
    const here = await client.addTask({ title: "contract: reorder here" });
    const there = await client.addTask({ title: "contract: reorder there", status: lane });
    const err = await client.reorderTask(here.id, { before: there.id }).then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FurrowError);
    expect((err as FurrowError).kind).toBe("validation");
  });

  it("retitleTask renames without touching the id", async () => {
    const added = await client.addTask({ title: "contract: old title" });
    const renamed = await client.retitleTask(added.id, "contract: new title");
    expect(renamed.after.id).toBe(added.id);
    expect(renamed.after.title).toBe("contract: new title");
    expect(renamed.before.title).toBe("contract: old title");
  });

  it("setChecklistItem toggles one item by index", async () => {
    const added = await client.addTask({ title: "contract: check", checklist: ["a", "b"] });
    const checked = await client.setChecklistItem(added.id, 1, true);
    expect(checked.after.checklist).toEqual([
      { text: "a", done: false },
      { text: "b", done: true },
    ]);
    const unchecked = await client.setChecklistItem(added.id, 1, false);
    expect(unchecked.after.checklist[1]?.done).toBe(false);
  });

  it("addDeps / listDeps / removeDeps round-trip both directions", async () => {
    const dep = await client.addTask({ title: "contract: the dep" });
    const dependent = await client.addTask({ title: "contract: the dependent" });
    const updated = await client.addDeps(dependent.id, [dep.id]);
    expect(updated.after.deps).toContain(dep.id);

    const fromDependent = await client.listDeps(dependent.id);
    expect(fromDependent.depends_on.map((d) => d.id)).toContain(dep.id);
    const fromDep = await client.listDeps(dep.id);
    expect(fromDep.blocks.map((d) => d.id)).toContain(dependent.id);

    const removed = await client.removeDeps(dependent.id, [dep.id]);
    expect(removed.after.deps).not.toContain(dep.id);
  });

  it("a dep on an open task marks the dependent blocked in listTasks", async () => {
    const dep = await client.addTask({ title: "contract: blocker" });
    const dependent = await client.addTask({ title: "contract: blocked", deps: [dep.id] });
    const tasks = await client.listTasks();
    const row = tasks.find((t) => t.id === dependent.id);
    expect(row?.blocked_by).toContain(dep.id);
  });

  it("unknown id → FurrowError kind not-found with the envelope", async () => {
    const err = await client.showTask("t-zzzzz").then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FurrowError);
    expect((err as FurrowError).kind).toBe("not-found");
    expect((err as FurrowError).exitCode).toBe(1);
    expect((err as FurrowError).envelope?.message).toContain("t-zzzzz");
  });

  it("unknown lane → FurrowError kind validation", async () => {
    const added = await client.addTask({ title: "contract: bad move" });
    const err = await client.moveTask(added.id, "no-such-lane").then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FurrowError);
    expect((err as FurrowError).kind).toBe("validation");
    expect((err as FurrowError).exitCode).toBe(2);
  });
});
