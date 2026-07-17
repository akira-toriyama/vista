import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { makeFurrowPort } from "@/application/furrow-port.mock";
import { FurrowPortProvider } from "@/application/FurrowPortContext";
import { createQueryClient } from "@/application/query-client";
import { useApp } from "./useApp";

describe("useApp", () => {
  it("keeps the .furrow change subscription for the app's lifetime", () => {
    let listeners = 0;
    const port = makeFurrowPort({
      subscribeTasksChanged: () => {
        listeners++;
        return () => {
          listeners--;
        };
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createQueryClient()}>
        <FurrowPortProvider port={port}>{children}</FurrowPortProvider>
      </QueryClientProvider>
    );
    const hook = renderHook(() => useApp(), { wrapper });
    hook.rerender(); // memo-hit path: the subscription must not re-register
    expect(listeners).toBe(1);
    hook.unmount();
    expect(listeners).toBe(0);
  });
});
