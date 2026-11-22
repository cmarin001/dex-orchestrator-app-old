// Wire types mirrored from backend routes, schemas, and journal projections.
export type Chain = "ethereum" | "bsc" | "base" | "solana" | "polygon" | "arbitrum" | "optimism";
export interface Market { chain: Chain; token: string; pair: string }
export interface Handoff extends Market { run_id: string }
export interface TimeoutRung { at_sec: number; target_profit_bps: number }
export type ExitPolicy = {
  entry_price: number; entry_at: number; min_profit_bps_for_exit: number;
  timeout_ladder: TimeoutRung[]; max_hold_sec: number;
} & ({ mode: "profit_only" } | { mode: "stop_loss"; stop_loss_bps: number });
interface PricePoint { t: number; price: number }
export interface ChartPoint extends PricePoint { source: "dexscreener" | "geckoterminal" | "aggregated" }
interface PositionMark { side: "buy" | "sell"; at: number; price: number; size_usd: number; tx_hash: string | null }
export interface LiveView extends Market {
  entry_price: number; entry_at: number; policy: ExitPolicy; marks: PositionMark[];
  series: ChartPoint[]; active_target_bps: number; target_price: number;
  target_series: PricePoint[]; current_mark: ChartPoint | null; as_of: number;
}
export interface RiskConfig {
  max_risk_pct_per_trade: number; max_position_vs_pool_depth: number;
  max_slippage_bps: number; halt_new_entries_dd: number; timeout_ladder: TimeoutRung[];
}
export interface TradeHistoryRow extends Handoff {
  entry_at: number; exit_at: number; hold_sec: number; entry_price: number; exit_price: number;
  size_usd: number; pnl_usd: number; pnl_pct: number;
  exit_reason: "target" | "timeout" | "manual" | "stop"; tx_entry: string | null; tx_exit: string | null;
}
export interface JournalEvent {
  at: string; stage: string; status: string; gaps: string[]; identity?: Handoff; detail?: unknown;
  position?: Handoff & { cost_cents: number; entry_price_usd: number; exit_policy?: ExitPolicy; live_amount?: string; strategy_id?: string };
  close?: { exit_at: number; exit_price: number; exit_reason: TradeHistoryRow["exit_reason"]; proceeds_cents: number };
}
export interface RiskResponse { config: RiskConfig; as_of: number | null; actor: string | null }
export interface TradePage { items: TradeHistoryRow[]; next_cursor: string | null }
export interface AuditPage { items: JournalEvent[]; next_cursor: number | null }
export interface Health { status: "ok"; mode: "paper" | "live"; journal_readable: boolean }
export interface Status {
  loop_state: unknown; last_cycle_at: string | null; breaker_open: boolean; breaker_until: number | null;
  entries_paused: boolean; execution_mode: "paper" | "live"; live_execution_enabled: boolean;
  open_positions: number; current_equity: number | null; drawdown_pct: number | null;
}
export interface Position extends Handoff {
  cost_cents: number; entry_price_usd: number; exit_policy?: ExitPolicy; size_usd: number; size_tokens: number;
  live_amount?: string; strategy_id?: string;
  age_sec: number; mark: ChartPoint | null; unrealized_pnl_usd: number | null;
}
export interface EquityPublication {
  equity_usd: number; drawdown_pct: number; win_rate: number; expectancy_usd: number; trades_closed: number; as_of: number;
}
export interface Equity { latest: EquityPublication | null; history: EquityPublication[] }
export interface ScannerRow extends Handoff {
  discovered_at: number; trigger: string; liquidity_usd: number; vol_1h_usd: number;
  age_sec: number; rank_score: number; reason: string; skipped: boolean;
}
export interface Candidates { scanner: ScannerRow[] | null; watched: Market[] }
export type Controls = {
  pause: Record<string, never>; resume: Record<string, never>; "live-execution": { enabled: boolean };
  risk: { config: RiskConfig }; reject: Pick<Market, "chain" | "token">;
  exit: { run_id: string } | Pick<Market, "chain" | "token">;
};
export type Command = { [K in keyof Controls]: { type: K; payload: Controls[K] } }[keyof Controls];
export interface Receipt {
  request_id: string; actor: string; action: { type: keyof Controls } & Record<string, unknown>;
  state: "queued" | "applied" | "rejected"; gaps: string[];
}
