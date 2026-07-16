import { QueryClient } from "@tanstack/react-query";

/**
 * Data is local plain text, not a network resource: it never goes stale on
 * its own (staleTime Infinity) — the .furrow watcher invalidates instead.
 * networkMode 'always' because there is no network; the offline heuristics
 * would otherwise pause queries. No retries: furrow is deterministic, a
 * failure retried is the same failure with worse latency.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        networkMode: "always",
        retry: false,
      },
      mutations: {
        networkMode: "always",
        retry: false,
      },
    },
  });
}
