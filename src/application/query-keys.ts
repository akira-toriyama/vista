import type { TaskFilter } from "./furrow-port";

/**
 * queryKey hierarchy (design doc): ['tasks'] fans out to every task query,
 * so one invalidateQueries(taskKeys.all) after any write / fs event refreshes
 * lists, details and dep neighborhoods together.
 */
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filter?: TaskFilter) => [...taskKeys.lists(), filter ?? {}] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  deps: (id: string) => [...taskKeys.all, "deps", id] as const,
};

export const boardKeys = {
  info: ["board"] as const,
};
