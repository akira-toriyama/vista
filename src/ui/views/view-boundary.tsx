import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { FurrowError, type FurrowErrorKind } from "@/application/furrow-error";
import { Button } from "@/ui/primitives/button";

/** Human wording per furrow failure kind — each fails for a different reason. */
const KIND_HEADINGS: Record<FurrowErrorKind, string> = {
  "not-found": "Not found",
  validation: "furrow rejected the request",
  internal: "furrow failed internally",
  core: "furrow could not be launched",
  "bad-output": "furrow returned unexpected output",
};

export function ViewErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const heading =
    error instanceof FurrowError
      ? KIND_HEADINGS[error.kind]
      : "Something went wrong";
  const detail = error instanceof Error ? error.message : String(error);
  return (
    <div
      role="alert"
      className="flex h-full flex-col items-center justify-center gap-2 p-6"
    >
      <p className="text-sm font-medium">{heading}</p>
      <p className="max-w-md text-xs break-all text-muted-foreground">
        {detail}
      </p>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}

function ViewLoading() {
  return (
    <div
      role="status"
      className="flex h-full items-center justify-center text-sm text-muted-foreground"
    >
      Loading…
    </div>
  );
}

/**
 * Per-view error/loading skeleton: QueryErrorResetBoundary lets Retry clear
 * TanStack Query's error state so remounting refetches; Suspense pairs with
 * the useSuspenseQuery hooks so views read non-nullable data.
 */
export function ViewBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ViewErrorFallback}>
          <Suspense fallback={<ViewLoading />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
