import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import type { Lane } from "@/domain/task";
import type { AddTaskInput, SetTaskPatch, TaskFilter } from "./furrow-port";
import { useFurrowPort } from "./furrow-port-context";
import { boardKeys, taskKeys } from "./query-keys";

export function useBoardInfo() {
  const port = useFurrowPort();
  return useQuery({ queryKey: boardKeys.info, queryFn: () => port.board() });
}

export function useTaskList(filter?: TaskFilter) {
  const port = useFurrowPort();
  return useQuery({ queryKey: taskKeys.list(filter), queryFn: () => port.listTasks(filter) });
}

export function useTaskDetail(id: string) {
  const port = useFurrowPort();
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: () => port.showTask(id) });
}

export function useDepNeighborhood(id: string) {
  const port = useFurrowPort();
  return useQuery({ queryKey: taskKeys.deps(id), queryFn: () => port.listDeps(id) });
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

export function useAddTask() {
  const port = useFurrowPort();
  return useTaskMutation((input: AddTaskInput) => port.addTask(input));
}

export function useMoveTask() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, lane }: { id: string; lane: Lane }) => port.moveTask(id, lane));
}

export function useSetTask() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, patch }: { id: string; patch: SetTaskPatch }) =>
    port.setTask(id, patch),
  );
}

export function useDoneTask() {
  const port = useFurrowPort();
  return useTaskMutation((id: string) => port.doneTask(id));
}

export function useRetitleTask() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, title }: { id: string; title: string }) =>
    port.retitleTask(id, title),
  );
}

export function useSetChecklistItem() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, index, done }: { id: string; index: number; done: boolean }) =>
    port.setChecklistItem(id, index, done),
  );
}

export function useAddDeps() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, deps }: { id: string; deps: string[] }) => port.addDeps(id, deps));
}

export function useRemoveDeps() {
  const port = useFurrowPort();
  return useTaskMutation(({ id, deps }: { id: string; deps: string[] }) =>
    port.removeDeps(id, deps),
  );
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
