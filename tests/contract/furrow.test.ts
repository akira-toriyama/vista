/**
 * Contract tests run the real furrow binary on the host (no Tauri, no mocks).
 * They are skipped when furrow is not on PATH so CI without furrow stays green.
 * The FurrowPort adapter task will grow real command contracts here.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);

const furrowAvailable = await run("furrow", ["--version"]).then(
  () => true,
  () => false,
);

describe.skipIf(!furrowAvailable)("furrow contract", () => {
  it("--version exits 0 and identifies itself", async () => {
    const { stdout } = await run("furrow", ["--version"]);
    expect(stdout).toMatch(/^furrow /);
  });
});
