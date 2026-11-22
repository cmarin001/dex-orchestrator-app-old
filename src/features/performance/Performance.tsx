import { useState, type ReactNode } from "react";
import Lozenge from "@atlaskit/lozenge";
import desk from "../../desk.module.css";
import Button from "@atlaskit/button/new";
import EmptyState from "@atlaskit/empty-state";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { Stack, Text } from "@atlaskit/primitives";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEquity, useTradeHistory } from "../../api/queries";
import type { EquityPublication, TradeHistoryRow } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { chartTokens } from "../../theme/chartTokens";
import { SortOptions, useSortOptions, useSortOrder } from "../../ui/SortOptions";
import { DetailsDrawer } from "../../ui/DetailsDrawer";
import { DataTable } from "../../ui/DataTable";
import { BackendText, ErrorBoundary, ErrorNotice, Loading } from "../../ui/Feedback";
import { Metric } from "../../ui/Metrics";
import { DashboardGrid, PageShell, Panel } from "../../ui/PageShell";

function ChartTooltip({ active, label, payload, format }: {
  active?: boolean; label?: string | number; payload?: ReadonlyArray<{ value?: unknown }>;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length || typeof payload[0].value !== "number") return null;
  return <div className={desk["chart-tooltip"]}><Stack space="space.050">
    <Text>{label}</Text><code>{format(payload[0].value)}</code>
  </Stack></div>;
}
function ChartLegend({ label, negative }: { label: string; negative?: boolean }) {
  return <div className={desk["chart-legend"]}><span aria-hidden="true" className={negative ? desk["chart-swatch"] + " " + desk["chart-swatch-negative"] : desk["chart-swatch"]} /><Text>{label}</Text></div>;
}

export function EquityCharts({ history }: { history: EquityPublication[] }) {
  const m = useMessage();
  const f = useFormat();
  if (!history.length) return <EmptyState header={m("noEquity")} />;
  const rows = [...history].sort((a, b) => a.as_of - b.as_of);
  const xAxis = <XAxis dataKey="as_of" tickFormatter={v => f.date(Number(v))} stroke={chartTokens.axis} minTickGap={48} />;

  return <Stack space="space.400">
    <Panel title="equity">
      <ChartLegend label={m("equity")} />
      <div className={desk["chart"]} role="region" aria-label={m("equity")}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={rows}>
            {xAxis}<YAxis tickFormatter={v => f.usd(Number(v), 0)} stroke={chartTokens.axis} domain={["auto", "auto"]} />
            <Tooltip content={props => <ChartTooltip {...props} label={f.date(Number(props.label))} format={f.usd} />} />
            <Line dataKey="equity_usd" name={m("equity")} stroke={chartTokens.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
    <Panel title="drawdown"><ChartLegend label={m("drawdown")} negative /><div className={desk["chart"]} role="region" aria-label={m("drawdown")}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={rows}>
          {xAxis}<YAxis tickFormatter={v => f.percent(Number(v))} stroke={chartTokens.axis} />
          <Tooltip content={props => <ChartTooltip {...props} label={f.date(Number(props.label))} format={f.percent} />} />
          <Area dataKey="drawdown_pct" name={m("drawdown")} fill={chartTokens.negative} stroke={chartTokens.negative} fillOpacity={.15} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div></Panel>
  </Stack>;
}

function TradePanels({ latest, chart }: { latest?: EquityPublication | null; chart: ReactNode }) {
  const m = useMessage();
  const f = useFormat();
  const history = useTradeHistory();
  const trades = history.data?.pages.flatMap(page => page.items) ?? [];
  const [selected, setSelected] = useState<TradeHistoryRow>();
  const sorting = useSortOrder<TradeHistoryRow>();
  const sortOptions = useSortOptions(["entryTime", "entry", "exitPrice", "hold"]);
  const sorted = sorting.sort(trades, { entryTime: row => row.entry_at, entry: row => row.entry_price,
    exitPrice: row => row.exit_price, hold: row => row.hold_sec });
  const chainStats = new Map<string, number>();
  for (const trade of trades) chainStats.set(trade.chain, (chainStats.get(trade.chain) ?? 0) + trade.pnl_usd);
  const perChain = [...chainStats].map(([chain, pnl]) => ({ chain, pnl }));
  const averageHold = trades.length ? trades.reduce((total, trade) => total + trade.hold_sec, 0) / trades.length : null;
  return <>
    <DashboardGrid variant="metrics">
      <Metric label="winRate" value={f.percent(latest?.win_rate)} />
      <Metric label="expectancy" value={f.usd(latest?.expectancy_usd)} />
      <Metric label="holdTime" value={f.duration(averageHold)} detail={<Text size="small">{m("historyScope")}</Text>} />
      <Metric label="slippage" value={m("unavailable")} />
    </DashboardGrid>
    {chart}
    <ErrorNotice error={history.error} retry={() => void history.refetch()} />
    {history.isPending && <Loading />}
    <Tabs id="performance-trades">
      <TabList><Tab>{m("tradeHistory")}</Tab><Tab>{m("tradesOnChain")}</Tab></TabList>
      <TabPanel><div className={desk["tab-content"]}><Panel title="tradeHistory">
        {trades.length > 1 && <SortOptions {...sorting} options={sortOptions} />}
        {history.data && <DataTable key={sorting.field + sorting.descending} title="tradeHistory" empty="noTrades" sortable cards
          head={{ cells: (["token", "chain", "exitTime", "size", "realized", "details"] as const)
            .map(key => ({ key, content: m(key), isSortable: key !== "details" })) }}
          rows={sorted.map(row => ({ key: row.run_id + ":" + row.exit_at, cells: [
            { key: row.token, content: <code className={desk["table-id"]}>{row.token}</code> },
            { key: row.chain, content: <Lozenge>{row.chain}</Lozenge> },
            { key: row.exit_at, content: f.date(row.exit_at) },
            { key: row.size_usd, content: <code className={desk["numeric"]}>{f.usd(row.size_usd)}</code> },
            { key: row.pnl_usd, content: <code className={desk["numeric"]}>{f.usd(row.pnl_usd)}</code> },
            { content: <Button appearance="subtle" onClick={() => setSelected(row)}>{m("details")}</Button> },
          ] }))} />}
        {history.hasNextPage && <div><Button appearance="subtle" isLoading={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{m("loadMore")}</Button></div>}
      </Panel></div></TabPanel>
      <TabPanel><div className={desk["tab-content"]}><Panel title="tradesOnChain">
        <Text>{m("historyScope")}</Text>
        {perChain.length ? <div className={desk["chart"]} role="region" aria-label={m("tradesOnChain")}>
          <ErrorBoundary><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={perChain}>

            <XAxis dataKey="chain" stroke={chartTokens.axis} /><YAxis tickFormatter={v => f.usd(Number(v), 0)} stroke={chartTokens.axis} />
            <Tooltip content={props => <ChartTooltip {...props} format={f.usd} />} /><Bar dataKey="pnl" name={m("realized")} fill={chartTokens.series2} isAnimationActive={false} />
          </BarChart></ResponsiveContainer></ErrorBoundary>
        </div> : <EmptyState header={m("noTrades")} />}
      </Panel></div></TabPanel>
    </Tabs>
    {selected && <DetailsDrawer title="tradeHistory" onClose={() => setSelected(undefined)}>
      <Text>{m("entryTime")} {f.date(selected.entry_at)}</Text>
      <Text>{m("entry")} {f.usd(selected.entry_price, 8)}</Text>
      <Text>{m("exitPrice")} {f.usd(selected.exit_price, 8)}</Text>
      <Text>{m("hold")} {f.duration(selected.hold_sec)}</Text>
      <BackendText value={selected} />
    </DetailsDrawer>}
  </>;
}
export default function Performance() {
  const m = useMessage();
  const equity = useEquity();
  const latest = equity.data?.latest;
  return <PageShell title="performance">
    {equity.isPending && <Loading />}
    <ErrorNotice error={equity.error} retry={() => void equity.refetch()} />
    <ErrorBoundary resetKey={m("performance")}><TradePanels latest={latest}
      chart={equity.data && <ErrorBoundary><EquityCharts history={equity.data.history} /></ErrorBoundary>} /></ErrorBoundary>
  </PageShell>;
}
