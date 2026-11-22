import type { AuditPage, Health, LiveView, Position, Receipt, RiskResponse, Status, TradePage } from "../src/api/types";

export const origin = "http://localhost:3000";
export const token = "fixture-session-bearer";
export const market = { chain: "base", token: "0x0000000000000000000000000000000000000001", pair: "0x0000000000000000000000000000000000000002" } as const;
const entryAt = 1_750_000_000_000;
const ladder = [{ at_sec: 0, target_profit_bps: 500 }, { at_sec: 600, target_profit_bps: 200 }];
const policy = { mode: "profit_only", entry_price: 1, entry_at: entryAt,
  min_profit_bps_for_exit: 100, max_hold_sec: 2400, timeout_ladder: ladder } as const;
export const health = { status: "ok", mode: "live", journal_readable: true } satisfies Health;
export const status = (overrides: Partial<Status> = {}): Status => ({
  loop_state: "running", last_cycle_at: new Date().toISOString(), breaker_open: false, breaker_until: null,
  entries_paused: false, execution_mode: "live", live_execution_enabled: false, open_positions: 1,
  current_equity: 1250, drawdown_pct: 0.02, ...overrides,
});
export const liveView = {
  ...market, entry_price: 1, entry_at: entryAt, policy,
  current_mark: { t: entryAt + 1000, price: 1.25, source: "aggregated" },
  series: [{ t: entryAt, price: 1, source: "aggregated" }, { t: entryAt + 1000, price: 1.25, source: "aggregated" }],
  marks: [{ side: "buy", price: 1, at: entryAt, size_usd: 120, tx_hash: null }],
  target_price: 1.05, active_target_bps: 500, target_series: [{ t: entryAt, price: 1.05 }], as_of: entryAt + 1000,
} satisfies LiveView;
export const position = {
  ...market, run_id: "run-1", cost_cents: 12000, entry_price_usd: 1, size_usd: 120, size_tokens: 120,
  exit_policy: policy, age_sec: 600, mark: liveView.current_mark, unrealized_pnl_usd: 30,
} satisfies Position;
export const trades = {
  items: [{ ...market, run_id: "old-run", entry_at: entryAt - 60_000, exit_at: entryAt - 1000, hold_sec: 59,
    entry_price: 1, exit_price: 1.05, size_usd: 120, pnl_usd: 6, pnl_pct: 5,
    exit_reason: "target", tx_entry: null, tx_exit: null }],
  next_cursor: null,
} satisfies TradePage;
export const risk = {
  config: { max_risk_pct_per_trade: 0.02, max_position_vs_pool_depth: 0.01, max_slippage_bps: 150,
    halt_new_entries_dd: 0.15, timeout_ladder: ladder },
  as_of: entryAt, actor: "dashboard-operator",
} satisfies RiskResponse;
export const receipt = (id: string, state: Receipt["state"] = "queued"): Receipt => ({
  request_id: id, actor: "dashboard-operator", action: { type: "pause" }, state, gaps: [],
});
export const audit = {
  items: [{ at: new Date(entryAt).toISOString(), stage: "control", status: "ok", gaps: [],
    detail: { id: "applied-id", actor: "dashboard-operator", at: entryAt, request: "{}", action: { type: "risk", config: risk.config } } }],
  next_cursor: null,
} satisfies AuditPage;
