import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cardDragData, columnDropData } from "../drag-data";
import { BoardColumn } from "./BoardColumn";
import { useBoardColumn } from "./useBoardColumn";

type DragData = Record<string | symbol, unknown>;

interface DropTargetConfig {
  element: Element;
  getData: () => DragData;
  canDrop: (args: { source: { data: DragData } }) => boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

const adapter = vi.hoisted(() => ({
  draggable: vi.fn((_config: unknown) => () => {}),
  dropTargetForElements: vi.fn((_config: unknown) => () => {}),
}));
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => adapter);

const outer = () => ({
  lane: "ready",
  cards: [],
  display: { id: true, pips: true, labels: true, repo: true },
  readOnly: false,
});

// the column body registers first; card children register after it
const bodyConfig = () =>
  adapter.dropTargetForElements.mock.calls[0]![0] as DropTargetConfig;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useBoardColumn", () => {
  it("registers nothing while the body element does not exist", () => {
    renderHook(() => useBoardColumn(outer()));
    expect(adapter.dropTargetForElements).not.toHaveBeenCalled();
  });

  it("registers the column body as a drop target for cards only", () => {
    render(<BoardColumn {...outer()} />);
    expect(adapter.dropTargetForElements).toHaveBeenCalledTimes(1);
    const config = bodyConfig();
    expect(config.element).toBe(screen.getByTestId("column-body"));
    expect(config.getData()).toEqual(columnDropData("ready"));
    expect(
      config.canDrop({
        source: { data: cardDragData({ id: "t-1", lane: "ready" }) },
      }),
    ).toBe(true);
    expect(config.canDrop({ source: { data: { kind: "text" } } })).toBe(false);
  });

  it("an identical re-render does not re-register the drop target", () => {
    const props = outer();
    const { rerender } = render(<BoardColumn {...props} />);
    rerender(<BoardColumn {...props} />);
    expect(adapter.dropTargetForElements).toHaveBeenCalledTimes(1);
  });

  it("highlights while a card is over the body, clears on leave/drop", () => {
    render(<BoardColumn {...outer()} />);
    act(() => {
      bodyConfig().onDragEnter();
    });
    expect(screen.getByTestId("column-body")).toHaveClass("bg-muted");
    act(() => {
      bodyConfig().onDragLeave();
    });
    expect(screen.getByTestId("column-body")).not.toHaveClass("bg-muted");

    act(() => {
      bodyConfig().onDragEnter();
    });
    act(() => {
      bodyConfig().onDrop();
    });
    expect(screen.getByTestId("column-body")).not.toHaveClass("bg-muted");
  });

  it("unregisters on unmount", () => {
    const cleanup = vi.fn(() => {});
    adapter.dropTargetForElements.mockReturnValueOnce(cleanup);
    const { unmount } = render(<BoardColumn {...outer()} />);
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
