import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useConnection } from "../app/Connection";
import { queryPath } from "../lib/pagination";
import { request } from "./client";
import type { AuditPage, Candidates, Equity, Health, Position, RiskResponse, Status, TradePage } from "./types";

export function useData<T>(path: string, interval?: number) {
  const { session, generation } = useConnection();
  return useQuery({
    queryKey: [generation, path],
    queryFn: ({ signal }) => request<T>(path, { signal }),
    refetchInterval: interval,
    enabled: session.kind !== "connect",
  });
}
export const useHealth = () => useData<Health>("/api/v1/health", 5000);
export const useStatus = () => useData<Status>("/api/v1/status", 5000);
export const usePositions = () => useData<{items: Position[]}>("/api/v1/positions", 10000);
export const useEquity = () => useData<Equity>("/api/v1/equity", 30000);
export const useCandidates = () => useData<Candidates>("/api/v1/candidates", 10000);
export const useRisk = () => useData<RiskResponse>("/api/v1/risk");

export function useAudit(filters: { limit: number; since?: string }, enabled = true, scope = "audit") {
  const { session, generation } = useConnection();
  return useInfiniteQuery({
    queryKey: [generation, "audit", scope, filters],
    queryFn: ({ signal, pageParam }) => request<AuditPage>(queryPath("/api/v1/audit", { ...filters, cursor: pageParam }), { signal }),
    initialPageParam: null as number | null,
    getNextPageParam: page => page.next_cursor ?? undefined,
    enabled: enabled && session.kind !== "connect",
    refetchOnMount: "always",
  });
}

export function useTradeHistory() {
  const { session, generation } = useConnection();
  return useInfiniteQuery({
    queryKey: [generation, "trades"],
    queryFn: ({ signal, pageParam }) => request<TradePage>(queryPath("/trades", { cursor: pageParam, limit: 50 }), { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.next_cursor ?? undefined,
    enabled: session.kind !== "connect",
  });
}
