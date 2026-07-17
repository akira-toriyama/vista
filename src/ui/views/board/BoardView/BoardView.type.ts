import type { Lane, Task } from "@/domain/task";
import type { CardDisplayOptions } from "../TaskCard/TaskCard.type";

/**
 * Everything useBoardView injects into the presenter. The view has no outer
 * props: the board is app-global state.
 */
export interface Props {
  /** board lanes in configured order — columns render exactly these. */
  lanes: Lane[];
  /** tasks grouped per lane, sorted by sparse priority ascending. */
  columns: Map<Lane, Task[]>;
  /** board not writable (schema upgrade pending) → whole view read-only. */
  readOnly: boolean;
  display: CardDisplayOptions;
  onToggleDisplay: (key: keyof CardDisplayOptions) => void;
}
