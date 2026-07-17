import { useTasksChangedInvalidation } from "@/application/hooks";

/**
 * App-lifetime behavior: keep every task query in sync with .furrow edits
 * made outside the GUI. Injects nothing into the presenter (yet).
 */
export function useApp(): Record<string, never> {
  useTasksChangedInvalidation();
  return {};
}
