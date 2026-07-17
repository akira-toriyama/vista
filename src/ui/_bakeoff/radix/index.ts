import type { BakeoffCandidate } from "../contract.type";
import { ColumnMenu } from "./ColumnMenu";
import { Palette } from "./Palette";
import { SidePeek } from "./SidePeek";

/**
 * The control group: what vista already ships. Its job in the bake-off is to
 * keep "change nothing" a measurable option, so nothing here is tuned beyond
 * what a normal Radix consumer would write.
 *
 * `version` verified with:
 *   node -p "require('radix-ui/package.json').version"  # → 1.6.2
 * The prototypes below sit on @radix-ui/react-dialog@1.1.19,
 * @radix-ui/react-dropdown-menu@2.1.20 and
 * @radix-ui/react-dismissable-layer@1.1.15 underneath that umbrella; the
 * source cited in the comments is the clone at radix-ui/primitives, checked
 * against those exact versions.
 */
export const candidate: BakeoffCandidate = {
  meta: {
    key: "radix",
    label: "Radix UI (control)",
    pkg: "radix-ui",
    version: "1.6.2",
  },
  SidePeek,
  Palette,
  ColumnMenu,
};
