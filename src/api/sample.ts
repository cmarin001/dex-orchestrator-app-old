import type { Candidates, Equity, JournalEvent, LiveView, Position, RiskResponse, Status, TradeHistoryRow, TradePage } from "./types";

const asOf = Date.now();
const entryAt = asOf - 750_000;
const market = { chain: "solana", token: "SOL-DEMO", pair: "SOL-USDC-DEMO" } as const;
const ladder = [{ at_sec: 0, target_profit_bps: 500 }, { at_sec: 600, target_profit_bps: 250 }, { at_sec: 900, target_profit_bps: 50 }];
const series: LiveView["series"] = Array.from({ length: 51 }, (_, i) => ({
  t: entryAt + i * 15_000,
  price: Number((145 + i * .045 + Math.sin(i * .55) * .55).toFixed(3)),
  source: "aggregated",
}));
export const samplePositions: LiveView[] = [{
  ...market, entry_price: 145, entry_at: entryAt, as_of: asOf,
  policy: { mode: "profit_only", entry_price: 145, entry_at: entryAt,
    min_profit_bps_for_exit: 25, timeout_ladder: ladder, max_hold_sec: 3600 },
  marks: [{ at: entryAt, side: "buy", price: 145, size_usd: 75, tx_hash: null }],
  series, current_mark: series.at(-1) ?? null, active_target_bps: 250, target_price: 148.625,
  target_series: [{ t: entryAt, price: 152.25 }, { t: entryAt + 600_000, price: 148.625 },
    { t: asOf, price: 148.625 }],
}];
const latest = { equity_usd: 1013.5, drawdown_pct: .013, win_rate: .75, expectancy_usd: 2.55, trades_closed: 4, as_of: asOf };
const equity: Equity = { latest, history: [latest, { ...latest, equity_usd: 1009.75, trades_closed: 3, as_of: asOf - 43_200_000 }] };
const risk: RiskResponse = { as_of: asOf, actor: "sample", config: {
  max_risk_pct_per_trade: .02, max_position_vs_pool_depth: .015, max_slippage_bps: 150,
  halt_new_entries_dd: .15, timeout_ladder: ladder,
} };
const scan: JournalEvent = { at: new Date(asOf).toISOString(), stage: "market_discovery", status: "ok",
  gaps: [], detail: { pools_scanned: 60, counts: { solana: 40, base: 20 }, triggers: ["new_pair", "vol_spike", "liq_spike"] } };
const trades: TradeHistoryRow[] = Array.from({ length: 4 }, (_, i) => {
  const exit = asOf - (i + 1) * 43_200_000;
  const stopped = i === 2;
  return { ...market, run_id: "sample-" + (i + 1), entry_at: exit - 720_000, exit_at: exit, hold_sec: 720,
    entry_price: 145, exit_price: stopped ? 142.97 : 152.25, size_usd: 75,
    pnl_usd: stopped ? -1.05 : 3.75, pnl_pct: stopped ? -1.4 : 5,
    exit_reason: stopped ? "stop" : "target", tx_entry: null, tx_exit: null };
});

export function sampleResponse(path: string): unknown {
  const url = new URL(path, "https://sample.invalid");
  if (url.pathname === "/api/v1/health") return { status: "ok", mode: "paper", journal_readable: true };
  if (url.pathname === "/api/v1/status") return { loop_state: "running", last_cycle_at: new Date().toISOString(), breaker_open: false, breaker_until: null, entries_paused: false, execution_mode: "paper", live_execution_enabled: false, open_positions: 1, current_equity: 1013.5, drawdown_pct: .013 } satisfies Status;
  if (url.pathname === "/api/v1/positions") return { items: [position] };
  if (url.pathname === "/api/v1/audit") {
    const events: JournalEvent[] = [scan, ...trades.map(trade => ({ at: new Date(trade.exit_at).toISOString(), stage: "executor", status: "paper_close", gaps: [], identity: trade, detail: trade }))];
    const since = url.searchParams.get("since");
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const end = Number(url.searchParams.get("cursor") ?? 0) + limit;
    const filtered = events.filter(event => !since || event.at >= since);
    return { items: filtered.slice(end - limit, end), next_cursor: end < filtered.length ? end : null };
  }
  if (url.pathname === "/live-view") return samplePositions;
  if (url.pathname === "/api/v1/equity") return equity;
  if (url.pathname === "/api/v1/risk") return risk;
  if (url.pathname === "/trades") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const token = url.searchParams.get("token");
    const items = trades.filter(trade => {
      const date = new Date(trade.exit_at).toISOString().slice(0, 10);
      return (!from || date >= from) && (!to || date <= to) && (!token || trade.token === token);
    });
    return { items, next_cursor: null } satisfies TradePage;
  }
  if (url.pathname === "/api/v1/candidates") return candidates;
  throw new Error("Unavailable in sample mode");
}

const position: Position = {
  ...market, run_id: "sample-open", cost_cents: 7500, entry_price_usd: 145,
  size_usd: 75, size_tokens: 75 / 145, age_sec: (asOf - entryAt) / 1000,
  mark: series.at(-1) ?? null, unrealized_pnl_usd: 75 * ((series.at(-1)?.price ?? 145) / 145 - 1),
  exit_policy: samplePositions[0].policy,
};
const candidates: Candidates = {
  watched: [market], scanner: [{ ...market, run_id: "sample-scanner", discovered_at: asOf,
    trigger: "new_pair", liquidity_usd: 147_300, vol_1h_usd: 58_100, age_sec: 2430, rank_score: .3944,
    reason: "Sample market passed the discovery filters.", skipped: false }],
};
