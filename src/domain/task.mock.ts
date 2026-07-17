import type { Task } from "./task";

/**
 * A complete `furrow ls --json` row for tests: pass just what the case is
 * about, the rest is a valid quiet default.
 */
export function makeTask(overrides: Partial<Task> & Pick<Task, "id">): Task {
  return {
    title: `title of ${overrides.id}`,
    status: "ready",
    priority: 100,
    labels: [],
    repos: [],
    deps: [],
    refs: [],
    checklist: [],
    created: "2026-07-16T00:00:00Z",
    updated: "2026-07-16T00:00:00Z",
    closed: null,
    reviewed: null,
    body: `bodies/${overrides.id}.md`,
    actionable: true,
    blocked_by: [],
    container: false,
    stuck: false,
    ...overrides,
  };
}
