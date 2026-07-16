import type { ChecklistItem, FurrowTaskShardV2 } from "./generated/furrow-task";

export type { ChecklistItem };

/** One task as stored in a .furrow/tasks/<id>.json shard (generated type). */
export type TaskShard = FurrowTaskShardV2;

/**
 * One row of `furrow ls --json`: the shard plus the flags furrow computes
 * over the whole board (never derived again on this side — furrow is the
 * single source of logic).
 */
export interface Task extends TaskShard {
  actionable: boolean;
  blocked_by: string[];
  container: boolean;
  stuck: boolean;
}

/** `furrow show <id> --json`: the shard plus the resolved body markdown. */
export interface TaskDetail extends TaskShard {
  body_text: string;
}

/** A lane name from the board's config.toml [lanes].order. */
export type Lane = string;

/** One neighbor's priority move when a relative placement respaced the lane. */
export interface RenumberedMove {
  id: string;
  from: number;
  to: number;
}

/**
 * What every furrow mutation except `add` returns: the shard before and
 * after the write, plus which top-level fields changed. `add` has no
 * "before", so it returns the bare shard instead. `renumbered` appears only
 * when a --before/--after placement exhausted the sparse gap and the whole
 * lane was respaced in the same write.
 */
export interface MutationReport {
  after: TaskShard;
  before: TaskShard;
  changed: string[];
  renumbered?: RenumberedMove[];
}

/** id+title+status triple used by `furrow dep --list --json`. */
export interface DepRef {
  id: string;
  title: string;
  status: Lane;
}

/** Both directions of a task's dependency neighborhood. */
export interface DepNeighborhood {
  id: string;
  title: string;
  depends_on: DepRef[];
  blocks: DepRef[];
}
