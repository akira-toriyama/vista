import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { FurrowPort } from "@/application/furrow-port";
import { makeFurrowPort } from "@/application/furrow-port.mock";
import { FurrowPortProvider } from "@/application/furrow-port-context";
import { createQueryClient } from "@/application/query-client";
import App, { AppComponent } from "./App";

function providers(port: FurrowPort = makeFurrowPort()) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <FurrowPortProvider port={port}>{children}</FurrowPortProvider>
    </QueryClientProvider>
  );
}

describe("AppComponent", () => {
  it("renders the shell with the board behind a view boundary", () => {
    const { rerender } = render(
      // StrictMode double-invokes pure renders → compiler memo-hit coverage
      <StrictMode>
        <AppComponent />
      </StrictMode>,
      { wrapper: providers() },
    );
    rerender(
      <StrictMode>
        <AppComponent />
      </StrictMode>,
    );
    expect(screen.getByRole("heading", { name: "vista" })).toBeInTheDocument();
    // the port never answers here, so the boundary's fallback is showing
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("App (composed)", () => {
  it("subscribes to .furrow changes while mounted", () => {
    let listeners = 0;
    const port = makeFurrowPort({
      subscribeTasksChanged: () => {
        listeners++;
        return () => {
          listeners--;
        };
      },
    });
    const { unmount } = render(<App />, { wrapper: providers(port) });
    expect(listeners).toBe(1);
    unmount();
    expect(listeners).toBe(0);
  });
});
