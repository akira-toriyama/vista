import type { RefObject } from "react";
import type { SidePeekProps } from "../contract.type";

export type OuterProps = SidePeekProps;

export interface Props extends SidePeekProps {
  /** Anchor for RAC's <Popover>, deliberately never attached — see SidePeek.hook.ts. */
  anchorRef: RefObject<HTMLElement | null>;
}
