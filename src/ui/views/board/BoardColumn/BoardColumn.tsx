import { cn } from "@/ui/lib/utils";
import { TaskCard } from "../TaskCard/TaskCard";
import { useBoardColumn } from "./BoardColumn.hook";
import type { OuterProps, Props } from "./BoardColumn.type";

/** One lane as a column: header with count, body = drop target for cards. */
export function BoardColumnComponent({
  lane,
  cards,
  display,
  readOnly,
  bodyRef,
  isCardOver,
}: Props) {
  return (
    <section
      aria-label={lane}
      className="flex w-64 shrink-0 flex-col rounded-xl bg-muted/50"
    >
      <h2 className="flex items-baseline gap-1.5 px-3 pt-2.5 pb-1 text-sm font-semibold">
        {lane}
        <span className="text-xs font-normal text-muted-foreground">
          {cards.length}
        </span>
      </h2>
      <div
        ref={bodyRef}
        data-testid="column-body"
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-1.5 overflow-y-auto rounded-b-xl p-1.5",
          isCardOver && "bg-muted",
        )}
      >
        {cards.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            lane={lane}
            display={display}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}

/* c8 ignore start -- composition line: presenter × hook, covered by board.test */
export function BoardColumn(props: OuterProps) {
  return <BoardColumnComponent {...useBoardColumn(props)} />;
}
/* c8 ignore stop */
