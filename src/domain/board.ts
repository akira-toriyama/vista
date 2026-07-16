import type { Lane } from "./task";

/**
 * `furrow board --json`: the board's configured vocabulary and write guard.
 * Lanes are never hardcoded in vista — views render whatever this says.
 */
export interface BoardInfo {
  store: string;
  source: string;
  scope_repo: string;
  auto_filter: boolean;
  default_label: string;
  lanes: Lane[];
  next_lanes: Lane[];
  default_lane: Lane;
  done_lane: Lane;
  terminal: Lane[];
  types: string[];
  default_type: string;
  containers: string[];
  stale_days: number;
  archive_older_than_days: number;
  labels_required: boolean;
  schema_version: number;
  binary_schema_version: number;
  schema_state: string;
  /** false (e.g. schema-upgrade-required) → GUI must go read-only. */
  writable: boolean;
}
