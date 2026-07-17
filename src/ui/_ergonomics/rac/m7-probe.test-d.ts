// Type-level probe for m7. Asserts MEASURED reality, not the hypothesis.
//
// MenuItemProps declares `Omit<GlobalDOMAttributes<HTMLDivElement>, 'onClick'>`,
// which reads like "onClick is rejected". Measured: the Omit is DEFEATED —
// onClick survives in keyof and an object literal carrying it is assignable.
// Runtime (m7-onclick-runtime.test.tsx) shows onClick fires on both mouse and
// keyboard, so this is benign — but the declaration does NOT mean what it looks
// like it means, and tsc will not steer an agent from onClick to onAction.
import type { MenuItemProps } from "react-aria-components";

// MEASURED: true (not false, despite the Omit)
type HasOnClick = "onClick" extends keyof MenuItemProps ? true : false;
export const hasOnClick: HasOnClick = true;

// MEASURED: assignable — adding @ts-expect-error here yields
// "error TS2578: Unused '@ts-expect-error' directive."
export const withOnClick: MenuItemProps = {
  id: "a",
  onClick: () => {},
};

// onAction is the documented API and is likewise accepted
export const withOnAction: MenuItemProps = {
  id: "a",
  onAction: () => {},
};
