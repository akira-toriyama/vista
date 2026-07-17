import type { BakeoffCandidate } from "../contract.type";
import { ColumnMenu } from "./ColumnMenu";
import { Palette } from "./Palette";
import { SidePeek } from "./SidePeek";

export const candidate: BakeoffCandidate = {
  meta: {
    key: "baseui",
    label: "Base UI",
    pkg: "@base-ui/react",
    // verified: node -p "require('@base-ui/react/package.json').version"
    version: "1.6.0",
  },
  SidePeek,
  Palette,
  ColumnMenu,
};
