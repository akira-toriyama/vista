import type { ColumnMenuProps } from "../contract.type";

export type OuterProps = ColumnMenuProps;

/**
 * Nothing to inject: MenuTrigger owns the open state internally and the three
 * actions arrive already-built from the parent. Props === OuterProps, and
 * ColumnMenu.hook.ts is an identity pass-through kept only so the view still
 * reads as the house injection pattern.
 */
export type Props = ColumnMenuProps;
