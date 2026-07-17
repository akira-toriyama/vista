import { columnize } from "@/domain/kanban";
import { makeTask } from "@/domain/task.mock";
import type { Props } from "./BoardView.type";

const lanes = ["backlog", "ready", "done"];

const normal: Props = {
  lanes,
  columns: columnize({
    tasks: [
      makeTask({ id: "t-1", status: "ready", priority: 200 }),
      makeTask({ id: "t-2", status: "ready", priority: 100 }),
      makeTask({ id: "t-3", status: "backlog", blocked_by: ["t-9"] }),
    ],
    lanes,
  }),
  readOnly: false,
  display: { id: true, pips: true, labels: true, repo: true },
  onToggleDisplay: () => {},
};

type MakeBoardViewProps = () => Props;

export const makeBoardViewProps: MakeBoardViewProps = () => normal;
