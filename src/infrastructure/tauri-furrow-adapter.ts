import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { FurrowError, type CoreErrorShape } from "@/application/furrow-error";
import type { FurrowPort } from "@/application/furrow-port";
import type { ExecResult } from "./exec";
import { createFurrowClient } from "./furrow-client";

/** Must match src-tauri/src/commands.rs TASKS_CHANGED_EVENT. */
export const TASKS_CHANGED_EVENT = "tasks://changed";

function toCoreError(e: unknown): FurrowError {
  const core = e as Partial<CoreErrorShape>;
  return new FurrowError("core", core.message ?? String(e), {
    coreCode: core.code,
  });
}

/**
 * The production FurrowPort: furrow runs on the Rust side (host binary,
 * board-root cwd), .furrow changes arrive as Tauri events. This is the only
 * module that touches @tauri-apps/* at runtime.
 */
export function createTauriFurrowAdapter(): FurrowPort {
  const client = createFurrowClient(async (args) => {
    try {
      return await invoke<ExecResult>("furrow_exec", { args });
    } catch (e) {
      throw toCoreError(e);
    }
  });

  let watchStarted = false;

  return {
    ...client,

    subscribeTasksChanged(onChange) {
      if (!watchStarted) {
        // idempotent on the Rust side; failure only degrades live refresh,
        // reads/writes still work, so log loudly instead of crashing the UI
        watchStarted = true;
        invoke("watch_start").catch((e: unknown) => {
          watchStarted = false;
          console.error("vista: watch_start failed — live refresh disabled", e);
        });
      }
      let cancelled = false;
      let unlisten: UnlistenFn | undefined;
      listen(TASKS_CHANGED_EVENT, () => {
        onChange();
      })
        .then((fn) => {
          if (cancelled) fn();
          else unlisten = fn;
        })
        .catch((e: unknown) => {
          console.error("vista: tasks://changed listen failed", e);
        });
      return () => {
        cancelled = true;
        unlisten?.();
      };
    },
  };
}
