import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Task } from "@/domain/task";
import type { FurrowPort } from "./furrow-port";
import { FurrowPortProvider } from "./furrow-port-context";
import {
  useBoardInfo,
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
    board: () => Promise.resolve({ writable: true, lanes: ["inbox", "done"] } as never),
    listTasks: () => Promise.resolve([...tasks.values()]),
    showTask: (id) => Promise.resolve({ ...tasks.get(id)!, body_text: `# ${id}` }),
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
    doneTask: (id) => Promise.resolve(report(tasks.get(id)!)),
    retitleTask: (id) => Promise.resolve(report(tasks.get(id)!)),
    setChecklistItem: (id) => Promise.resolve(report(tasks.get(id)!)),
    addDeps: (id) => Promise.resolve(report(tasks.get(id)!)),
    removeDeps: (id) => Promise.resolve(report(tasks.get(id)!)),
    listDeps: (id) => Promise.resolve({ id, title: id, depends_on: [], blocks: [] }),
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
    fireChanged: () => listeners.forEach((l) => l()),
    listenerCount: () => listeners.size,
    unsubscribedCount: () => unsubscribed,
  };
}

function wrapper(port: FurrowPort) {
  const queryClient = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <FurrowPortProvider port={port}>{children}</FurrowPortProvider>
    </QueryClientProvider>
  );
}

describe("query hooks", () => {
  it("useTaskList loads tasks through the port", async () => {
    const { port } = fakePort();
    const { result } = renderHook(() => useTaskList(), { wrapper: wrapper(port) });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.map((t) => t.id)).toEqual(["t-a"]);
  });

  it("useTaskDetail loads one task with body_text", async () => {
    const { port } = fakePort();
    const { result } = renderHook(() => useTaskDetail("t-a"), { wrapper: wrapper(port) });
    await waitFor(() => expect(result.current.data?.body_text).toBe("# t-a"));
  });

  it("useBoardInfo loads the board vocabulary", async () => {
    const { port } = fakePort();
    const { result } = renderHook(() => useBoardInfo(), { wrapper: wrapper(port) });
    await waitFor(() => expect(result.current.data?.writable).toBe(true));
  });
});

describe("mutations", () => {
  it("useMoveTask writes through the port and refreshes the task list", async () => {
    const { port } = fakePort();
    const w = wrapper(port);
    const list = renderHook(() => useTaskList(), { wrapper: w });
    await waitFor(() => expect(list.result.current.data).toBeDefined());
    expect(list.result.current.data?.[0]?.status).toBe("inbox");

    const move = renderHook(() => useMoveTask(), { wrapper: w });
    await act(() => move.result.current.mutateAsync({ id: "t-a", lane: "done" }));
    await waitFor(() => expect(list.result.current.data?.[0]?.status).toBe("done"));
  });
});

describe("useTasksChangedInvalidation", () => {
  it("refetches queries when the port reports a .furrow change", async () => {
    const fake = fakePort();
    const w = wrapper(fake.port);
    renderHook(() => useTasksChangedInvalidation(), { wrapper: w });
    const list = renderHook(() => useTaskList(), { wrapper: w });
    await waitFor(() => expect(list.result.current.data).toBeDefined());
    expect(list.result.current.data).toHaveLength(1);

    // Claude Code edits the board from the CLI → watcher fires
    await fake.port.addTask({ title: "outside edit" });
    act(() => fake.fireChanged());
    await waitFor(() => expect(list.result.current.data).toHaveLength(2));
  });

  it("unsubscribes on unmount", async () => {
    const fake = fakePort();
    const hook = renderHook(() => useTasksChangedInvalidation(), { wrapper: wrapper(fake.port) });
    expect(fake.listenerCount()).toBe(1);
    hook.unmount();
    expect(fake.listenerCount()).toBe(0);
    expect(fake.unsubscribedCount()).toBe(1);
  });
});
