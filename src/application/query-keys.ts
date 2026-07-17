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
  // deps neighborhoods get their key here when the detail view (t-r7wr) lands
};

export const boardKeys = {
  info: ["board"] as const,
};
