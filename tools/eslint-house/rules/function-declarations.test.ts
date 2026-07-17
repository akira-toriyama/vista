import rule from "./function-declarations";
import { makeRuleTester } from "../rule-tester";

const ruleTester = makeRuleTester();

ruleTester.run("function-declarations", rule, {
  valid: [
    // the blessed forms: `function` statements at module scope
    "function C(props: P) { return null; }",
    "export function useThing() { return 1; }",
    "function planDrop(args: A) { return args.x; }",
    // object members may be arrows/methods (query-key factories etc.)
    "const keys = { all: ['x'], list: () => [], detail(id: string) { return id; } };",
    // inline callbacks are expressions, not declarations
    "arr.map(() => 1);",
    "onClick(() => {});",
    // a nested local helper is not a module-level definition
    "function outer() { const inner = () => 1; return inner(); }",
    // non-function top-level consts
    "const x = 1;",
    "const q = new Thing();",
    // an explicitly-typed component (no FC) is fine
    "function C(props: P): JSX.Element { return null; }",
    "const x: () => void = base;",
    // a namespaced `FC` that isn't React's is not the banned type
    "const x: Foo.FC = base;",
    // a cast of a non-function value is not an arrow-const
    "const x = foo as Bar;",
    // default exports that are already `function` statements (named or not)
    "export default function App() { return null; }",
    "export default function () { return null; }",
    "export default base;",
  ],
  invalid: [
    {
      code: "const f = () => 1;",
      errors: [{ messageId: "useFunctionDeclaration", data: { name: "f" } }],
    },
    {
      code: "export const C = () => null;",
      errors: [{ messageId: "useFunctionDeclaration", data: { name: "C" } }],
    },
    {
      code: "const f = function () {};",
      errors: [{ messageId: "useFunctionDeclaration", data: { name: "f" } }],
    },
    {
      code: "const load = async () => {};",
      errors: [{ messageId: "useFunctionDeclaration", data: { name: "load" } }],
    },
    {
      // FC annotation alone (init is not a function)
      code: "const C: React.FC = base;",
      errors: [{ messageId: "noReactFC" }],
    },
    {
      code: "const C: FC<P> = base;",
      errors: [{ messageId: "noReactFC" }],
    },
    {
      code: "const C: React.FunctionComponent = base;",
      errors: [{ messageId: "noReactFC" }],
    },
    {
      // both violations fire: arrow-const AND the FC annotation
      code: "const C: React.FC = () => null;",
      errors: [
        { messageId: "useFunctionDeclaration", data: { name: "C" } },
        { messageId: "noReactFC" },
      ],
    },
    {
      // an `as` cast doesn't change that the value is an arrow-const
      code: "const f = (() => 1) as Fn;",
      errors: [{ messageId: "useFunctionDeclaration", data: { name: "f" } }],
    },
    {
      code: "const g = (function () {}) as Fn;",
      errors: [{ messageId: "useFunctionDeclaration", data: { name: "g" } }],
    },
    {
      // `satisfies` hides the arrow-const; the nested React.FC also fires
      code: "const C = (() => null) satisfies React.FC;",
      errors: [
        { messageId: "useFunctionDeclaration", data: { name: "C" } },
        { messageId: "noReactFC" },
      ],
    },
    {
      // a default-exported arrow is a top-level component/hook shape
      code: "export default () => null;",
      errors: [{ messageId: "useFunctionDeclarationDefault" }],
    },
    {
      code: "export default (() => null) as Fn;",
      errors: [{ messageId: "useFunctionDeclarationDefault" }],
    },
  ],
});
