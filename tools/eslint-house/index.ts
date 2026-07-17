import functionDeclarations from "./rules/function-declarations";
import noParamDestructure from "./rules/no-param-destructure";
import paramsObject from "./rules/params-object";

/**
 * The house convention plugin: three rules that enforce the presenter/hook +
 * naming conventions machine-side, so review never has to. Dogfooded from
 * this repo's config today; the layout is package-clean for a later lift into
 * a standalone `eslint-plugin-house` (see README.md for the "why" of each).
 */
const house = {
  meta: { name: "eslint-plugin-house", version: "0.0.0" },
  rules: {
    "function-declarations": functionDeclarations,
    "params-object": paramsObject,
    "no-param-destructure": noParamDestructure,
  },
} as const;

export default house;
