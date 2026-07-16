import { invoke } from "@tauri-apps/api/core";

/**
 * Template smoke command. Exercises the invoke path (and its mockIPC test
 * harness) until TauriFurrowAdapter replaces it.
 */
export function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name });
}
