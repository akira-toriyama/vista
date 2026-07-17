import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeFurrowPort } from "./furrow-port.mock";
import { FurrowPortProvider, useFurrowPort } from "./FurrowPortContext";

describe("FurrowPortProvider", () => {
  it("is stable across identical re-renders", () => {
    const port = makeFurrowPort();
    const child = <span>stable child</span>;
    const { rerender } = render(
      <FurrowPortProvider port={port}>{child}</FurrowPortProvider>,
    );
    // identical re-render walks the compiler's memo-hit path too
    rerender(<FurrowPortProvider port={port}>{child}</FurrowPortProvider>);
    expect(screen.getByText("stable child")).toBeInTheDocument();
  });
});

describe("useFurrowPort", () => {
  it("fails loudly when no provider wired a port in", () => {
    // React logs the render error itself; keep the test output clean
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useFurrowPort())).toThrow(
      "no FurrowPortProvider",
    );
    error.mockRestore();
  });
});
