import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import type { Ref } from "react";
import type { Lane, Task } from "@/domain/task";

/** Which optional card fields the board currently renders. */
export interface CardDisplayOptions {
  id: boolean;
  pips: boolean;
  labels: boolean;
  repo: boolean;
}

/** What the parent column decides about this card. */
export interface OuterProps {
  task: Task;
  lane: Lane;
  display: CardDisplayOptions;
  /** board not writable → cards render but never register as draggable. */
  readOnly: boolean;
}

/** OuterProps plus everything useTaskCard injects into the presenter. */
export interface Props extends OuterProps {
  ref: Ref<HTMLDivElement>;
  isDragging: boolean;
  closestEdge: Edge | null;
}
