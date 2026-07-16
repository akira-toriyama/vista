/**
 * Raw result of one furrow invocation — mirrors src-tauri/src/exec.rs
 * ExecResult. The Rust side never interprets exit codes or stderr; that
 * happens here in TS (furrow-client.ts).
 */
export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs `furrow <args>` somewhere (Tauri invoke, child_process, …). */
export type FurrowExec = (args: string[]) => Promise<ExecResult>;
