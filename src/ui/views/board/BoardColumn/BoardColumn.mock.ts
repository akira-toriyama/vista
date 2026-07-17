import { makeTask } from "@/domain/task.mock";
import type { Props } from "./BoardColumn.type";

const normal: Props = {
  lane: "ready",
  cards: [
    makeTask({ id: "t-1", priority: 100 }),
    makeTask({ id: "t-2", priority: 200 }),
  ],
  display: { id: true, pips: true, labels: true, repo: true },
  readOnly: false,
  bodyRef: null,
  isCardOver: false,
};

type MakeBoardColumnProps = (p?: { type: "empty" }) => Props;

export const makeBoardColumnProps: MakeBoardColumnProps = (p) => {
  if (p?.type === "empty") return { ...normal, cards: [] };
  return normal;
};
