import {
  FurrowError,
  kindForExitCode,
  type FurrowErrorEnvelope,
} from "@/application/furrow-error";
import type {
  AddTaskInput,
  FurrowPort,
  Placement,
  SetTaskPatch,
  TaskFilter,
} from "@/application/furrow-port";
import type { FurrowExec } from "./exec";

/**
 * The exec-agnostic core of the furrow adapter: builds argv for each port
 * method, interprets the exit-code/stderr contract, parses stdout JSON.
 * TauriFurrowAdapter feeds it an invoke-based exec; contract tests feed it
 * child_process so the exact same code path hits the real binary.
 *
 * subscribeTasksChanged is the one port member that cannot be expressed as
 * an exec call, so it stays with the concrete adapter.
 */
export type FurrowClient = Omit<FurrowPort, "subscribeTasksChanged">;

/** Placement as flags (`set`, and relative `reorder`; absolute reorder is positional). */
function placementFlags(placement: Placement): string[] {
  if ("priority" in placement) return ["-p", String(placement.priority)];
  return "before" in placement ? ["--before", placement.before] : ["--after", placement.after];
}

export function createFurrowClient(exec: FurrowExec): FurrowClient {
  async function run<T>(args: string[]): Promise<T> {
    const result = await exec(args);
    if (result.code !== 0) {
      const kind = kindForExitCode(result.code);
      let envelope: FurrowErrorEnvelope | undefined;
      try {
        envelope = (JSON.parse(result.stderr) as { error: FurrowErrorEnvelope }).error;
      } catch {
        envelope = undefined;
      }
      throw new FurrowError(kind, envelope?.message ?? `furrow exited ${result.code}: ${result.stderr}`, {
        exitCode: result.code,
        envelope,
      });
    }
    try {
      return JSON.parse(result.stdout) as T;
    } catch {
      throw new FurrowError("bad-output", `furrow ${args[0]} emitted unparsable JSON: ${result.stdout}`, {
        exitCode: result.code,
      });
    }
  }

  return {
    board: () => run(["board", "--json"]),

    listTasks: (filter?: TaskFilter) => {
      const args = ["ls", "--json"];
      if (filter?.lanes?.length) args.push("-s", filter.lanes.join(","));
      if (filter?.labels?.length) args.push("-l", filter.labels.join(","));
      if (filter?.repos?.length) args.push("-r", filter.repos.join(","));
      return run(args);
    },

    showTask: (id) => run(["show", id, "--json"]),

    addTask: (input: AddTaskInput) => {
      const args = ["add", input.title, "--json"];
      if (input.draft) args.push("--draft");
      if (input.status !== undefined) args.push("-s", input.status);
      if (input.priority !== undefined) args.push("-p", String(input.priority));
      if (input.value !== undefined) args.push("--value", String(input.value));
      if (input.effort !== undefined) args.push("--effort", String(input.effort));
      for (const label of input.labels ?? []) args.push("-l", label);
      for (const repo of input.repos ?? []) args.push("-r", repo);
      for (const dep of input.deps ?? []) args.push("--dep", dep);
      if (input.parent !== undefined) args.push("--parent", input.parent);
      if (input.body !== undefined) args.push("--body", input.body);
      for (const item of input.checklist ?? []) args.push("--check", item);
      if (input.type !== undefined) args.push("--type", input.type);
      return run(args);
    },

    moveTask: (id, lane) => run(["move", id, lane, "--json"]),

    setTask: (id, patch: SetTaskPatch) => {
      const args = ["set", id, "--json"];
      if (patch.status !== undefined) args.push("-s", patch.status);
      if (patch.placement !== undefined) args.push(...placementFlags(patch.placement));
      if (patch.value === null) args.push("--clear-value");
      else if (patch.value !== undefined) args.push("--value", String(patch.value));
      if (patch.effort === null) args.push("--clear-effort");
      else if (patch.effort !== undefined) args.push("--effort", String(patch.effort));
      for (const label of patch.addLabels ?? []) args.push("--add-label", label);
      for (const label of patch.removeLabels ?? []) args.push("--rm-label", label);
      if (patch.type !== undefined) args.push("--type", patch.type);
      return run(args);
    },

    reorderTask: (id, placement: Placement) =>
      "priority" in placement
        ? run(["reorder", id, String(placement.priority), "--json"])
        : run(["reorder", id, "--json", ...placementFlags(placement)]),

    doneTask: (id) => run(["done", id, "--json"]),

    retitleTask: (id, title) => run(["retitle", id, title, "--json"]),

    setChecklistItem: (id, index, done) =>
      run(["check", id, String(index), ...(done ? [] : ["--off"]), "--json"]),

    addDeps: (id, deps) => run(["dep", id, ...deps, "--json"]),

    removeDeps: (id, deps) => run(["dep", id, ...deps, "--rm", "--json"]),

    listDeps: (id) => run(["dep", id, "--list", "--json"]),
  };
}
