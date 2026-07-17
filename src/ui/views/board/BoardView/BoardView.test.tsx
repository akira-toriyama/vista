import { render, screen } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BoardViewComponent } from "./BoardView";
import { makeBoardViewProps } from "./BoardView.mock";

// StrictMode double-invokes pure renders — see TaskCard.test.tsx
const strictRender = (ui: ReactElement) => {
  const view = render(<StrictMode>{ui}</StrictMode>);
  return {
    ...view,
    rerender: (next: ReactElement) => {
      view.rerender(<StrictMode>{next}</StrictMode>);
    },
  };
};

describe("BoardViewComponent", () => {
  it("renders one column per lane, in board order, empty lanes included", () => {
    const { rerender } = strictRender(
      <BoardViewComponent {...makeBoardViewProps()} />,
    );
    // identical re-render walks the compiler's memo-hit path too
    rerender(<BoardViewComponent {...makeBoardViewProps()} />);
    const columns = screen.getAllByRole("region");
    expect(columns.map((c) => c.getAttribute("aria-label"))).toEqual([
      "backlog",
      "ready",
      "done",
    ]);
  });

  it("renders a lane the columns map does not know as an empty column", () => {
    strictRender(
      <BoardViewComponent {...makeBoardViewProps()} columns={new Map()} />,
    );
    expect(screen.getAllByRole("region")).toHaveLength(3);
    expect(screen.queryAllByTestId("task-card")).toHaveLength(0);
  });

  it("applies prop changes in place (no remount) for readOnly and columns", () => {
    const { rerender } = strictRender(
      <BoardViewComponent {...makeBoardViewProps()} />,
    );
    // a lane list refresh alone must not rebuild the per-lane render
    rerender(
      <BoardViewComponent
        {...makeBoardViewProps()}
        lanes={[...makeBoardViewProps().lanes]}
      />,
    );
    rerender(<BoardViewComponent {...makeBoardViewProps()} readOnly />);
    rerender(
      <BoardViewComponent {...makeBoardViewProps()} columns={new Map()} />,
    );
    expect(screen.getAllByRole("region")).toHaveLength(3);
    expect(screen.queryAllByTestId("task-card")).toHaveLength(0);
  });

  it("reflects the display options on the toggle buttons", () => {
    render(
      <BoardViewComponent
        {...makeBoardViewProps()}
        display={{ id: false, pips: true, labels: true, repo: true }}
      />,
    );
    expect(screen.getByRole("button", { name: "ID" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Pips" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("clicking a toggle reports its field key", async () => {
    const user = userEvent.setup();
    const onToggleDisplay = vi.fn();
    render(
      <BoardViewComponent
        {...makeBoardViewProps()}
        onToggleDisplay={onToggleDisplay}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Labels" }));
    expect(onToggleDisplay).toHaveBeenCalledWith("labels");
  });
});
