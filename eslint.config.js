import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "src-tauri/target/"] },
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
    },
  },
  // config files and node-run scripts stay outside typed lint
  {
    files: ["**/*.config.{js,ts,mjs}", "eslint.config.js", "scripts/**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // tests: `!` after a find() is idiomatic — a wrong one fails the assertion
  // anyway; noop callbacks are legitimate stand-ins
  {
    files: ["src/**/*.test.{ts,tsx}", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
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
  // vendored shadcn/ui components export variants alongside components
  {
    files: ["src/ui/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // context modules pair a provider component with its accessor hook by design
  {
    files: ["src/**/*-context.tsx"],
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
  // Files outside the four layers (src/main.tsx composition root) are not
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
  // formatting belongs to Prettier — keep last so it wins over style rules
  prettier,
);
