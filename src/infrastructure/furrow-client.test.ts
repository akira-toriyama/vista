import { describe, expect, it } from "vitest";
import { FurrowError } from "@/application/furrow-error";
import type { ExecResult, FurrowExec } from "./exec";
import { createFurrowClient } from "./furrow-client";

const ok = (value: unknown): ExecResult => ({
  code: 0,
  stdout: JSON.stringify(value),
  stderr: "",
});

/** Fake exec that records args and replays canned results. */
function fakeExec(result: ExecResult) {
  const calls: string[][] = [];
  const exec: FurrowExec = (args) => {
    calls.push(args);
    return Promise.resolve(result);
  };
  return { calls, exec };
}

async function thrown(p: Promise<unknown>): Promise<FurrowError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(FurrowError);
    return e as FurrowError;
  }
  throw new Error("expected rejection");
}

describe("createFurrowClient reads", () => {
  it("listTasks runs `ls --json` and returns the parsed rows", async () => {
    const rows = [{ id: "t-a" }, { id: "t-b" }];
    const { calls, exec } = fakeExec(ok(rows));
    const tasks = await createFurrowClient(exec).listTasks();
    expect(calls).toEqual([["ls", "--json"]]);
    expect(tasks.map((t) => t.id)).toEqual(["t-a", "t-b"]);
  });

  it("listTasks maps filters onto -s/-l/-r with comma = OR", async () => {
    const { calls, exec } = fakeExec(ok([]));
    await createFurrowClient(exec).listTasks({
      lanes: ["ready", "in-progress"],
      labels: ["bug"],
      repos: ["o/r1", "o/r2"],
    });
    expect(calls).toEqual([
      [
        "ls",
        "--json",
        "-s",
        "ready,in-progress",
        "-l",
        "bug",
        "-r",
        "o/r1,o/r2",
      ],
    ]);
  });

  it("showTask runs `show <id> --json`", async () => {
    const { calls, exec } = fakeExec(ok({ id: "t-a", body_text: "# t" }));
    const task = await createFurrowClient(exec).showTask("t-a");
    expect(calls).toEqual([["show", "t-a", "--json"]]);
    expect(task.body_text).toBe("# t");
  });

  it("board runs `board --json`", async () => {
    const { calls, exec } = fakeExec(ok({ writable: true, lanes: ["inbox"] }));
    const board = await createFurrowClient(exec).board();
    expect(calls).toEqual([["board", "--json"]]);
    expect(board.writable).toBe(true);
  });

  it("listDeps runs `dep <id> --list --json`", async () => {
    const { calls, exec } = fakeExec(
      ok({ id: "t-a", depends_on: [], blocks: [] }),
    );
    await createFurrowClient(exec).listDeps("t-a");
    expect(calls).toEqual([["dep", "t-a", "--list", "--json"]]);
  });
});

describe("createFurrowClient mutations", () => {
  const shard = ok({ id: "t-a" });

  it("addTask maps every input onto add flags", async () => {
    const { calls, exec } = fakeExec(shard);
    await createFurrowClient(exec).addTask({
      title: "new task",
      status: "ready",
      priority: 150,
      value: 4,
      effort: 2,
      labels: ["bug", "ui"],
      repos: ["o/r"],
      deps: ["t-x"],
      parent: "t-p",
      body: "# body",
      checklist: ["step one"],
      type: "epic",
    });
    expect(calls).toEqual([
      [
        "add",
        "new task",
        "--json",
        "-s",
        "ready",
        "-p",
        "150",
        "--value",
        "4",
        "--effort",
        "2",
        "-l",
        "bug",
        "-l",
        "ui",
        "-r",
        "o/r",
        "--dep",
        "t-x",
        "--parent",
        "t-p",
        "--body",
        "# body",
        "--check",
        "step one",
        "--type",
        "epic",
      ],
    ]);
  });

  it("addTask with draft passes --draft and no -r", async () => {
    const { calls, exec } = fakeExec(shard);
    await createFurrowClient(exec).addTask({ title: "d", draft: true });
    expect(calls).toEqual([["add", "d", "--json", "--draft"]]);
  });

  it("moveTask runs `move <id> <lane> --json`", async () => {
    const { calls, exec } = fakeExec(shard);
    await createFurrowClient(exec).moveTask("t-a", "done");
    expect(calls).toEqual([["move", "t-a", "done", "--json"]]);
  });

  it("setTask maps the patch onto one `set` write, null = clear", async () => {
    const { calls, exec } = fakeExec(shard);
    await createFurrowClient(exec).setTask("t-a", {
      status: "ready",
      value: 4,
      effort: null,
      addLabels: ["bug"],
      removeLabels: ["wip"],
    });
    expect(calls).toEqual([
      [
        "set",
        "t-a",
        "--json",
        "-s",
        "ready",
        "--value",
        "4",
        "--clear-effort",
        "--add-label",
        "bug",
        "--rm-label",
        "wip",
      ],
    ]);
  });

  it("setTask maps placement onto --before/--after/-p in the same write", async () => {
    const { calls, exec } = fakeExec(shard);
    const client = createFurrowClient(exec);
    await client.setTask("t-a", {
      status: "ready",
      placement: { before: "t-x" },
    });
    await client.setTask("t-a", { placement: { after: "t-y" } });
    await client.setTask("t-a", { placement: { priority: 150 } });
    expect(calls).toEqual([
      ["set", "t-a", "--json", "-s", "ready", "--before", "t-x"],
      ["set", "t-a", "--json", "--after", "t-y"],
      ["set", "t-a", "--json", "-p", "150"],
    ]);
  });

  it("reorderTask slots relative to a sibling or at an absolute priority", async () => {
    const { calls, exec } = fakeExec(shard);
    const client = createFurrowClient(exec);
    await client.reorderTask("t-a", { before: "t-x" });
    await client.reorderTask("t-a", { after: "t-y" });
    await client.reorderTask("t-a", { priority: 90 });
    expect(calls).toEqual([
      ["reorder", "t-a", "--json", "--before", "t-x"],
      ["reorder", "t-a", "--json", "--after", "t-y"],
      ["reorder", "t-a", "90", "--json"],
    ]);
  });

  it("doneTask / retitleTask build their commands", async () => {
    const { calls, exec } = fakeExec(shard);
    const client = createFurrowClient(exec);
    await client.doneTask("t-a");
    await client.retitleTask("t-a", "new title");
    expect(calls).toEqual([
      ["done", "t-a", "--json"],
      ["retitle", "t-a", "new title", "--json"],
    ]);
  });

  it("setChecklistItem toggles by index, --off to uncheck", async () => {
    const { calls, exec } = fakeExec(shard);
    const client = createFurrowClient(exec);
    await client.setChecklistItem("t-a", 0, true);
    await client.setChecklistItem("t-a", 2, false);
    expect(calls).toEqual([
      ["check", "t-a", "0", "--json"],
      ["check", "t-a", "2", "--off", "--json"],
    ]);
  });

  it("addDeps / removeDeps batch dep ids into one write", async () => {
    const { calls, exec } = fakeExec(shard);
    const client = createFurrowClient(exec);
    await client.addDeps("t-a", ["t-x", "t-y"]);
    await client.removeDeps("t-a", ["t-x"]);
    expect(calls).toEqual([
      ["dep", "t-a", "t-x", "t-y", "--json"],
      ["dep", "t-a", "t-x", "--rm", "--json"],
    ]);
  });
});

describe("createFurrowClient error mapping", () => {
  const envelope = (
    code: number,
    message: string,
    extra: object = {},
  ): ExecResult => ({
    code,
    stdout: "",
    stderr: JSON.stringify({ error: { code, message, ...extra } }),
  });

  it("exit 1 → kind not-found, envelope preserved", async () => {
    const { exec } = fakeExec(
      envelope(1, "task not found: t-x", { details: { missing: ["t-x"] } }),
    );
    const err = await thrown(createFurrowClient(exec).showTask("t-x"));
    expect(err.kind).toBe("not-found");
    expect(err.exitCode).toBe(1);
    expect(err.message).toBe("task not found: t-x");
    expect(err.envelope?.details).toEqual({ missing: ["t-x"] });
  });

  it("exit 2 → kind validation", async () => {
    const { exec } = fakeExec(envelope(2, "unknown lane: nope"));
    const err = await thrown(createFurrowClient(exec).moveTask("t-a", "nope"));
    expect(err.kind).toBe("validation");
  });

  it("exit 3+ → kind internal", async () => {
    const { exec } = fakeExec(envelope(3, "boom"));
    const err = await thrown(createFurrowClient(exec).listTasks());
    expect(err.kind).toBe("internal");
  });

  it("non-JSON stderr still becomes a FurrowError carrying the raw text", async () => {
    const { exec } = fakeExec({
      code: 2,
      stdout: "",
      stderr: "plain panic text",
    });
    const err = await thrown(createFurrowClient(exec).listTasks());
    expect(err.kind).toBe("validation");
    expect(err.message).toContain("plain panic text");
    expect(err.envelope).toBeUndefined();
  });

  it("exit 0 with unparsable stdout → kind bad-output", async () => {
    const { exec } = fakeExec({ code: 0, stdout: "not json", stderr: "" });
    const err = await thrown(createFurrowClient(exec).listTasks());
    expect(err.kind).toBe("bad-output");
  });
});
