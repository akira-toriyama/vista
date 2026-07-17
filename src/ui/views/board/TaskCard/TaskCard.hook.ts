import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { useEffect, useRef, useState } from "react";
import { cardDragData, isCardDragData } from "../drag-data";
import type { OuterProps, Props } from "./TaskCard.type";

/** DnD wiring for one card: draggable + drop target with closest-edge data. */
export function useTaskCard({
  task,
  lane,
  display,
  readOnly,
}: OuterProps): Props {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const dropTarget = dropTargetForElements({
      element,
      getData: ({ input }) =>
        attachClosestEdge(cardDragData(task.id, lane), {
          element,
          input,
          allowedEdges: ["top", "bottom"],
        }),
      canDrop: ({ source }) =>
        isCardDragData(source.data) && source.data.id !== task.id,
      onDrag: ({ self }) => {
        setClosestEdge(extractClosestEdge(self.data));
      },
      onDragLeave: () => {
        setClosestEdge(null);
      },
      onDrop: () => {
        setClosestEdge(null);
      },
    });
    if (readOnly) return dropTarget;
    return combine(
      draggable({
        element,
        getInitialData: () => cardDragData(task.id, lane),
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      }),
      dropTarget,
    );
  }, [task.id, lane, readOnly]);

  return { task, lane, display, readOnly, ref, isDragging, closestEdge };
}
