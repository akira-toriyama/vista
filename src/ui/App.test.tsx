import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import type { FurrowPort } from "@/application/furrow-port";
import { createQueryClient } from "@/application/query-client";
import App from "./App";

/** Port stub: App only subscribes at mount; data hooks arrive with the views. */
function stubPort() {
  let listeners = 0;
  const never = () => new Promise<never>(() => {});
  const port = {
    board: never,
    listTasks: never,
    showTask: never,
    addTask: never,
    moveTask: never,
    setTask: never,
    doneTask: never,
    retitleTask: never,
    setChecklistItem: never,
    addDeps: never,
    removeDeps: never,
    listDeps: never,
    subscribeTasksChanged: () => {
      listeners++;
      return () => {
        listeners--;
      };
    },
  } as unknown as FurrowPort;
  return { port, listenerCount: () => listeners };
}

function renderApp(port: FurrowPort) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <FurrowPortProvider port={port}>{children}</FurrowPortProvider>
    </QueryClientProvider>
  );
  return render(<App />, { wrapper });
}

it("renders the app shell", () => {
  const { port } = stubPort();
  renderApp(port);
  expect(screen.getByRole("heading", { name: "vista" })).toBeInTheDocument();
});

it("subscribes to .furrow changes while mounted", () => {
  const stub = stubPort();
  const { unmount } = renderApp(stub.port);
  expect(stub.listenerCount()).toBe(1);
  unmount();
  expect(stub.listenerCount()).toBe(0);
});
