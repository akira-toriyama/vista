import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import boundaries from "eslint-plugin-boundaries";
import jsxA11yX from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import useEncapsulation from "eslint-plugin-use-encapsulation";
import globals from "globals";
import tseslint from "typescript-eslint";
import house from "./tools/eslint-house/index.ts";

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "src-tauri/target/"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // numbers stringify deterministically; forbidding them buys no safety
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      // an `_`-prefixed arg documents "intentionally unused" (mock signatures)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // config files and node-run scripts stay outside typed lint
  {
    files: ["**/*.config.{js,ts,mjs}", "eslint.config.ts", "scripts/**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // tests + mock factories: `!` after a find() is idiomatic — a wrong one
  // fails the assertion anyway; noop callbacks are legitimate stand-ins;
  // asserting on a spy method (expect(port.reorderTask)) never rebinds this
  {
    files: ["src/**/*.test.{ts,tsx}", "src/**/*.mock.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
    },
  },
  // a11y is a feature of this kanban UI, not a nice-to-have — strict pack
  {
    files: ["src/**/*.tsx"],
    plugins: { "jsx-a11y-x": jsxA11yX },
    rules: jsxA11yX.configs.strict.rules,
  },
  // components touch hooks only through named useXxx hooks — pairs with the
  // presenter/hook injection pattern (t-rz61)
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx"],
    plugins: { "use-encapsulation": useEncapsulation },
    rules: { "use-encapsulation/prefer-custom-hooks": "error" },
  },
  // house conventions, machine-enforced (t-w5rg). Production src only —
  // tests/mocks read positionally and destructure freely; vendored primitives
  // and codegen keep their upstream style; type/type-test modules hold no
  // runtime functions. Legitimate deviations use eslint-disable + a reason.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.mock.ts",
      "src/**/*.test-d.ts",
      "src/**/*.type.ts",
      "src/**/*.d.ts",
      "src/ui/primitives/**",
      "src/domain/generated/**",
    ],
    plugins: { house },
    rules: {
      "house/function-declarations": "error",
      "house/params-object": "error",
      "house/no-param-destructure": "error",
    },
  },
  // test hygiene: no stray .skip / expect-less tests; RTL role-first queries
  {
    files: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // @fast-check/vitest's test.prop is a test block too
      "vitest/no-standalone-expect": [
        "error",
        { additionalTestBlockFunctions: ["test.prop", "it.prop"] },
      ],
    },
  },
  {
    files: ["src/**/*.test.tsx"],
    ...testingLibrary.configs["flat/react"],
    rules: {
      ...testingLibrary.configs["flat/react"].rules,
      // misfires on renderHook results (list/move/hook…), where the blessed
      // names (view/utils) would be the wrong ones
      "testing-library/render-result-naming-convention": "off",
    },
  },
  // vendored shadcn/ui components export variants alongside components
  {
    files: ["src/ui/primitives/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // context modules pair a provider component with its accessor hook by design
  {
    files: ["src/**/*Context.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // node-run codegen/build scripts
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Layer boundaries: ui → application → domain; infrastructure implements
  // application ports. Violations are build errors, not review comments.
  // Files outside the four layers (src/Main.tsx composition root) are not
  // classified as elements, so they stay unrestricted.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: {} },
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain" },
        { type: "application", pattern: "src/application" },
        { type: "infrastructure", pattern: "src/infrastructure" },
        { type: "ui", pattern: "src/ui" },
        // catch-all for src root files (main.tsx composition root)
        { type: "app", pattern: "src" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          // last matching policy wins
          default: "disallow",
          checkAllOrigins: true,
          policies: [
            // external npm modules are allowed by default…
            { allow: { to: { module: { source: "**" } } } },
            {
              from: { element: { types: "domain" } },
              allow: { to: { element: { types: "domain" } } },
            },
            {
              from: { element: { types: "application" } },
              allow: {
                to: {
                  element: { types: { anyOf: ["application", "domain"] } },
                },
              },
            },
            {
              from: { element: { types: "infrastructure" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["infrastructure", "application", "domain"],
                    },
                  },
                },
              },
            },
            {
              from: { element: { types: "ui" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["ui", "application", "domain"] },
                  },
                },
              },
            },
            // composition root wires everything together
            {
              from: { element: { types: "app" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        "app",
                        "ui",
                        "application",
                        "infrastructure",
                        "domain",
                      ],
                    },
                  },
                },
              },
            },
            // …except: only infrastructure may talk to Tauri
            {
              from: {
                element: { types: { anyOf: ["domain", "application", "ui"] } },
              },
              disallow: { to: { module: { source: "@tauri-apps/*" } } },
              message: "@tauri-apps/* is only allowed in infrastructure/",
            },
            // …and domain stays pure: no React
            {
              from: { element: { types: "domain" } },
              disallow: { to: { module: { source: ["react", "react-dom"] } } },
              message: "domain/ must not depend on React",
            },
          ],
        },
      ],
    },
  },
  // cva / tailwind-variants は使わない（2026-07-17 全廃）。variant は TS 判別 union で
  // 表現する — 独立軸ライブラリは不正な組合せ（cross-axis 制約）を型で禁止できない
  // （理由の正典 = projects t-ww01）。shadcn 生成物が cva を持ち込んだら de-cva する。
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "class-variance-authority",
              message:
                "cva は使わない。variant は TS 判別 union 型 props + Record マップ + cn() で書く（glossary / projects t-ww01）。",
            },
            {
              name: "tailwind-variants",
              message:
                "tailwind-variants も不正な組合せを型で禁止できない。TS 判別 union を使う（glossary）。",
            },
          ],
        },
      ],
    },
  },
  // formatting belongs to Prettier — keep last so it wins over style rules
  prettier,
);
