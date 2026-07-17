import { act, renderHook, waitFor } from "@testing-library/react";
import { Suspense, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Task } from "@/domain/task";
import type { FurrowPort } from "./furrow-port";
import { FurrowPortProvider } from "./FurrowPortContext";
import {
  useBoardInfo,
  useDropTask,
  useMoveTask,
  useTaskDetail,
  useTaskList,
  useTasksChangedInvalidation,
} from "./hooks";
import { createQueryClient } from "./query-client";
import { QueryClientProvider } from "@tanstack/react-query";

const row = (id: string, status = "inbox"): Task => ({
  id,
  title: id,
  status,
  priority: 100,
  labels: [],
  repos: [],
  deps: [],
  refs: [],
  checklist: [],
  created: "2026-07-16T00:00:00Z",
  updated: "2026-07-16T00:00:00Z",
  closed: null,
  reviewed: null,
  body: `bodies/${id}.md`,
  actionable: false,
  blocked_by: [],
  container: false,
  stuck: false,
});

const report = (t: Task) => ({ after: t, before: t, changed: [] });

/** In-memory FurrowPort: enough state for list/show/move + change events. */
function fakePort() {
  const tasks = new Map<string, Task>([["t-a", row("t-a")]]);
  const listeners = new Set<() => void>();
  let unsubscribed = 0;
  const port: FurrowPort = {
    board: () =>
      Promise.resolve({ writable: true, lanes: ["inbox", "done"] } as never),
    listTasks: () => Promise.resolve([...tasks.values()]),
    showTask: (id) =>
      Promise.resolve({ ...tasks.get(id)!, body_text: `# ${id}` }),
    addTask: (input) => {
      const t = row(`t-new`, input.status ?? "inbox");
      tasks.set(t.id, t);
      return Promise.resolve(t);
    },
    moveTask: (id, lane) => {
      const before = tasks.get(id)!;
      const after = { ...before, status: lane };
      tasks.set(id, after);
      return Promise.resolve({ after, before, changed: ["status"] });
    },
    setTask: (id) => Promise.resolve(report(tasks.get(id)!)),
    reorderTask: (id) => Promise.resolve(report(tasks.get(id)!)),
    doneTask: (id) => Promise.resolve(report(tasks.get(id)!)),
    retitleTask: (id) => Promise.resolve(report(tasks.get(id)!)),
    setChecklistItem: (id) => Promise.resolve(report(tasks.get(id)!)),
    addDeps: (id) => Promise.resolve(report(tasks.get(id)!)),
    removeDeps: (id) => Promise.resolve(report(tasks.get(id)!)),
    listDeps: (id) =>
      Promise.resolve({ id, title: id, depends_on: [], blocks: [] }),
    subscribeTasksChanged: (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        unsubscribed++;
      };
    },
  };
  return {
    port,
    fireChanged: () => {
      listeners.forEach((l) => {
        l();
      });
    },
    listenerCount: () => listeners.size,
    unsubscribedCount: () => unsubscribed,
  };
}

function wrapper(port: FurrowPort) {
  const queryClient = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <FurrowPortProvider port={port}>
        <Suspense fallback={null}>{children}</Suspense>
      </FurrowPortProvider>
    </QueryClientProvider>
  );
}

describe("query hooks", () => {
  it("useTaskList loads tasks through the port", async () => {
    const { port } = fakePort();
    const { result } = renderHook(() => useTaskList(), {
      wrapper: wrapper(port),
    });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data.map((t) => t.id)).toEqual(["t-a"]);
  });

  it("useTaskDetail loads one task with body_text", async () => {
    const { port } = fakePort();
    const { result } = renderHook(() => useTaskDetail("t-a"), {
      wrapper: wrapper(port),
    });
    await waitFor(() => {
      expect(result.current.data?.body_text).toBe("# t-a");
    });
  });

  it("useBoardInfo loads the board vocabulary", async () => {
    const { port } = fakePort();
    const { result } = renderHook(() => useBoardInfo(), {
      wrapper: wrapper(port),
    });
    await waitFor(() => {
      expect(result.current.data.writable).toBe(true);
    });
  });
});

describe("mutations", () => {
  it("useMoveTask writes through the port and refreshes the task list", async () => {
    const { port } = fakePort();
    const w = wrapper(port);
    const list = renderHook(() => useTaskList(), { wrapper: w });
    await waitFor(() => {
      expect(list.result.current.data).toBeDefined();
    });
    expect(list.result.current.data[0]?.status).toBe("inbox");

    const move = renderHook(() => useMoveTask(), { wrapper: w });
    await act(() =>
      move.result.current.mutateAsync({ id: "t-a", lane: "done" }),
    );
    await waitFor(() => {
      expect(list.result.current.data[0]?.status).toBe("done");
    });
  });
});

describe("useDropTask", () => {
  /** Board of three inbox cards + one done card, with recorded write calls. */
  function boardPort() {
    const fake = fakePort();
    const tasks = [
      { ...row("t-1"), priority: 100 },
      { ...row("t-2"), priority: 200 },
      { ...row("t-3"), priority: 300 },
      { ...row("t-d", "done"), priority: 100 },
    ];
    const writes: unknown[][] = [];
    const port: FurrowPort = {
      ...fake.port,
      listTasks: () => Promise.resolve(tasks),
      reorderTask: (...args) => {
        writes.push(["reorder", ...args]);
        return Promise.resolve(report(tasks[0]!));
      },
      setTask: (...args) => {
        writes.push(["set", ...args]);
        return Promise.resolve(report(tasks[0]!));
      },
      moveTask: (...args) => {
        writes.push(["move", ...args]);
        return Promise.resolve(report(tasks[0]!));
      },
    };
    return { port, writes };
  }

  it("reorder plan → one reorderTask write", async () => {
    const { port, writes } = boardPort();
    const w = wrapper(port);
    const drop = renderHook(() => useDropTask(), { wrapper: w });
    await act(() =>
      drop.result.current.mutateAsync({
        id: "t-1",
        targetLane: "inbox",
        plan: { kind: "reorder", placement: { after: "t-3" } },
      }),
    );
    expect(writes).toEqual([["reorder", "t-1", { after: "t-3" }]]);
  });

  it("move plan with placement → one setTask write carrying lane + position", async () => {
    const { port, writes } = boardPort();
    const drop = renderHook(() => useDropTask(), { wrapper: wrapper(port) });
    await act(() =>
      drop.result.current.mutateAsync({
        id: "t-d",
        targetLane: "inbox",
        plan: { kind: "move", placement: { before: "t-2" } },
      }),
    );
    expect(writes).toEqual([
      ["set", "t-d", { status: "inbox", placement: { before: "t-2" } }],
    ]);
  });

  it("move plan without placement (empty column) → moveTask", async () => {
    const { port, writes } = boardPort();
    const drop = renderHook(() => useDropTask(), { wrapper: wrapper(port) });
    await act(() =>
      drop.result.current.mutateAsync({
        id: "t-1",
        targetLane: "done",
        plan: { kind: "move" },
      }),
    );
    expect(writes).toEqual([["move", "t-1", "done"]]);
  });

  it("applies the new order to the list cache before the write resolves", async () => {
    const { port } = boardPort();
    // hold the write open so only the optimistic update can reorder the list
    port.reorderTask = () => new Promise<never>(() => {});
    const w = wrapper(port);
    const list = renderHook(() => useTaskList(), { wrapper: w });
    await waitFor(() => {
      expect(list.result.current.data).toBeDefined();
    });

    const drop = renderHook(() => useDropTask(), { wrapper: w });
    act(() => {
      drop.result.current.mutate({
        id: "t-1",
        targetLane: "inbox",
        plan: { kind: "reorder", placement: { after: "t-3" } },
      });
    });
    await waitFor(() => {
      const inbox = list.result.current.data
        .filter((t) => t.status === "inbox")
        .sort((a, b) => a.priority - b.priority);
      expect(inbox.map((t) => t.id)).toEqual(["t-2", "t-3", "t-1"]);
    });
  });

  it("writes even when no list query has populated the cache yet", async () => {
    const { port, writes } = boardPort();
    const drop = renderHook(() => useDropTask(), { wrapper: wrapper(port) });
    await act(() =>
      drop.result.current.mutateAsync({
        id: "t-1",
        targetLane: "inbox",
        plan: { kind: "reorder", placement: { after: "t-3" } },
      }),
    );
    expect(writes).toEqual([["reorder", "t-1", { after: "t-3" }]]);
  });

  it("a failing write with no cache snapshot has nothing to roll back", async () => {
    const { port } = boardPort();
    port.reorderTask = () => Promise.reject(new Error("boom"));
    const drop = renderHook(() => useDropTask(), { wrapper: wrapper(port) });
    act(() => {
      drop.result.current.mutate({
        id: "t-1",
        targetLane: "inbox",
        plan: { kind: "reorder", placement: { after: "t-3" } },
      });
    });
    await waitFor(() => {
      expect(drop.result.current.isError).toBe(true);
    });
  });

  it("rolls the cache back when the write fails", async () => {
    const { port } = boardPort();
    port.reorderTask = () => Promise.reject(new Error("boom"));
    const w = wrapper(port);
    const list = renderHook(() => useTaskList(), { wrapper: w });
    await waitFor(() => {
      expect(list.result.current.data).toBeDefined();
    });
    const originalOrder = list.result.current.data.map((t) => t.id);

    const drop = renderHook(() => useDropTask(), { wrapper: w });
    act(() => {
      drop.result.current.mutate({
        id: "t-1",
        targetLane: "inbox",
        plan: { kind: "reorder", placement: { after: "t-3" } },
      });
    });
    await waitFor(() => {
      expect(drop.result.current.isError).toBe(true);
    });
    await waitFor(() => {
      expect(list.result.current.data.map((t) => t.id)).toEqual(originalOrder);
    });
  });
});

describe("useTasksChangedInvalidation", () => {
  it("refetches queries when the port reports a .furrow change", async () => {
    const fake = fakePort();
    const w = wrapper(fake.port);
    renderHook(
      () => {
        useTasksChangedInvalidation();
      },
      { wrapper: w },
    );
    const list = renderHook(() => useTaskList(), { wrapper: w });
    await waitFor(() => {
      expect(list.result.current.data).toBeDefined();
    });
    expect(list.result.current.data).toHaveLength(1);

    // Claude Code edits the board from the CLI → watcher fires
    await fake.port.addTask({ title: "outside edit" });
    act(() => {
      fake.fireChanged();
    });
    await waitFor(() => {
      expect(list.result.current.data).toHaveLength(2);
    });
  });

  it("unsubscribes on unmount", () => {
    const fake = fakePort();
    const hook = renderHook(
      () => {
        useTasksChangedInvalidation();
      },
      { wrapper: wrapper(fake.port) },
    );
    hook.rerender(); // memo-hit path: the subscription must not re-register
    expect(fake.listenerCount()).toBe(1);
    hook.unmount();
    expect(fake.listenerCount()).toBe(0);
    expect(fake.unsubscribedCount()).toBe(1);
  });
});
