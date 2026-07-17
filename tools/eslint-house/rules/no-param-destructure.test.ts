import rule from "./no-param-destructure";
import { makeRuleTester } from "../rule-tester";

const ruleTester = makeRuleTester();

ruleTester.run("no-param-destructure", rule, {
  valid: [
    // an identifier param is read through `params.`/`props.`
    "function f(props: P) { return props.a; }",
    "function planDrop(args: A) { return args.x; }",
    // no params at all
    "function f() {}",
    // rest-only: the whole object arrives as one binding
    "function f({ ...rest }: P) {}",
    // ref-split: pull the ref into its own binding, keep the remainder as rest
    "function C({ ref, ...props }: P) { return props.a; }",
    "function C({ bodyRef, ...props }: P) { return props.a; }",
    "function C({ scrollRef, ...props }: P) {}",
    // ref binding without a remainder is still just a ref pull-out
    "function C({ ref }: P) {}",
    // a ref renamed to a plain identifier is still a single ref pull-out
    "function C({ ref: node, ...props }: P) { return props.a; }",
    // out of scope: inline callbacks (arrow/function expressions) destructure
    // freely — they carry library-driven signatures
    "arr.map(({ x }) => x);",
    "onDrop(({ source, location }) => source);",
    "const o = { m({ x }: P) { return x; } };",
    // out of scope: an arrow const is function-declarations' concern, not this
    "const f = ({ x }: P) => x;",
  ],
  invalid: [
    {
      code: "function f({ a, b }: P) {}",
      errors: [{ messageId: "noDestructure" }],
    },
    {
      // a single real prop is still a destructure
      code: "function f({ a }: P) {}",
      errors: [{ messageId: "noDestructure" }],
    },
    {
      // a rest does not license destructuring a real prop alongside it
      code: "function f({ id, ...rest }: P) {}",
      errors: [{ messageId: "noDestructure" }],
    },
    {
      // ref-like names don't launder a real prop in the same pattern
      code: "function C({ ref, id, ...props }: P) {}",
      errors: [{ messageId: "noDestructure" }],
    },
    {
      // default value wraps the pattern in an AssignmentPattern — still caught
      code: "function f({ a } = {}) {}",
      errors: [{ messageId: "noDestructure" }],
    },
    {
      // a nested object pattern under a ref key still destructures a real local
      code: "function C({ ref: { current } }: P) { return current; }",
      errors: [{ messageId: "noDestructure" }],
    },
    {
      // …as does an array pattern under a ref key
      code: "function C({ ref: [head] }: P) { return head; }",
      errors: [{ messageId: "noDestructure" }],
    },
  ],
});
