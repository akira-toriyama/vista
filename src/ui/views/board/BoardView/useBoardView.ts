import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useState } from "react";
import { useBoardInfo, useDropTask, useTaskList } from "@/application/hooks";
import { columnize, planDrop } from "@/domain/kanban";
import { dropTargetFrom, isCardDragData } from "../drag-data";
import type { CardDisplayOptions } from "../TaskCard/TaskCard.type";
import type { Props } from "./BoardView.type";

/**
 * Board behavior: suspense queries for lanes/tasks, the display-option
 * toggles, and the drag monitor that turns a finished drop into the one
 * furrow write domain planDrop maps it to (with an optimistic cache patch).
 */
export function useBoardView(): Props {
  const board = useBoardInfo();
  const tasks = useTaskList();
  const dropTask = useDropTask();
  const executeDrop = dropTask.mutate;
  const [display, setDisplay] = useState<CardDisplayOptions>({
    id: true,
    pips: true,
    labels: true,
    repo: true,
  });

  const lanes = board.data.lanes;
  // React Compiler memoizes this — identity is stable for the effect below
  const columns = columnize({ tasks: tasks.data, lanes });
  const readOnly = !board.data.writable;

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isCardDragData(source.data),
      onDrop: ({ source, location }) => {
        if (!isCardDragData(source.data)) return;
        const resolved = dropTargetFrom({
          targets: location.current.dropTargets,
        });
        if (resolved === null) return;
        const plan = planDrop({
          draggedId: source.data.id,
          sourceLane: source.data.lane,
          targetLane: resolved.lane,
          targetCards: columns.get(resolved.lane) ?? [],
          target: resolved.target,
        });
        if (plan !== null)
          executeDrop({ id: source.data.id, targetLane: resolved.lane, plan });
      },
    });
  }, [columns, executeDrop]);

  return {
    lanes,
    columns,
    readOnly,
    display,
    onToggleDisplay: (key) => {
      setDisplay((d) => ({ ...d, [key]: !d[key] }));
    },
  };
}
