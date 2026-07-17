import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FurrowError } from "@/application/furrow-error";
import type { FurrowPort } from "@/application/furrow-port";
import { FurrowPortProvider } from "@/application/FurrowPortContext";
import { useBoardInfo } from "@/application/hooks";
import { createQueryClient } from "@/application/query-client";
import type { BoardInfo } from "@/domain/board";
import { ViewBoundary } from "./ViewBoundary";

const boardInfo = { writable: true, lanes: ["backlog", "done"] } as BoardInfo;

const never = () => new Promise<never>(() => {});

function stubPort(board: FurrowPort["board"]): FurrowPort {
  return {
    board,
    listTasks: never,
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

/** Minimal suspense consumer — what any view does with a suspense query. */
function Probe() {
  const board = useBoardInfo();
  return <p>lanes: {board.data.lanes.join(",")}</p>;
}

function renderProbe(port: FurrowPort) {
  return render(
    // StrictMode double-invokes pure renders → compiler memo-hit coverage
    <StrictMode>
      <QueryClientProvider client={createQueryClient()}>
        <FurrowPortProvider port={port}>
          <ViewBoundary>
            <Probe />
          </ViewBoundary>
        </FurrowPortProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe("ViewBoundary", () => {
  it("shows the loading fallback while the view suspends", () => {
    renderProbe(stubPort(never));
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("renders the view once data resolves", async () => {
    renderProbe(stubPort(() => Promise.resolve(boardInfo)));
    expect(await screen.findByText("lanes: backlog,done")).toBeInTheDocument();
  });

  it("maps a FurrowError kind to its own fallback wording", async () => {
    renderProbe(
      stubPort(() =>
        Promise.reject(
          new FurrowError("core", "spawn failed: /no/such/furrow", {
            coreCode: "spawn-failed",
          }),
        ),
      ),
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("furrow could not be launched");
    expect(alert).toHaveTextContent("spawn failed: /no/such/furrow");
  });

  it("falls back generically for a non-furrow error", async () => {
    renderProbe(stubPort(() => Promise.reject(new Error("boom"))));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("boom");
  });

  it("stringifies a non-Error rejection instead of crashing", async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercises the non-Error path
    renderProbe(stubPort(() => Promise.reject("plain string failure")));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("plain string failure");
  });

  it("Retry resets the query error state and refetches", async () => {
    let calls = 0;
    renderProbe(
      stubPort(() => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new FurrowError("internal", "flaky first call"))
          : Promise.resolve(boardInfo);
      }),
    );
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("lanes: backlog,done")).toBeInTheDocument();
    expect(calls).toBe(2);
  });
});
