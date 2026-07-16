import type { BoardInfo } from "@/domain/board";
import type {
  DepNeighborhood,
  Lane,
  MutationReport,
  Task,
  TaskDetail,
  TaskShard,
} from "@/domain/task";

/** Maps 1:1 onto `furrow ls` -s/-l/-r (comma = OR within a field). */
export interface TaskFilter {
  lanes?: Lane[];
  labels?: string[];
  repos?: string[];
}

export interface AddTaskInput {
  title: string;
  status?: Lane;
  priority?: number;
  value?: number;
  effort?: number;
  labels?: string[];
  repos?: string[];
  /** create with no repo attached (suppresses the board's auto repo). */
  draft?: boolean;
  deps?: string[];
  parent?: string;
  body?: string;
  /** seed unchecked checklist items. */
  checklist?: string[];
  type?: string;
}

/** One `furrow set` write: lane + estimates + labels combined. */
export interface SetTaskPatch {
  status?: Lane;
  /** 1..5, or null to clear. */
  value?: number | null;
  /** 1..5, or null to clear. */
  effort?: number | null;
  addLabels?: string[];
  removeLabels?: string[];
  type?: string;
}

/**
 * The application layer's only doorway to furrow. Implemented by
 * infrastructure (TauriFurrowAdapter in the app, a child_process exec in
 * contract tests). All logic lives in furrow; this surface is a thin,
 * typed mirror of its CLI/JSON contract.
 *
 * Deliberately absent until their feature tasks land: sync (sync-integration
 * task) and reorder (waits on furrow --before/--after, t-phgp).
 */
export interface FurrowPort {
  board(): Promise<BoardInfo>;
  listTasks(filter?: TaskFilter): Promise<Task[]>;
  showTask(id: string): Promise<TaskDetail>;
  /** `add` returns the bare new shard (no "before" exists yet). */
  addTask(input: AddTaskInput): Promise<TaskShard>;
  moveTask(id: string, lane: Lane): Promise<MutationReport>;
  setTask(id: string, patch: SetTaskPatch): Promise<MutationReport>;
  doneTask(id: string): Promise<MutationReport>;
  retitleTask(id: string, title: string): Promise<MutationReport>;
  setChecklistItem(id: string, index: number, done: boolean): Promise<MutationReport>;
  addDeps(id: string, deps: string[]): Promise<MutationReport>;
  removeDeps(id: string, deps: string[]): Promise<MutationReport>;
  listDeps(id: string): Promise<DepNeighborhood>;
  /** Fires whenever .furrow/ changes on disk. Returns an unsubscribe. */
  subscribeTasksChanged(onChange: () => void): () => void;
}
