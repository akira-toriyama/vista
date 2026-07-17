import { render, screen, within } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { BoardColumnComponent } from "./BoardColumn";
import { makeBoardColumnProps } from "./BoardColumn.mock";

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

describe("BoardColumnComponent", () => {
  it("renders the lane name, card count and every card in order", () => {
    const { rerender } = render(
      <BoardColumnComponent {...makeBoardColumnProps()} />,
    );
    // identical re-render walks the compiler's memo-hit path too
    rerender(<BoardColumnComponent {...makeBoardColumnProps()} />);
    const column = screen.getByRole("region", { name: "ready" });
    expect(within(column).getByText("2")).toBeInTheDocument();
    const cards = within(column).getAllByTestId("task-card");
    expect(cards.map((c) => c.dataset.taskId)).toEqual(["t-1", "t-2"]);
  });

  it("applies a cards refresh in place without rebuilding the per-card render", () => {
    const { rerender } = strictRender(
      <BoardColumnComponent {...makeBoardColumnProps()} />,
    );
    // a cards list refresh alone must not rebuild the per-card render
    rerender(
      <BoardColumnComponent
        {...makeBoardColumnProps()}
        cards={[...makeBoardColumnProps().cards]}
      />,
    );
    expect(screen.getAllByTestId("task-card")).toHaveLength(2);
  });

  it("renders an empty column with a zero count", () => {
    strictRender(
      <BoardColumnComponent {...makeBoardColumnProps({ type: "empty" })} />,
    );
    const column = screen.getByRole("region", { name: "ready" });
    expect(within(column).getByText("0")).toBeInTheDocument();
    expect(within(column).queryAllByTestId("task-card")).toHaveLength(0);
  });

  it("highlights the body while a card hovers over it", () => {
    const { rerender } = render(
      <BoardColumnComponent {...makeBoardColumnProps()} isCardOver />,
    );
    rerender(<BoardColumnComponent {...makeBoardColumnProps()} isCardOver />);
    expect(screen.getByTestId("column-body")).toHaveClass("bg-muted");
  });
});
