import { Button } from "@/ui/primitives/button";
import { BoardColumn } from "../BoardColumn/BoardColumn";
import type { CardDisplayOptions } from "../TaskCard/TaskCard.type";
import { useBoardView } from "./useBoardView";
import type { Props } from "./BoardView.type";

const DISPLAY_FIELDS: readonly {
  key: keyof CardDisplayOptions;
  label: string;
}[] = [
  { key: "id", label: "ID" },
  { key: "pips", label: "Pips" },
  { key: "labels", label: "Labels" },
  { key: "repo", label: "Repo" },
];

/**
 * The kanban board: one column per board lane, cards ordered by furrow's
 * sparse priority, with per-field display toggles in the header row.
 */
export function BoardViewComponent(props: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-end gap-1 px-3 py-1.5">
        {DISPLAY_FIELDS.map(({ key, label }) => (
          <Button
            key={key}
            variant="ghost"
            size="xs"
            aria-pressed={props.display[key]}
            className={props.display[key] ? "" : "text-muted-foreground/50"}
            onClick={() => {
              props.onToggleDisplay(key);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 items-stretch gap-2.5 overflow-x-auto px-3 pb-3">
        {props.lanes.map((lane) => (
          <BoardColumn
            key={lane}
            lane={lane}
            cards={props.columns.get(lane) ?? []}
            display={props.display}
            readOnly={props.readOnly}
          />
        ))}
      </div>
    </div>
  );
}

/* c8 ignore start -- composition line: presenter × hook, covered by board.test */
export function BoardView() {
  return <BoardViewComponent {...useBoardView()} />;
}
/* c8 ignore stop */
