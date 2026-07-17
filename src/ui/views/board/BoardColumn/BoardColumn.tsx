import { cn } from "@/ui/lib/utils";
import { TaskCard } from "../TaskCard/TaskCard";
import { useBoardColumn } from "./useBoardColumn";
import type { OuterProps, Props } from "./BoardColumn.type";

/** One lane as a column: header with count, body = drop target for cards. */
// react-hooks/refs: split the injected ref into its own binding (see TaskCard).
export function BoardColumnComponent({ bodyRef, ...props }: Props) {
  return (
    <section
      aria-label={props.lane}
      className="flex w-64 shrink-0 flex-col rounded-xl bg-muted/50"
    >
      <h2 className="flex items-baseline gap-1.5 px-3 pt-2.5 pb-1 text-sm font-semibold">
        {props.lane}
        <span className="text-xs font-normal text-muted-foreground">
          {props.cards.length}
        </span>
      </h2>
      <div
        ref={bodyRef}
        data-testid="column-body"
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-1.5 overflow-y-auto rounded-b-xl p-1.5",
          props.isCardOver && "bg-muted",
        )}
      >
        {props.cards.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            lane={props.lane}
            display={props.display}
            readOnly={props.readOnly}
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
