import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { laneCards, optimisticPriority, type DropPlan } from "@/domain/kanban";
import type { Lane, Task } from "@/domain/task";
import type { TaskFilter } from "./furrow-port";
import { useFurrowPort } from "./FurrowPortContext";
import { boardKeys, taskKeys } from "./query-keys";

/**
 * Suspense queries: loading is the nearest <Suspense>, failure the nearest
 * ErrorBoundary (ViewBoundary), so views read `data` as non-nullable.
 */
export function useBoardInfo() {
  const port = useFurrowPort();
  return useSuspenseQuery({
    queryKey: boardKeys.info,
    queryFn: () => port.board(),
  });
}

export function useTaskList(filter?: TaskFilter) {
  const port = useFurrowPort();
  return useSuspenseQuery({
    queryKey: taskKeys.list(filter),
    queryFn: () => port.listTasks(filter),
  });
}

export function useTaskDetail(id: string) {
  const port = useFurrowPort();
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => port.showTask(id),
  });
}

/**
 * Every write invalidates the whole ['tasks'] subtree: any mutation can flip
 * other rows' actionable/blocked_by, so per-key surgery would be wrong, and
 * furrow reads are cheap local execs. The fs watcher fires too — TanStack
 * dedupes the refetch.
 */
function useTaskMutation<TInput>(
  write: (input: TInput) => Promise<unknown>,
): UseMutationResult<unknown, Error, TInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useMoveTask() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, lane }: { id: string; lane: Lane }) =>
    port.moveTask(id, lane),
  );
}

/** One board drop, as planned by domain planDrop. */
export interface DropTaskInput {
  id: string;
  targetLane: Lane;
  plan: DropPlan;
  /** the filter behind the board's list query — names the cache entry to patch. */
  filter?: TaskFilter;
}

/**
 * Execute a drop plan as its single furrow write, with an optimistic cache
 * patch so the card lands instantly (no spinner): reorder → `reorder`,
 * cross-lane with position → `set -s --before/--after`, into an empty
 * column → `move`. Rolled back on error, reconciled by the settle refetch.
 */
export function useDropTask(): UseMutationResult<
  unknown,
  Error,
  DropTaskInput
> {
  const port = useFurrowPort();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetLane, plan }: DropTaskInput) => {
      if (plan.kind === "reorder") return port.reorderTask(id, plan.placement);
      if (plan.placement !== undefined)
        return port.setTask(id, {
          status: targetLane,
          placement: plan.placement,
        });
      return port.moveTask(id, targetLane);
    },
    onMutate: async ({ id, targetLane, plan, filter }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const key = taskKeys.list(filter);
      const snapshot = queryClient.getQueryData<Task[]>(key);
      if (snapshot !== undefined) {
        const targetCards = laneCards({ tasks: snapshot, lane: targetLane });
        queryClient.setQueryData<Task[]>(
          key,
          snapshot.map((task) => {
            if (task.id !== id) return task;
            const priority =
              plan.placement === undefined
                ? task.priority
                : optimisticPriority({
                    cards: targetCards,
                    placement: plan.placement,
                    draggedId: id,
                  });
            return { ...task, status: targetLane, priority };
          }),
        );
      }
      return { key, snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined)
        queryClient.setQueryData(context.key, context.snapshot);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

/**
 * Glue between the .furrow fs watcher and TanStack Query: any on-disk change
 * (Claude Code editing the board from the CLI, a git pull, …) refetches every
 * task query and the board vocabulary. Mount once at the app root.
 */
export function useTasksChangedInvalidation() {
  const port = useFurrowPort();
  const queryClient = useQueryClient();
  useEffect(() => {
    return port.subscribeTasksChanged(() => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: boardKeys.info });
    });
  }, [port, queryClient]);
}
