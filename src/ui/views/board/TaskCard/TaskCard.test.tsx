import { render, screen } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { makeTask } from "@/domain/task.mock";
import { TaskCardComponent } from "./TaskCard";
import { makeTaskCardProps } from "./TaskCard.mock";

const card = () => screen.getByTestId("task-card");

// StrictMode double-invokes pure renders, walking the compiler's memo-hit
// paths (presenters have no effects, so this is free coverage of that half)
const strictRender = (ui: ReactElement) => {
  const view = render(<StrictMode>{ui}</StrictMode>);
  return {
    ...view,
    rerender: (next: ReactElement) => {
      view.rerender(<StrictMode>{next}</StrictMode>);
    },
  };
};

describe("TaskCardComponent", () => {
  it("renders title, id, repo shorthand, label dots and pips", () => {
    const { rerender } = strictRender(
      <TaskCardComponent {...makeTaskCardProps()} />,
    );
    // identical re-render walks the compiler's memo-hit path too
    rerender(<TaskCardComponent {...makeTaskCardProps()} />);
    expect(screen.getByText("title of t-1")).toBeInTheDocument();
    expect(screen.getByText("t-1")).toBeInTheDocument();
    expect(screen.getByText("vista")).toBeInTheDocument();
    expect(screen.getByLabelText("label bug")).toBeInTheDocument();
    expect(screen.getByLabelText("value 3 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("effort 2 of 5")).toBeInTheDocument();
  });

  it("omits the meta row when every display option is off", () => {
    render(
      <TaskCardComponent
        {...makeTaskCardProps()}
        display={{ id: false, pips: false, labels: false, repo: false }}
      />,
    );
    expect(screen.queryByTestId("card-meta")).not.toBeInTheDocument();
  });

  it("keeps the meta row for the id even when the task has no optional fields", () => {
    strictRender(
      <TaskCardComponent {...makeTaskCardProps({ type: "minimal" })} />,
    );
    expect(screen.getByTestId("card-meta")).toBeInTheDocument();
    expect(screen.getByText("t-1")).toBeInTheDocument();
    expect(screen.queryByLabelText(/value/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/label/)).not.toBeInTheDocument();
  });

  it("renders value-only and effort-only pips independently", () => {
    const { unmount } = render(
      <TaskCardComponent
        {...makeTaskCardProps()}
        task={makeTask({ id: "t-v", value: 4 })}
      />,
    );
    expect(screen.getByLabelText("value 4 of 5")).toBeInTheDocument();
    expect(screen.queryByLabelText(/effort/)).not.toBeInTheDocument();
    unmount();
    render(
      <TaskCardComponent
        {...makeTaskCardProps()}
        task={makeTask({ id: "t-e", effort: 5 })}
      />,
    );
    expect(screen.getByLabelText("effort 5 of 5")).toBeInTheDocument();
    expect(screen.queryByLabelText(/value/)).not.toBeInTheDocument();
  });

  it("flags and dims a blocked card, naming its blockers", () => {
    const { rerender } = render(
      <TaskCardComponent {...makeTaskCardProps({ type: "blocked" })} />,
    );
    rerender(<TaskCardComponent {...makeTaskCardProps({ type: "blocked" })} />);
    expect(card()).toHaveAttribute("data-blocked", "true");
    expect(card()).toHaveClass("opacity-60");
    expect(screen.getByLabelText("blocked by t-9")).toBeInTheDocument();
  });

  it("dims the card while it is being dragged", () => {
    strictRender(<TaskCardComponent {...makeTaskCardProps()} isDragging />);
    expect(card()).toHaveClass("opacity-40");
  });

  it("draws the drop indicator on the hovered edge", () => {
    const { unmount, rerender } = render(
      <TaskCardComponent {...makeTaskCardProps()} closestEdge="top" />,
    );
    rerender(<TaskCardComponent {...makeTaskCardProps()} closestEdge="top" />);
    expect(screen.getByTestId("drop-indicator")).toHaveClass("-top-[5px]");
    unmount();
    strictRender(
      <TaskCardComponent {...makeTaskCardProps()} closestEdge="bottom" />,
    );
    expect(screen.getByTestId("drop-indicator")).toHaveClass("-bottom-[5px]");
  });
});
