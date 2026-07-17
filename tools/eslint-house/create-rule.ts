import { ESLintUtils } from "@typescript-eslint/utils";

/**
 * RuleCreator for the house plugin.
 *
 * The docs URL points at the future standalone package so nothing here is
 * bound to vista — the rules read the same whether dogfooded in-repo or
 * published as `eslint-plugin-house`.
 */
export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/akira-toriyama/eslint-plugin-house/blob/main/docs/rules/${name}.md`,
);
