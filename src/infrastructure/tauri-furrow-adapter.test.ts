import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, it, vi } from "vitest";
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

    const tasks = await createTauriFurrowAdapter().listTasks({
      lanes: ["ready"],
    });
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

  it("a message-less rejection still becomes a readable core error", async () => {
    mockIPC(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- simulates a bare rejection value
      throw "furrow exploded";
    });

    const err = await createTauriFurrowAdapter()
      .board()
      .then(() => {
        throw new Error("expected rejection");
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FurrowError);
    expect((err as FurrowError).message).toBe("furrow exploded");
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
    const port = createTauriFurrowAdapter();
    const unsubscribe = port.subscribeTasksChanged(() => changes.push(1));

    await Promise.resolve(); // let the async listen registration settle
    expect(invoked).toContain("watch_start");
    expect(invoked).toContain("plugin:event|listen");
    expect(handlerId).toBeDefined();

    // fire the captured Tauri event callback (mockIPC exposes runCallback)
    const internals = (window as unknown as Record<string, unknown>)
      .__TAURI_INTERNALS__ as {
      runCallback: (id: number, data: unknown) => void;
    };
    internals.runCallback(handlerId!, {
      event: "tasks://changed",
      id: 1,
      payload: null,
    });
    expect(changes).toHaveLength(1);

    unsubscribe();

    // the Rust watcher starts once per adapter, not once per subscriber
    const unsubscribeAgain = port.subscribeTasksChanged(() => {});
    await Promise.resolve();
    expect(invoked.filter((c) => c === "watch_start")).toHaveLength(1);
    unsubscribeAgain();
  });

  it("a failed watch_start only degrades live refresh and is retried", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const watchAttempts: number[] = [];
    mockIPC((cmd) => {
      if (cmd === "watch_start") {
        watchAttempts.push(1);
        throw new Error("fs watcher exploded");
      }
      if (cmd === "plugin:event|listen") return 1;
      return null;
    });

    const port = createTauriFurrowAdapter();
    port.subscribeTasksChanged(() => {});
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledWith(
        "vista: watch_start failed — live refresh disabled",
        expect.any(Error),
      );
    });

    // the failure reset the flag, so the next subscriber retries the watcher
    port.subscribeTasksChanged(() => {});
    expect(watchAttempts).toHaveLength(2);
    error.mockRestore();
  });

  it("unsubscribing before listen resolves still unregisters the handler", async () => {
    const invoked: string[] = [];
    mockIPC((cmd) => {
      invoked.push(cmd);
      if (cmd === "watch_start") return true;
      if (cmd === "plugin:event|listen") return 1;
      if (cmd === "plugin:event|unlisten") return null;
      return null;
    });

    const unsubscribe = createTauriFurrowAdapter().subscribeTasksChanged(
      () => {},
    );
    unsubscribe(); // listen's promise has not settled yet
    await vi.waitFor(() => {
      expect(invoked).toContain("plugin:event|unlisten");
    });
  });

  it("a failed listen registration is logged, not thrown", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockIPC((cmd) => {
      if (cmd === "watch_start") return true;
      if (cmd === "plugin:event|listen") throw new Error("event bus down");
      return null;
    });

    createTauriFurrowAdapter().subscribeTasksChanged(() => {});
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledWith(
        "vista: tasks://changed listen failed",
        expect.any(Error),
      );
    });
    error.mockRestore();
  });
});
