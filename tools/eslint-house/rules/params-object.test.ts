import rule from "./params-object";
import { makeRuleTester } from "../rule-tester";

const ruleTester = makeRuleTester();

ruleTester.run("params-object", rule, {
  valid: [
    // zero or one parameter is fine
    "function f() {}",
    "function f(a: A) {}",
    // the blessed shape: many fields carried by one params object
    "function planDrop(args: { a: A; b: B }) {}",
    // variadic can't collapse into one object — exempt
    "function f(first: A, ...rest: B[]) {}",
    "function f(...args: A[]) {}",
    // a type-guard predicate names its tested value positionally — exempt
    "function isBetween(x: number, lo: number, hi: number): x is Y { return true; }",
    // a leading `this` param is not a real parameter
    "function f(this: W, a: A): void {}",
    // out of scope: inline callbacks carry library-driven arg lists
    "arr.reduce((acc, x) => acc, 0);",
    "const f = (a: A, b: B) => a;",
    "const o = { m(a: A, b: B) { return a; } };",
  ],
  invalid: [
    {
      code: "function f(a: A, b: B) {}",
      errors: [{ messageId: "useParamsObject", data: { count: "2" } }],
    },
    {
      code: "function f(a: A, b: B, c: C) {}",
      errors: [{ messageId: "useParamsObject", data: { count: "3" } }],
    },
    {
      // a second optional param still means two positions to line up
      code: "function f(a: A, b?: B) {}",
      errors: [{ messageId: "useParamsObject", data: { count: "2" } }],
    },
    {
      // `this` doesn't count, but the two real params still do
      code: "function f(this: W, a: A, b: B) {}",
      errors: [{ messageId: "useParamsObject", data: { count: "2" } }],
    },
    {
      // not a predicate return, so no exemption
      code: "function f(a: A, b: B): boolean { return true; }",
      errors: [{ messageId: "useParamsObject", data: { count: "2" } }],
    },
  ],
});
