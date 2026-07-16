import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useRef, useState } from "react";
import type { Lane, Task } from "@/domain/task";
import { cn } from "@/ui/lib/utils";
import { columnDropData, isCardDragData } from "./drag-data";
import { TaskCard, type CardDisplayOptions } from "./TaskCard";

interface BoardColumnProps {
  lane: Lane;
  cards: Task[];
  display: CardDisplayOptions;
  readOnly: boolean;
}

/** One lane as a column: header with count, body = drop target for cards. */
export function BoardColumn({ lane, cards, display, readOnly }: BoardColumnProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isCardOver, setIsCardOver] = useState(false);

  useEffect(() => {
    const element = bodyRef.current;
    if (element === null) return;
    return dropTargetForElements({
      element,
      getData: () => columnDropData(lane),
      canDrop: ({ source }) => isCardDragData(source.data),
      onDragEnter: () => setIsCardOver(true),
      onDragLeave: () => setIsCardOver(false),
      onDrop: () => setIsCardOver(false),
    });
  }, [lane]);

  return (
    <section
      aria-label={lane}
      className="flex w-64 shrink-0 flex-col rounded-xl bg-muted/50"
    >
      <h2 className="flex items-baseline gap-1.5 px-3 pt-2.5 pb-1 text-sm font-semibold">
        {lane}
        <span className="text-xs font-normal text-muted-foreground">{cards.length}</span>
      </h2>
      <div
        ref={bodyRef}
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-1.5 overflow-y-auto rounded-b-xl p-1.5",
          isCardOver && "bg-muted",
        )}
      >
        {cards.map((task) => (
          <TaskCard key={task.id} task={task} lane={lane} display={display} readOnly={readOnly} />
        ))}
      </div>
    </section>
  );
}
