/**
 * Pure dependency-DAG construction over furrow tasks. No layout, no React —
 * the Graph view feeds `edges` to elk.layered later. Direction is
 * dep → dependent so a layered left-to-right layout reads as "finish left,
 * unblock right".
 */

/** The minimum a task must carry to participate in the graph. */
export interface DepGraphTask {
  id: string;
  deps: string[];
}

export interface DepEdge {
  from: string;
  to: string;
}

/** A dep that points outside the given task set (e.g. filtered out). */
export interface DanglingDep {
  taskId: string;
  depId: string;
}

export interface DepGraph<T extends DepGraphTask> {
  nodes: T[];
  edges: DepEdge[];
  dangling: DanglingDep[];
}

export function buildDepGraph<T extends DepGraphTask>(
  tasks: readonly T[],
): DepGraph<T> {
  const ids = new Set(tasks.map((t) => t.id));
  const edges: DepEdge[] = [];
  const dangling: DanglingDep[] = [];
  for (const task of tasks) {
    for (const dep of task.deps) {
      if (ids.has(dep)) {
        edges.push({ from: dep, to: task.id });
      } else {
        dangling.push({ taskId: task.id, depId: dep });
      }
    }
  }
  return { nodes: [...tasks], edges, dangling };
}
