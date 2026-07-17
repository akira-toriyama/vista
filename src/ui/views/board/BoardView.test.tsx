import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { FurrowPort } from "@/application/furrow-port";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import { createQueryClient } from "@/application/query-client";
import type { BoardInfo } from "@/domain/board";
import type { Task } from "@/domain/task";
import { BoardView } from "./BoardView";

const task = (
  id: string,
  status: string,
  priority: number,
  extra: Partial<Task> = {},
): Task => ({
  id,
  title: `title of ${id}`,
  status,
  priority,
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
  actionable: true,
  blocked_by: [],
  container: false,
  stuck: false,
  ...extra,
});

const tasks: Task[] = [
  task("t-1", "ready", 200, {
    value: 3,
    effort: 2,
    labels: ["bug", "ui"],
    repos: ["akira-toriyama/vista"],
  }),
  task("t-2", "ready", 100),
  task("t-3", "backlog", 100, { blocked_by: ["t-9"], actionable: false }),
];

function stubPort(overrides: { writable?: boolean } = {}): FurrowPort {
  const board = {
    writable: overrides.writable ?? true,
    lanes: ["backlog", "ready", "done"],
  } as BoardInfo;
  const never = () => new Promise<never>(() => {});
  return {
    board: () => Promise.resolve(board),
    listTasks: () => Promise.resolve(tasks),
    showTask: never,
    addTask: never,
    moveTask: never,
    setTask: never,
    reorderTask: never,
    doneTask: never,
    retitleTask: never,
    setChecklistItem: never,
    addDeps: never,
    removeDeps: never,
    listDeps: never,
    subscribeTasksChanged: () => () => {},
  };
}

function renderBoard(port: FurrowPort = stubPort()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <FurrowPortProvider port={port}>{children}</FurrowPortProvider>
    </QueryClientProvider>
  );
  return render(<BoardView />, { wrapper });
}

const cardsIn = (lane: string) =>
  within(screen.getByRole("region", { name: lane })).queryAllByTestId(
    "task-card",
  );

describe("BoardView", () => {
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

  it("flags and dims a blocked card, naming its blockers", async () => {
    renderBoard();
    await screen.findByRole("region", { name: "backlog" });
    const [blocked] = cardsIn("backlog");
    expect(blocked).toHaveAttribute("data-blocked", "true");
    expect(
      within(blocked!).getByLabelText("blocked by t-9"),
    ).toBeInTheDocument();
    const [unblocked] = cardsIn("ready");
    expect(unblocked).not.toHaveAttribute("data-blocked");
  });

  it("shows id, value/effort pips, label dots and repo shorthand on a card", async () => {
    renderBoard();
    await screen.findByRole("region", { name: "ready" });
    const card = cardsIn("ready").find((c) => c.dataset.taskId === "t-1")!;
    expect(within(card).getByText("t-1")).toBeInTheDocument();
    expect(within(card).getByLabelText("value 3 of 5")).toBeInTheDocument();
    expect(within(card).getByLabelText("effort 2 of 5")).toBeInTheDocument();
    expect(within(card).getByLabelText("label bug")).toBeInTheDocument();
    expect(within(card).getByText("vista")).toBeInTheDocument();
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
    renderBoard(stubPort({ writable: false }));
    await screen.findByRole("region", { name: "ready" });
    expect(cardsIn("ready")[0]).not.toHaveAttribute("draggable");
  });
});
