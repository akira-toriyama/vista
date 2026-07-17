import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { FurrowPort } from "@/application/furrow-port";
import { makeBoardInfo, makeFurrowPort } from "@/application/furrow-port.mock";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import { createQueryClient } from "@/application/query-client";
import { makeTask } from "@/domain/task.mock";
import { BoardView } from "./BoardView/BoardView";

/**
 * The board tree wired together: composed BoardView → BoardColumn → TaskCard
 * with the real drag-and-drop adapter registering against jsdom.
 */

const tasks = [
  makeTask({
    id: "t-1",
    status: "ready",
    priority: 200,
    value: 3,
    effort: 2,
    labels: ["bug", "ui"],
    repos: ["akira-toriyama/vista"],
  }),
  makeTask({ id: "t-2", status: "ready", priority: 100 }),
  makeTask({
    id: "t-3",
    status: "backlog",
    priority: 100,
    blocked_by: ["t-9"],
    actionable: false,
  }),
];

function renderBoard(overrides: { writable?: boolean } = {}) {
  const port: FurrowPort = makeFurrowPort({
    board: () =>
      Promise.resolve(makeBoardInfo({ writable: overrides.writable ?? true })),
    listTasks: () => Promise.resolve(tasks),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <FurrowPortProvider port={port}>
        <Suspense fallback={null}>{children}</Suspense>
      </FurrowPortProvider>
    </QueryClientProvider>
  );
  return render(<BoardView />, { wrapper });
}

const cardsIn = (lane: string) =>
  within(screen.getByRole("region", { name: lane })).queryAllByTestId(
    "task-card",
  );

describe("board (composed)", () => {
  it("renders one column per board lane, in board order, empty lanes included", async () => {
    renderBoard();
    expect(
      await screen.findByRole("region", { name: "backlog" }),
    ).toBeInTheDocument();
    const columns = screen.getAllByRole("region");
    expect(columns.map((c) => c.getAttribute("aria-label"))).toEqual([
      "backlog",
      "ready",
      "done",
    ]);
    expect(cardsIn("done")).toHaveLength(0);
  });

  it("orders cards by sparse priority within a column (lower = higher up)", async () => {
    renderBoard();
    await screen.findByRole("region", { name: "ready" });
    expect(cardsIn("ready").map((c) => c.dataset.taskId)).toEqual([
      "t-2",
      "t-1",
    ]);
  });

  it("flags a blocked card and shows its meta fields", async () => {
    renderBoard();
    await screen.findByRole("region", { name: "backlog" });
    const [blocked] = cardsIn("backlog");
    expect(blocked).toHaveAttribute("data-blocked", "true");
    expect(
      within(blocked!).getByLabelText("blocked by t-9"),
    ).toBeInTheDocument();
    const card = cardsIn("ready").find((c) => c.dataset.taskId === "t-1")!;
    expect(within(card).getByText("vista")).toBeInTheDocument();
    expect(within(card).getByLabelText("value 3 of 5")).toBeInTheDocument();
  });

  it("display options toggle card fields off and back on", async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole("region", { name: "ready" });
    const idToggle = screen.getByRole("button", { name: "ID" });
    expect(idToggle).toHaveAttribute("aria-pressed", "true");

    await user.click(idToggle);
    expect(screen.queryByText("t-1")).not.toBeInTheDocument();
    // only the field is hidden, the card itself stays
    expect(screen.getByText("title of t-1")).toBeInTheDocument();

    await user.click(idToggle);
    expect(screen.getByText("t-1")).toBeInTheDocument();
  });

  it("cards are draggable on a writable board", async () => {
    renderBoard();
    await screen.findByRole("region", { name: "ready" });
    expect(cardsIn("ready")[0]).toHaveAttribute("draggable", "true");
  });

  it("a read-only board (schema upgrade pending) never registers draggables", async () => {
    renderBoard({ writable: false });
    await screen.findByRole("region", { name: "ready" });
    expect(cardsIn("ready")[0]).not.toHaveAttribute("draggable");
  });
});
