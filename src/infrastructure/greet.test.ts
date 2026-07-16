import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, expect, it } from "vitest";
import { greet } from "./greet";

afterEach(() => {
  clearMocks();
});

it("invokes the greet command over mocked IPC", async () => {
  mockIPC((cmd, args) => {
    if (cmd === "greet") {
      return `Hello, ${(args as { name: string }).name}!`;
    }
    throw new Error(`unexpected command: ${cmd}`);
  });

  await expect(greet("vista")).resolves.toBe("Hello, vista!");
});
