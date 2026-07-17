import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useRef, useState } from "react";
import { columnDropData, isCardDragData } from "../drag-data";
import type { OuterProps, Props } from "./BoardColumn.type";

/** DnD wiring for one column: the body accepts cards and signals hover. */
export function useBoardColumn({
  lane,
  cards,
  display,
  readOnly,
}: OuterProps): Props {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isCardOver, setIsCardOver] = useState(false);

  useEffect(() => {
    const element = bodyRef.current;
    if (element === null) return;
    return dropTargetForElements({
      element,
      getData: () => columnDropData(lane),
      canDrop: ({ source }) => isCardDragData(source.data),
      onDragEnter: () => {
        setIsCardOver(true);
      },
      onDragLeave: () => {
        setIsCardOver(false);
      },
      onDrop: () => {
        setIsCardOver(false);
      },
    });
  }, [lane]);

  return { lane, cards, display, readOnly, bodyRef, isCardOver };
}
