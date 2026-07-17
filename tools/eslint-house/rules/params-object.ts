import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule";

// TS's `this` parameter is a type annotation slot, not a real argument.
function isThisParam(param: TSESTree.Parameter): boolean {
  return param.type === AST_NODE_TYPES.Identifier && param.name === "this";
}

export default createRule({
  name: "params-object",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Functions taking two or more parameters must accept a single params object",
    },
    schema: [],
    messages: {
      useParamsObject:
        "A function taking {{count}} parameters should take a single params object ({ … }) — positional args of the same type invite order mistakes.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      FunctionDeclaration(node) {
        const params = node.params.filter((param) => !isThisParam(param));

        // variadic: a rest can't collapse into a single object
        if (params.some((param) => param.type === AST_NODE_TYPES.RestElement)) {
          return;
        }
        // a type-guard/assertion predicate names its subject positionally
        if (
          node.returnType?.typeAnnotation.type ===
          AST_NODE_TYPES.TSTypePredicate
        ) {
          return;
        }
        if (params.length >= 2) {
          context.report({
            node,
            messageId: "useParamsObject",
            data: { count: params.length },
          });
        }
      },
    };
  },
});
