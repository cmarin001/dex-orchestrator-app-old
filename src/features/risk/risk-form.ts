import type { RiskConfig } from "../../api/types";

export const fields = [
  ["max_risk_pct_per_trade", "riskPerTrade", 1],
  ["max_position_vs_pool_depth", "riskPool", 1],
  ["max_slippage_bps", "riskSlippage", 1000],
  ["halt_new_entries_dd", "riskDrawdown", 1],
] as const;

export function validRisk(config: RiskConfig) {
  return fields.every(([name, , max]) => {
    const value = config[name];
    return Number.isFinite(value) && value <= max &&
      (name === "max_slippage_bps" ? Number.isInteger(value) && value >= 0 : value > 0);
  }) && config.timeout_ladder.length > 0 && config.timeout_ladder.length <= 20 &&
    config.timeout_ladder[0].at_sec === 0 && config.timeout_ladder.every((rung, index, ladder) => {
      const previous = ladder[index - 1];
      return Number.isInteger(rung.at_sec) && rung.at_sec >= 0 &&
        Number.isInteger(rung.target_profit_bps) && rung.target_profit_bps >= 1 && rung.target_profit_bps <= 10_000 &&
        (!previous || previous.at_sec < rung.at_sec && previous.target_profit_bps >= rung.target_profit_bps);
    });
}
