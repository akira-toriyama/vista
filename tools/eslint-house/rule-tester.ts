import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";

// Vitest runs without injected globals, so wire the RuleTester onto vitest's
// own hooks — otherwise it falls back to a bare runner that reports outside
// the test tree (and its afterAll bookkeeping never fires).
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/**
 * A RuleTester on the typescript-eslint parser (the tester's default), with
 * JSX enabled so component cases parse. Detection in these rules is purely
 * syntactic — predicate/rest/object-pattern nodes — so no type information,
 * and thus no tsconfig `project`, is needed; tests stay fast.
 */
export function makeRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  });
}
