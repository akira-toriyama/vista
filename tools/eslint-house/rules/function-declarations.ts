import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule";

const FC_NAMES = new Set(["FC", "FunctionComponent"]);

// `FC` / `FunctionComponent`, bare or qualified as `React.FC`. A `Foo.FC` from
// some other namespace is left alone.
function isReactFcName(typeName: TSESTree.EntityName): boolean {
  if (typeName.type === AST_NODE_TYPES.Identifier) {
    return FC_NAMES.has(typeName.name);
  }
  return (
    typeName.type === AST_NODE_TYPES.TSQualifiedName &&
    typeName.left.type === AST_NODE_TYPES.Identifier &&
    typeName.left.name === "React" &&
    FC_NAMES.has(typeName.right.name)
  );
}

// A module-level `const`/`let`/`var` — exported or not. Named function values
// here are components, hooks or domain functions and must be `function`
// statements; nested locals, object members and inline callbacks are not.
function isModuleLevel(declaration: TSESTree.VariableDeclaration): boolean {
  const parent = declaration.parent;
  return (
    parent.type === AST_NODE_TYPES.Program ||
    parent.type === AST_NODE_TYPES.ExportNamedDeclaration
  );
}

// `(() => {}) as T` / `(() => {}) satisfies T` only annotate the value — peel
// the cast wrappers off to reach the function that's really being assigned.
function unwrapCasts(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === AST_NODE_TYPES.TSAsExpression ||
    current.type === AST_NODE_TYPES.TSSatisfiesExpression
  ) {
    current = current.expression;
  }
  return current;
}

function isFunctionValue(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
}

export default createRule({
  name: "function-declarations",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Declare top-level components, hooks and domain functions with `function`, not arrow/function-expression consts; forbid React.FC annotations",
    },
    schema: [],
    messages: {
      useFunctionDeclaration:
        "Declare `{{name}}` with a `function` statement, not an arrow/function-expression const — components, hooks and domain functions read as declarations (hoisting, clean generics).",
      useFunctionDeclarationDefault:
        "Export the default as a `function` statement (`export default function Name() {}`), not an arrow/function-expression.",
      noReactFC:
        "Don't type a component as React.FC/FC — annotate props explicitly and return JSX; FC implies children and constrains the return type.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclaration(node) {
        if (!isModuleLevel(node)) return;
        for (const declarator of node.declarations) {
          if (
            declarator.id.type === AST_NODE_TYPES.Identifier &&
            declarator.init &&
            isFunctionValue(unwrapCasts(declarator.init))
          ) {
            context.report({
              node: declarator.id,
              messageId: "useFunctionDeclaration",
              data: { name: declarator.id.name },
            });
          }
        }
      },
      ExportDefaultDeclaration(node) {
        const exported = unwrapCasts(node.declaration);
        if (isFunctionValue(exported)) {
          context.report({
            node: exported,
            messageId: "useFunctionDeclarationDefault",
          });
        }
      },
      TSTypeReference(node) {
        if (isReactFcName(node.typeName)) {
          context.report({ node, messageId: "noReactFC" });
        }
      },
    };
  },
});
