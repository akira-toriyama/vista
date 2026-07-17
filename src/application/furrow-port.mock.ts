import type { BoardInfo } from "@/domain/board";
import type { FurrowPort } from "./furrow-port";

/** Methods a test does not exercise hang forever instead of lying. */
const never = () => new Promise<never>(() => {});

export function makeFurrowPort(
  overrides: Partial<FurrowPort> = {},
): FurrowPort {
  return {
    board: never,
    listTasks: never,
    showTask: never,
    addTask: never,
    moveTask: never,
    setTask: never,
    reorderTask: never,
    doneTask: never,
    retitleTask: never,
    setChecklistItem: never,
    addDeps: never,
    removeDeps: never,
    listDeps: never,
    subscribeTasksChanged: () => () => {},
    ...overrides,
  };
}

export function makeBoardInfo(overrides: Partial<BoardInfo> = {}): BoardInfo {
  return {
    store: "/tmp/board/.furrow",
    source: "cwd",
    scope_repo: "akira-toriyama/vista",
    auto_filter: true,
    default_label: "",
    lanes: ["backlog", "ready", "done"],
    next_lanes: ["ready"],
    default_lane: "backlog",
    done_lane: "done",
    terminal: ["done"],
    types: ["task", "epic"],
    default_type: "task",
    containers: ["epic"],
    stale_days: 14,
    archive_older_than_days: 90,
    labels_required: false,
    schema_version: 2,
    binary_schema_version: 2,
    schema_state: "current",
    writable: true,
    ...overrides,
  };
}
