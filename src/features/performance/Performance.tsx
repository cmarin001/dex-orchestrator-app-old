import Button from "@atlaskit/button/new";
import EmptyState from "@atlaskit/empty-state";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { Text } from "@atlaskit/primitives";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEquity, useTradeHistory } from "../../api/queries";
import type { EquityPublication } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { chartTokens } from "../../theme/chartTokens";
import { DataTable } from "../../ui/DataTable";
import { BackendText, ErrorBoundary, ErrorNotice, Loading } from "../../ui/Feedback";
import { Metric } from "../../ui/Metrics";
import { PageShell, Panel } from "../../ui/PageShell";

export function EquityCharts({ history }: { history: EquityPublication[] }) {
  const m = useMessage();
  const f = useFormat();
  if (!history.length) return <EmptyState header={m("noEquity")} />;
  const rows = [...history].sort((a, b) => a.as_of - b.as_of);
  const xAxis = <XAxis dataKey="as_of" tickFormatter={v => f.date(Number(v))} stroke={chartTokens.axis} minTickGap={48} />;
  const grid = <CartesianGrid stroke={chartTokens.grid} vertical={false} />;
  return <div className="two-column">
    <Panel title="equity">
      <div className="chart" role="region" aria-label={m("equity")}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={rows}>
            {grid}{xAxis}<YAxis tickFormatter={v => f.usd(Number(v), 0)} stroke={chartTokens.axis} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: chartTokens.surface, color: chartTokens.axis, borderColor: chartTokens.grid }} labelFormatter={v => f.date(Number(v))} formatter={v => f.usd(Number(v))} />
            <Line dataKey="equity_usd" name={m("equity")} stroke={chartTokens.series1} strokeWidth={2} dot={rows.length < 2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Text size="small" color="color.text.subtle">{m("chartBaseline", { value: m("unavailable") })}</Text>
    </Panel>
    <Panel title="drawdown"><div className="chart" role="region" aria-label={m("drawdown")}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={rows}>
          {grid}{xAxis}<YAxis tickFormatter={v => f.percent(Number(v))} stroke={chartTokens.axis} />
          <Tooltip contentStyle={{ background: chartTokens.surface, color: chartTokens.axis, borderColor: chartTokens.grid }} labelFormatter={v => f.date(Number(v))} formatter={v => f.percent(Number(v))} />
          <Area dataKey="drawdown_pct" name={m("drawdown")} fill={chartTokens.negative} stroke={chartTokens.negative} fillOpacity={.2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div></Panel>
  </div>;
}

function TradePanels() {
  const m = useMessage();
  const f = useFormat();
  const history = useTradeHistory();
  const trades = history.data?.pages.flatMap(page => page.items) ?? [];
  const chainStats = new Map<string, number>();
  for (const trade of trades) chainStats.set(trade.chain, (chainStats.get(trade.chain) ?? 0) + trade.pnl_usd);
  const perChain = [...chainStats].map(([chain, pnl]) => ({ chain, pnl }));
  const averageHold = trades.length ? trades.reduce((total, trade) => total + trade.hold_sec, 0) / trades.length : null;
  return <>
    <div className="kpi-grid">
      <Metric label="holdTime" value={f.duration(averageHold)} detail={<Text size="small">{m("historyScope")}</Text>} />
      <Metric label="slippage" value={m("unavailable")} />
    </div>
    <ErrorNotice error={history.error} retry={() => void history.refetch()} />
    {history.isPending && <Loading />}
    <Tabs id="performance-trades">
      <TabList><Tab>{m("tradeHistory")}</Tab><Tab>{m("tradesOnChain")}</Tab></TabList>
      <TabPanel><div className="tab-content"><Panel title="tradeHistory">
        {history.data && <DataTable title="tradeHistory" empty="noTrades" sortable
          head={{ cells: (["token", "chain", "entryTime", "exitTime", "entry", "exitPrice", "size", "realized", "hold", "reason"] as const)
            .map(key => ({ key, content: m(key), isSortable: key !== "reason" })) }}
          rows={trades.map(row => ({ key: row.run_id + ":" + row.exit_at, cells: [
            { key: row.token, content: row.token }, { key: row.chain, content: row.chain },
            { key: row.entry_at, content: f.date(row.entry_at) }, { key: row.exit_at, content: f.date(row.exit_at) },
            { key: row.entry_price, content: f.usd(row.entry_price, 8) }, { key: row.exit_price, content: f.usd(row.exit_price, 8) },
            { key: row.size_usd, content: f.usd(row.size_usd) }, { key: row.pnl_usd, content: f.usd(row.pnl_usd) },
            { key: row.hold_sec, content: f.duration(row.hold_sec) }, { content: <BackendText value={row.exit_reason} /> },
          ] }))} />}
        {history.hasNextPage && <div><Button isLoading={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{m("loadMore")}</Button></div>}
      </Panel></div></TabPanel>
      <TabPanel><div className="tab-content"><Panel title="tradesOnChain">
        <Text>{m("historyScope")}</Text>
        {perChain.length ? <div className="chart" role="region" aria-label={m("tradesOnChain")}>
          <ErrorBoundary><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={perChain}>
            <CartesianGrid stroke={chartTokens.grid} vertical={false} />
            <XAxis dataKey="chain" stroke={chartTokens.axis} /><YAxis tickFormatter={v => f.usd(Number(v), 0)} stroke={chartTokens.axis} />
            <Tooltip contentStyle={{ background: chartTokens.surface, color: chartTokens.axis, borderColor: chartTokens.grid }} formatter={v => f.usd(Number(v))} /><Bar dataKey="pnl" name={m("realized")} fill={chartTokens.series2} isAnimationActive={false} />
          </BarChart></ResponsiveContainer></ErrorBoundary>
        </div> : <EmptyState header={m("noTrades")} />}
      </Panel></div></TabPanel>
    </Tabs>
  </>;
}
export default function Performance() {
  const m = useMessage();
  const f = useFormat();
  const equity = useEquity();
  const latest = equity.data?.latest;
  return <PageShell title="performance">
    {equity.isPending && <Loading />}
    <ErrorNotice error={equity.error} retry={() => void equity.refetch()} />
    <div className="kpi-grid">
      <Metric label="winRate" value={f.percent(latest?.win_rate)} />
      <Metric label="expectancy" value={f.usd(latest?.expectancy_usd)} />
      <Metric label="closedTrades" value={f.number(latest?.trades_closed)} />
    </div>
    {equity.data && <ErrorBoundary><EquityCharts history={equity.data.history} /></ErrorBoundary>}
    <ErrorBoundary resetKey={m("performance")}><TradePanels /></ErrorBoundary>
  </PageShell>;
}
