# eslint-plugin-house

House conventions, enforced by lint so review never has to. Dogfooded from this
repo's `eslint.config.ts` today (`plugins: { house }`); the layout is
package-clean for a later lift into a standalone `eslint-plugin-house` — nothing
here is bound to this repo's paths or types.

Each rule ships a RuleTester suite (`*.test.ts`) that pins its valid/invalid
surface, so the conventions are held by the same machinery they describe.

## Why these three, and how they compose

The rules assume one end-state and build on it: **every standalone function is a
`function` statement**. `function-declarations` establishes that; the other two
then only have to reason about `function` declarations, which keeps them simple
and keeps inline callbacks (arrow/function _expressions_) and object members
entirely out of scope.

### `function-declarations`

Module-level `const`/`let`/`var` whose value is an arrow or function expression
must instead be a `function` statement; and components must not be typed
`React.FC` / `FC`.

- **Why `function`:** components, hooks and domain functions read as
  declarations — hoisting frees call-order, generics stay unparenthesized, and
  "a name followed by `function`" scans as _logic_ at a glance.
- **Why not `React.FC`:** it bakes in an implicit `children` and constrains the
  return type. Annotate props explicitly and return JSX.
- **Out of scope by design:** object members (`{ list: () => … }` — key-factory
  style), inline callbacks (`arr.map(() => …)`), and nested locals. Only the
  _module top level_ is a place for a component/hook/domain definition.

### `params-object`

A `function` taking two or more parameters must take a single params object.

- **Why:** two positional args of the same type invite silent order mistakes at
  the call site; a named object makes each argument self-labeling.
- **Exemptions:** a leading TS `this` param (not a real argument); variadics (a
  rest can't collapse into one object); and type-guard/assertion predicates
  (`x is T`, `asserts x`), which name their subject positionally by construction.
- Single-param functions — including every React component, which already takes
  one props object — are untouched.

### `no-param-destructure`

A `function` parameter must be read through `params.` / `props.`, not
destructured.

- **Why:** reading `props.x` keeps the origin of every value visible (it came
  from outside, it isn't a local) and keeps editor completion pointed at the
  real shape.
- **Allowed shapes:** rest-only (`{ ...rest }`) and ref-split
  (`{ ref, ...props }` / `{ bodyRef, ...props }`). The ref-split exists because
  `react-hooks/refs` treats reading `props.ref` off a props bag as a ref access,
  so the ref is pulled into its own binding and the remainder stays on `props.`.
  A ref-like binding (`ref`, or a `…Ref` alias) may sit alongside a rest; any
  _real_ prop in the pattern is a destructure and is flagged.

## Deliberate deviations

The conventions are defaults, not absolutes. When a specific line reads better
the other way, opt out narrowly with a reason:

```ts
// eslint-disable-next-line house/no-param-destructure -- <why this one is clearer>
```

## Known limits (by design — these rules are syntactic, no type info)

The rules match AST shape, not resolved types, so a few cases can't be decided
mechanically. They're left to a reasoned `eslint-disable`:

- **`FC` is matched by spelling.** `React.FC` / `FunctionComponent` and the bare
  `FC` are flagged wherever they appear (this is the point — the spelling is
  banned). An unrelated local type named `FC`, or React imported under an alias
  (`import * as R`, `import { FC as FCx }`), can't be told apart from the real
  thing without type resolution. Rare; disable with a reason.
- **A named function used as a library callback** (a `sort` comparator, a
  `useReducer` reducer, a named `map` callback) is a `FunctionDeclaration` with
  ≥2 positional params, so `params-object` flags it even though its signature is
  framework-dictated. The convention exempts library callbacks — apply that
  exemption with a disable + reason (inline callbacks are already out of scope).
- **Overload signatures / ambient `declare function`** parse as `TSDeclareFunction`,
  not `FunctionDeclaration`, so `params-object` does not (yet) see them.
- **Array-pattern params** (`function f([a, b])`) are out of scope;
  `no-param-destructure` governs object patterns only.
