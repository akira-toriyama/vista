import { describe, expectTypeOf, it } from "vitest";
import type { ChecklistItem, Task, TaskDetail, TaskShard } from "./task";

/**
 * Shape pins for the codegen type (pnpm codegen). The contract test's schema
 * drift guard needs a live furrow binary; these pins catch a regenerated
 * `src/domain/generated/` changing the fields vista relies on even offline.
 */
describe("TaskShard (generated)", () => {
  it("pins the identity and ordering fields", () => {
    expectTypeOf<TaskShard["id"]>().toEqualTypeOf<string>();
    expectTypeOf<TaskShard["title"]>().toEqualTypeOf<string>();
    expectTypeOf<TaskShard["status"]>().toEqualTypeOf<string>();
    expectTypeOf<TaskShard["priority"]>().toEqualTypeOf<number>();
  });

  it("pins the optional 1..5 estimates and work-item type", () => {
    expectTypeOf<TaskShard["value"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<TaskShard["effort"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<TaskShard["type"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<TaskShard["parent"]>().toEqualTypeOf<string | undefined>();
  });

  it("pins the collection fields", () => {
    expectTypeOf<TaskShard["labels"]>().toEqualTypeOf<string[]>();
    expectTypeOf<TaskShard["repos"]>().toEqualTypeOf<string[]>();
    expectTypeOf<TaskShard["deps"]>().toEqualTypeOf<string[]>();
    expectTypeOf<TaskShard["refs"]>().toEqualTypeOf<string[]>();
    expectTypeOf<TaskShard["checklist"]>().toEqualTypeOf<ChecklistItem[]>();
    expectTypeOf<ChecklistItem>().toEqualTypeOf<{
      text: string;
      done: boolean;
    }>();
  });

  it("pins the timestamps (closed/reviewed are nullable, not optional)", () => {
    expectTypeOf<TaskShard["created"]>().toEqualTypeOf<string>();
    expectTypeOf<TaskShard["updated"]>().toEqualTypeOf<string>();
    expectTypeOf<TaskShard["closed"]>().toEqualTypeOf<string | null>();
    expectTypeOf<TaskShard["reviewed"]>().toEqualTypeOf<string | null>();
    expectTypeOf<TaskShard["body"]>().toEqualTypeOf<string>();
  });
});

describe("Task / TaskDetail (shard + furrow-computed)", () => {
  it("pins the computed flags a ls row adds", () => {
    expectTypeOf<Task["actionable"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Task["blocked_by"]>().toEqualTypeOf<string[]>();
    expectTypeOf<Task["container"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Task["stuck"]>().toEqualTypeOf<boolean>();
  });

  it("pins the resolved body a show adds", () => {
    expectTypeOf<TaskDetail["body_text"]>().toEqualTypeOf<string>();
  });
});
