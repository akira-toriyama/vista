import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import type { DropTarget } from "@/domain/kanban";
import type { Lane } from "@/domain/task";

/**
 * The board's drag-and-drop wire protocol: what a card puts into pragmatic
 * drag-and-drop's data bags, and how a finished drop's target stack resolves
 * back into the domain DropTarget that planDrop consumes.
 */

type DragData = Record<string | symbol, unknown>;

const CARD_KIND = "vista/board-card";
const COLUMN_KIND = "vista/board-column";

export interface CardDragData extends DragData {
  kind: typeof CARD_KIND;
  id: string;
  lane: Lane;
}

export function cardDragData(id: string, lane: Lane): CardDragData {
  return { kind: CARD_KIND, id, lane };
}

export function isCardDragData(data: DragData): data is CardDragData {
  return data.kind === CARD_KIND;
}

interface ColumnDropData extends DragData {
  kind: typeof COLUMN_KIND;
  lane: Lane;
}

export function columnDropData(lane: Lane): ColumnDropData {
  return { kind: COLUMN_KIND, lane };
}

function isColumnDropData(data: DragData): data is ColumnDropData {
  return data.kind === COLUMN_KIND;
}

/**
 * Resolve pragmatic's innermost-first drop-target stack: a card (with its
 * hovered edge) beats the column containing it; a bare column is an
 * end-of-column drop; anything else means the drag ended nowhere useful.
 */
export function dropTargetFrom(
  targets: readonly { data: DragData }[],
  extractEdge: (data: DragData) => Edge | null = extractClosestEdge,
): { lane: Lane; target: DropTarget } | null {
  for (const { data } of targets) {
    if (isCardDragData(data)) {
      const edge = extractEdge(data);
      return {
        lane: data.lane,
        target: {
          type: "card",
          id: data.id,
          edge: edge === "top" ? "top" : "bottom",
        },
      };
    }
    if (isColumnDropData(data)) {
      return { lane: data.lane, target: { type: "column" } };
    }
  }
  return null;
}
