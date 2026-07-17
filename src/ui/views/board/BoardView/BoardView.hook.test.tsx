import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Suspense, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FurrowPort } from "@/application/furrow-port";
import { makeBoardInfo, makeFurrowPort } from "@/application/furrow-port.mock";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import { createQueryClient } from "@/application/query-client";
import type { Task } from "@/domain/task";
import { makeTask } from "@/domain/task.mock";
import { cardDragData, columnDropData } from "../drag-data";
import { useBoardView } from "./BoardView.hook";

type DragData = Record<string | symbol, unknown>;

interface MonitorConfig {
  canMonitor: (args: { source: { data: DragData } }) => boolean;
  onDrop: (args: {
    source: { data: DragData };
    location: { current: { dropTargets: { data: DragData }[] } };
  }) => void;
}

const adapter = vi.hoisted(() => ({
  monitorForElements: vi.fn((_config: unknown) => () => {}),
}));
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => adapter);

const monitorConfig = () =>
  adapter.monitorForElements.mock.calls[0]![0] as MonitorConfig;

const report = (t: Task) => ({ after: t, before: t, changed: [] });

function setup(overrides: Partial<FurrowPort> = {}) {
  const tasks = [
    makeTask({ id: "t-1", status: "ready", priority: 100 }),
    makeTask({ id: "t-2", status: "ready", priority: 200 }),
    makeTask({ id: "t-3", status: "backlog", priority: 100 }),
  ];
  const port = makeFurrowPort({
    board: () => Promise.resolve(makeBoardInfo()),
    listTasks: () => Promise.resolve(tasks),
    reorderTask: vi.fn((id: string) =>
      Promise.resolve(report(makeTask({ id }))),
    ),
    moveTask: vi.fn((id: string) => Promise.resolve(report(makeTask({ id })))),
    setTask: vi.fn((id: string) => Promise.resolve(report(makeTask({ id })))),
    ...overrides,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <FurrowPortProvider port={port}>
        <Suspense fallback={null}>{children}</Suspense>
      </FurrowPortProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useBoardView(), { wrapper });
  const ready = () =>
    waitFor(() => {
      expect(hook.result.current).not.toBeNull();
    });
  return { hook, port, ready };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useBoardView", () => {
  it("exposes lanes, columnized tasks and writability", async () => {
    const { hook, ready } = setup();
    await ready();
    expect(hook.result.current.lanes).toEqual(["backlog", "ready", "done"]);
    expect(hook.result.current.columns.get("ready")!.map((t) => t.id)).toEqual([
      "t-1",
      "t-2",
    ]);
    expect(hook.result.current.readOnly).toBe(false);
  });

  it("read-only reflects the board's write guard", async () => {
    const { hook, ready } = setup({
      board: () => Promise.resolve(makeBoardInfo({ writable: false })),
    });
    await ready();
    expect(hook.result.current.readOnly).toBe(true);
  });

  it("display options start all-on and toggle per field", async () => {
    const { hook, ready } = setup();
    await ready();
    expect(hook.result.current.display.id).toBe(true);
    act(() => {
      hook.result.current.onToggleDisplay("id");
    });
    expect(hook.result.current.display.id).toBe(false);
    act(() => {
      hook.result.current.onToggleDisplay("id");
    });
    expect(hook.result.current.display.id).toBe(true);
  });

  it("an identical re-render does not re-register the drag monitor", async () => {
    const { hook, ready } = setup();
    await ready();
    hook.rerender();
    expect(adapter.monitorForElements).toHaveBeenCalledTimes(1);
  });

  it("monitors card drags only", async () => {
    const { ready } = setup();
    await ready();
    const { canMonitor } = monitorConfig();
    expect(canMonitor({ source: { data: cardDragData("t-1", "ready") } })).toBe(
      true,
    );
    expect(canMonitor({ source: { data: { kind: "text" } } })).toBe(false);
  });

  it("a drop on a sibling card lands as the planned reorder write", async () => {
    const { port, ready } = setup();
    await ready();
    monitorConfig().onDrop({
      source: { data: cardDragData("t-1", "ready") },
      location: {
        current: { dropTargets: [{ data: cardDragData("t-2", "ready") }] },
      },
    });
    await waitFor(() => {
      expect(port.reorderTask).toHaveBeenCalledWith("t-1", { after: "t-2" });
    });
  });

  it("a drop into an unknown empty column lands as a move write", async () => {
    const { port, ready } = setup();
    await ready();
    monitorConfig().onDrop({
      source: { data: cardDragData("t-1", "ready") },
      location: {
        current: { dropTargets: [{ data: columnDropData("triage") }] },
      },
    });
    await waitFor(() => {
      expect(port.moveTask).toHaveBeenCalledWith("t-1", "triage");
    });
  });

  it("ignores drops from foreign drags", async () => {
    const { port, ready } = setup();
    await ready();
    monitorConfig().onDrop({
      source: { data: { kind: "text" } },
      location: {
        current: { dropTargets: [{ data: cardDragData("t-2", "ready") }] },
      },
    });
    expect(port.reorderTask).not.toHaveBeenCalled();
    expect(port.moveTask).not.toHaveBeenCalled();
    expect(port.setTask).not.toHaveBeenCalled();
  });

  it("ignores drops that land on no target", async () => {
    const { port, ready } = setup();
    await ready();
    monitorConfig().onDrop({
      source: { data: cardDragData("t-1", "ready") },
      location: { current: { dropTargets: [] } },
    });
    expect(port.reorderTask).not.toHaveBeenCalled();
    expect(port.moveTask).not.toHaveBeenCalled();
  });

  it("ignores drops that would change nothing (card onto itself)", async () => {
    const { port, ready } = setup();
    await ready();
    monitorConfig().onDrop({
      source: { data: cardDragData("t-1", "ready") },
      location: {
        current: { dropTargets: [{ data: cardDragData("t-1", "ready") }] },
      },
    });
    expect(port.reorderTask).not.toHaveBeenCalled();
    expect(port.moveTask).not.toHaveBeenCalled();
  });

  it("stops monitoring on unmount", async () => {
    const cleanup = vi.fn(() => {});
    adapter.monitorForElements.mockReturnValueOnce(cleanup);
    const { hook, ready } = setup();
    await ready();
    hook.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
