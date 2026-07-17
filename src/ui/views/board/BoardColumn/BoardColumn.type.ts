import type { Ref } from "react";
import type { Lane, Task } from "@/domain/task";
import type { CardDisplayOptions } from "../TaskCard/TaskCard.type";

/** What the board decides about this column. */
export interface OuterProps {
  lane: Lane;
  /** the lane's cards in render order (sparse priority ascending). */
  cards: Task[];
  display: CardDisplayOptions;
  readOnly: boolean;
}

/** OuterProps plus everything useBoardColumn injects into the presenter. */
export interface Props extends OuterProps {
  bodyRef: Ref<HTMLDivElement>;
  isCardOver: boolean;
}
