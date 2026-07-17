/**
 * Typed error contract for everything that crosses the furrow boundary.
 * Exit-code semantics (design doc): 0 ok / 1 not-found / 2 validation /
 * 3+ internal. stderr carries {"error":{code,message,id?,details?}}.
 * "core" wraps the Rust side's CoreError (spawn/locate/config failures),
 * "bad-output" means furrow exited 0 but stdout was not the JSON we expect.
 */
export type FurrowErrorKind =
  "not-found" | "validation" | "internal" | "core" | "bad-output";

/** stderr envelope emitted by furrow on non-zero exit. */
export interface FurrowErrorEnvelope {
  code: number;
  message: string;
  id?: string;
  details?: unknown;
}

/** Rust CoreError shape rejected by invoke() (see src-tauri/src/error.rs). */
export interface CoreErrorShape {
  code: string;
  message: string;
}

export class FurrowError extends Error {
  readonly kind: FurrowErrorKind;
  /** furrow's process exit code, when the failure came from furrow itself. */
  readonly exitCode?: number;
  /** parsed stderr envelope, when furrow emitted one. */
  readonly envelope?: FurrowErrorEnvelope;
  /** CoreError.code (e.g. "spawn-failed"), when the Rust side failed. */
  readonly coreCode?: string;

  constructor(
    kind: FurrowErrorKind,
    message: string,
    opts: {
      exitCode?: number;
      envelope?: FurrowErrorEnvelope;
      coreCode?: string;
    } = {},
  ) {
    super(message);
    this.name = "FurrowError";
    this.kind = kind;
    this.exitCode = opts.exitCode;
    this.envelope = opts.envelope;
    this.coreCode = opts.coreCode;
  }
}

export function kindForExitCode(code: number): FurrowErrorKind {
  if (code === 1) return "not-found";
  if (code === 2) return "validation";
  return "internal";
}
