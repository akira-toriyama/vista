import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, it } from "vitest";
import { FurrowError } from "@/application/furrow-error";
import type { ExecResult } from "./exec";
import { createTauriFurrowAdapter } from "./tauri-furrow-adapter";

afterEach(() => {
  clearMocks();
});

const execOk = (value: unknown): ExecResult => ({
  code: 0,
  stdout: JSON.stringify(value),
  stderr: "",
});

describe("createTauriFurrowAdapter", () => {
  it("routes port calls through the furrow_exec command", async () => {
    const seen: string[][] = [];
    mockIPC((cmd, args) => {
      if (cmd === "furrow_exec") {
        const argv = (args as { args: string[] }).args;
        seen.push(argv);
        return execOk([{ id: "t-a" }]);
      }
      throw new Error(`unexpected command: ${cmd}`);
    });

    const tasks = await createTauriFurrowAdapter().listTasks({ lanes: ["ready"] });
    expect(seen).toEqual([["ls", "--json", "-s", "ready"]]);
    expect(tasks.map((t) => t.id)).toEqual(["t-a"]);
  });

  it("maps a Rust CoreError rejection to FurrowError kind core", async () => {
    mockIPC(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- simulates Tauri's plain-object CoreError rejection
      throw { code: "spawn-failed", message: "/no/such/furrow: not found" };
    });

    const err = await createTauriFurrowAdapter()
      .board()
      .then(() => {
        throw new Error("expected rejection");
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FurrowError);
    expect((err as FurrowError).kind).toBe("core");
    expect((err as FurrowError).coreCode).toBe("spawn-failed");
    expect((err as FurrowError).message).toContain("not found");
  });

  it("starts the Rust watcher and listens for tasks://changed", async () => {
    const invoked: string[] = [];
    let handlerId: number | undefined;
    mockIPC((cmd, args) => {
      invoked.push(cmd);
      if (cmd === "watch_start") return true;
      if (cmd === "plugin:event|listen") {
        handlerId = (args as { handler: number }).handler;
        return 1;
      }
      if (cmd === "plugin:event|unlisten") return null;
      throw new Error(`unexpected command: ${cmd}`);
    });

    const changes: number[] = [];
    const unsubscribe = createTauriFurrowAdapter().subscribeTasksChanged(() => changes.push(1));

    await Promise.resolve(); // let the async listen registration settle
    expect(invoked).toContain("watch_start");
    expect(invoked).toContain("plugin:event|listen");
    expect(handlerId).toBeDefined();

    // fire the captured Tauri event callback (mockIPC exposes runCallback)
    const internals = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ as {
      runCallback: (id: number, data: unknown) => void;
    };
    internals.runCallback(handlerId!, { event: "tasks://changed", id: 1, payload: null });
    expect(changes).toHaveLength(1);

    unsubscribe();
  });
});
