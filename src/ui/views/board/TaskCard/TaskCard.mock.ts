import { makeTask } from "@/domain/task.mock";
import type { Props } from "./TaskCard.type";

const normal: Props = {
  task: makeTask({
    id: "t-1",
    value: 3,
    effort: 2,
    labels: ["bug", "ui"],
    repos: ["akira-toriyama/vista"],
  }),
  lane: "ready",
  display: { id: true, pips: true, labels: true, repo: true },
  readOnly: false,
  ref: null,
  isDragging: false,
  closestEdge: null,
};

type MakeTaskCardProps = (p?: { type: "blocked" | "minimal" }) => Props;

export const makeTaskCardProps: MakeTaskCardProps = (p) => {
  if (p?.type === "blocked") {
    return {
      ...normal,
      task: makeTask({ id: "t-1", blocked_by: ["t-9"], actionable: false }),
    };
  }
  if (p?.type === "minimal") {
    return { ...normal, task: makeTask({ id: "t-1" }) };
  }
  return normal;
};
