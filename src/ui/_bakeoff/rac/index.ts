import type { BakeoffCandidate } from "../contract.type";
import { ColumnMenu } from "./ColumnMenu";
import { Palette } from "./Palette";
import { SidePeek } from "./SidePeek";

export const candidate: BakeoffCandidate = {
  meta: {
    key: "rac",
    label: "React Aria Components",
    pkg: "react-aria-components",
    // verified: node -p "require('react-aria-components/package.json').version"
    version: "1.19.0",
  },
  SidePeek,
  Palette,
  ColumnMenu,
};
