/**
 * furrow task id (e.g. "t-2tbn").
 *
 * Branded so ids can't be confused with arbitrary strings. The canonical
 * Task model is code-generated from `furrow schema` (see design doc); this
 * module only holds the id primitive needed before codegen lands.
 */
export type TaskId = string & { readonly __brand: "TaskId" };

const TASK_ID_PATTERN = /^t-[a-z0-9]+$/;

export function isTaskId(value: string): value is TaskId {
  return TASK_ID_PATTERN.test(value);
}

export function asTaskId(value: string): TaskId {
  if (!isTaskId(value)) {
    throw new Error(`invalid task id: ${JSON.stringify(value)}`);
  }
  return value;
}
