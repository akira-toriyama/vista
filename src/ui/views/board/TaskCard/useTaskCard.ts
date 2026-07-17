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
export function useTaskCard(props: OuterProps): Props {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const dropTarget = dropTargetForElements({
      element,
      getData: ({ input }) =>
        attachClosestEdge(
          cardDragData({ id: props.task.id, lane: props.lane }),
          { element, input, allowedEdges: ["top", "bottom"] },
        ),
      canDrop: ({ source }) =>
        isCardDragData(source.data) && source.data.id !== props.task.id,
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
    if (props.readOnly) return dropTarget;
    return combine(
      draggable({
        element,
        getInitialData: () =>
          cardDragData({ id: props.task.id, lane: props.lane }),
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      }),
      dropTarget,
    );
  }, [props.task.id, props.lane, props.readOnly]);

  return {
    task: props.task,
    lane: props.lane,
    display: props.display,
    readOnly: props.readOnly,
    ref,
    isDragging,
    closestEdge,
  };
}
