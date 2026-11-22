import desk from "../../desk.module.css";
import EmptyState from "@atlaskit/empty-state";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { EquityPublication } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { chartTokens } from "../../theme/chartTokens";

export default function Sparkline({ history }: { history: EquityPublication[] }) {
  const m = useMessage();
  if (!history.length) return <EmptyState header={m("noEquity")} />;
  return <div className={desk["chart"] + " " + desk["sparkline"]} role="img" aria-label={m("equity")}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={[...history].sort((a, b) => a.as_of - b.as_of)}>
      <YAxis domain={["auto", "auto"]} hide />
      <Line dataKey="equity_usd" type="linear" stroke={chartTokens.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
