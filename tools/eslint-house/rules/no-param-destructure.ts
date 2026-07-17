import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule";

// A ref pulled into its own binding — `ref` itself or a `xxxRef` alias. Splitting
// it out is forced by react-hooks/refs, which reads `props.ref` off a props bag
// as a ref access; the rest (`...props`) then stays on the `props.` read style.
function isRefBinding(
  property: TSESTree.Property | TSESTree.RestElement,
): boolean {
  return (
    property.type === AST_NODE_TYPES.Property &&
    property.key.type === AST_NODE_TYPES.Identifier &&
    // the value must be a plain binding — `{ ref: { current } }` / `{ ref: [x] }`
    // hide a real destructure of a local under a ref-shaped key
    property.value.type === AST_NODE_TYPES.Identifier &&
    (property.key.name === "ref" || property.key.name.endsWith("Ref"))
  );
}

// The only sanctioned object-pattern params: a bare rest (`{ ...rest }`) and a
// ref-split (`{ ref, ...props }`). Both leave every *real* prop unnamed, read
// later through `props.`. Any other property is a real prop being destructured.
function isSanctioned(pattern: TSESTree.ObjectPattern): boolean {
  return pattern.properties.every(
    (property) =>
      property.type === AST_NODE_TYPES.RestElement || isRefBinding(property),
  );
}

export default createRule({
  name: "no-param-destructure",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Read parameters through `params.`/`props.` instead of destructuring them",
    },
    schema: [],
    messages: {
      noDestructure:
        "Read this parameter through `params.`/`props.` — destructuring hides whether a value came from outside or is local. Allowed: rest-only (`{ ...rest }`) and ref-split (`{ ref, ...props }`).",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      FunctionDeclaration(node) {
        for (const param of node.params) {
          // a default value wraps the pattern in an AssignmentPattern
          const pattern =
            param.type === AST_NODE_TYPES.AssignmentPattern
              ? param.left
              : param;
          if (
            pattern.type === AST_NODE_TYPES.ObjectPattern &&
            !isSanctioned(pattern)
          ) {
            context.report({ node: pattern, messageId: "noDestructure" });
          }
        }
      },
    };
  },
});
