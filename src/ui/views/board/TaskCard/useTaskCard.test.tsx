import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTask } from "@/domain/task.mock";
import { cardDragData } from "../drag-data";
import { TaskCard } from "./TaskCard";
import { useTaskCard } from "./useTaskCard";

type DragData = Record<string | symbol, unknown>;

interface DraggableConfig {
  element: Element;
  getInitialData: () => DragData;
  onDragStart: () => void;
  onDrop: () => void;
}

interface DropTargetConfig {
  element: Element;
  getData: (args: { input: unknown }) => DragData;
  canDrop: (args: { source: { data: DragData } }) => boolean;
  onDrag: (args: { self: { data: DragData } }) => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

const adapter = vi.hoisted(() => ({
  draggable: vi.fn((_config: unknown) => () => {}),
  dropTargetForElements: vi.fn((_config: unknown) => () => {}),
}));
const hitbox = vi.hoisted(() => ({
  // pass the drag data through untouched so getData is observable
  attachClosestEdge: vi.fn((data: unknown) => data),
  extractClosestEdge: vi.fn((): "top" | "bottom" | null => null),
}));
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => adapter);
vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => hitbox);

const draggableConfig = () =>
  adapter.draggable.mock.calls[0]![0] as DraggableConfig;
const dropTargetConfig = () =>
  adapter.dropTargetForElements.mock.calls[0]![0] as DropTargetConfig;

function renderCard(overrides: { readOnly?: boolean } = {}) {
  return render(
    <TaskCard
      task={makeTask({ id: "t-1" })}
      lane="ready"
      display={{ id: true, pips: true, labels: true, repo: true }}
      readOnly={overrides.readOnly ?? false}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTaskCard", () => {
  it("registers nothing while the card element does not exist", () => {
    renderHook(() =>
      useTaskCard({
        task: makeTask({ id: "t-1" }),
        lane: "ready",
        display: { id: true, pips: true, labels: true, repo: true },
        readOnly: false,
      }),
    );
    expect(adapter.draggable).not.toHaveBeenCalled();
    expect(adapter.dropTargetForElements).not.toHaveBeenCalled();
  });

  it("registers the card element as draggable and as a drop target", () => {
    renderCard();
    expect(adapter.draggable).toHaveBeenCalledTimes(1);
    expect(adapter.dropTargetForElements).toHaveBeenCalledTimes(1);
    expect(draggableConfig().element).toBe(screen.getByTestId("task-card"));
    expect(draggableConfig().getInitialData()).toEqual(
      cardDragData({ id: "t-1", lane: "ready" }),
    );
  });

  it("an identical re-render does not re-register the DnD wiring", () => {
    const task = makeTask({ id: "t-1" });
    const display = { id: true, pips: true, labels: true, repo: true };
    const { rerender } = render(
      <TaskCard task={task} lane="ready" display={display} readOnly={false} />,
    );
    rerender(
      <TaskCard task={task} lane="ready" display={display} readOnly={false} />,
    );
    expect(adapter.draggable).toHaveBeenCalledTimes(1);
    expect(adapter.dropTargetForElements).toHaveBeenCalledTimes(1);
  });

  it("read-only board → drop target only, never draggable", () => {
    renderCard({ readOnly: true });
    expect(adapter.draggable).not.toHaveBeenCalled();
    expect(adapter.dropTargetForElements).toHaveBeenCalledTimes(1);
  });

  it("unregisters on unmount", () => {
    const cleanup = vi.fn(() => {});
    adapter.draggable.mockReturnValueOnce(cleanup);
    const { unmount } = renderCard();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("dims the card between drag start and drop", () => {
    renderCard();
    act(() => {
      draggableConfig().onDragStart();
    });
    expect(screen.getByTestId("task-card")).toHaveClass("opacity-40");
    act(() => {
      draggableConfig().onDrop();
    });
    expect(screen.getByTestId("task-card")).not.toHaveClass("opacity-40");
  });

  it("accepts other cards but never itself or foreign drags", () => {
    renderCard();
    const { canDrop } = dropTargetConfig();
    expect(
      canDrop({ source: { data: cardDragData({ id: "t-2", lane: "ready" }) } }),
    ).toBe(true);
    expect(
      canDrop({ source: { data: cardDragData({ id: "t-1", lane: "ready" }) } }),
    ).toBe(false);
    expect(canDrop({ source: { data: { kind: "text" } } })).toBe(false);
  });

  it("advertises its id + lane with closest-edge data attached", () => {
    renderCard();
    const data = dropTargetConfig().getData({ input: {} });
    expect(data).toEqual(cardDragData({ id: "t-1", lane: "ready" }));
    expect(hitbox.attachClosestEdge).toHaveBeenCalledWith(
      cardDragData({ id: "t-1", lane: "ready" }),
      expect.objectContaining({ allowedEdges: ["top", "bottom"] }),
    );
  });

  it("shows the hovered edge while dragged over, clears it on leave/drop", () => {
    renderCard();
    hitbox.extractClosestEdge.mockReturnValue("top");
    act(() => {
      dropTargetConfig().onDrag({ self: { data: {} } });
    });
    expect(screen.getByTestId("drop-indicator")).toBeInTheDocument();
    act(() => {
      dropTargetConfig().onDragLeave();
    });
    expect(screen.queryByTestId("drop-indicator")).not.toBeInTheDocument();

    act(() => {
      dropTargetConfig().onDrag({ self: { data: {} } });
    });
    act(() => {
      dropTargetConfig().onDrop();
    });
    expect(screen.queryByTestId("drop-indicator")).not.toBeInTheDocument();
  });
});
