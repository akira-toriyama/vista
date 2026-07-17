import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // same compiler pipeline as the app build — tests exercise compiled output
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // the 100% gate: natural fallout of the presenter/hook style, not a goal
    // chased with contortions — genuinely untestable code earns a curated
    // exclude below (or the one allowed /* c8 ignore */ composition line)
    coverage: {
      provider: "v8",
      // Vitest 4 dropped coverage.all — an explicit include is its stand-in
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/domain/generated/**", // codegen output (pnpm codegen)
        "src/ui/primitives/**", // vendored shadcn/ui
        "src/ui/_bakeoff/**",
        "src/ui/_ergonomics/**", // t-wf4p throwaway
        "src/main.tsx", // composition root: wiring only, no logic
        "**/*.type.ts", // type-only modules
        "**/*.mock.ts", // test fixtures/factories
        "**/*.test-d.ts", // type tests never execute
      ],
      thresholds: { 100: true },
    },
    projects: [
      {
        // unit tests: domain/application/ui/infrastructure, Tauri IPC mocked
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          // t-wf4p scratch: `_ergonomics/` deliberately contains WRONG usage to
          // measure whether each library complains, and its assertions encode
          // the investigator's beliefs — one of which turned out to be a rAF
          // race ("pointer open leaves focus on the trigger"), green alone and
          // red under load. It is evidence, not a suite, so it must not gate.
          // The bake-off proper (`_bakeoff/`) DOES gate: it is a real
          // measurement and it stays green.
          exclude: ["src/ui/_ergonomics/**"],
          setupFiles: ["./tests/setup.unit.ts"],
          // shape-pin type tests (*.test-d.ts) run through tsc here
          typecheck: {
            enabled: true,
            include: ["src/**/*.test-d.ts"],
          },
        },
      },
      {
        // contract tests: run the real furrow binary on the host
        extends: true,
        test: {
          name: "contract",
          environment: "node",
          include: ["tests/contract/**/*.test.ts"],
        },
      },
    ],
  },
});
