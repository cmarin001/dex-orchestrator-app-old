import { useEffect, useMemo, useState } from "react";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import InlineMessage from "@atlaskit/inline-message";
import EmptyState from "@atlaskit/empty-state";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { useAudit, usePositions, useTradeHistory } from "../../api/queries";
import { isPending, useCommands, useExit } from "../../api/mutations";
import { useLiveView } from "../../api/sse";
import type { Controls, LiveView, Position } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { useMode } from "../../modes/ModeContext";
import { AuditTimeline } from "../audit/Audit";
import { DetailsDrawer } from "../../ui/DetailsDrawer";
import { SelectField } from "../../ui/SelectField";
import { ControlButton } from "../../ui/ControlButton";
import { DataTable } from "../../ui/DataTable";
import { BackendText, ErrorBoundary, ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell, Panel } from "../../ui/PageShell";
import { InlineReceipts } from "../../ui/ReceiptBadge";
import { PriceChart } from "./PriceChart";

const identity = (p: Pick<Position, "chain" | "token" | "pair" | "run_id">) => [p.chain, p.token, p.pair, p.run_id].join(":");

function PositionAudit({ position }: { position: Position }) {
  const m = useMessage();
  const audit = useAudit({ limit: 100 }, true, "position");
  const events = audit.data?.pages.flatMap(page => page.items).filter(event => {
    const market = event.identity ?? event.position;
    return market && identity(market) === identity(position);
  }) ?? [];
  return <Panel title="auditTrail">
    {audit.isPending && <Loading />}
    <ErrorNotice error={audit.error} retry={() => void audit.refetch()} />
    {audit.data && <AuditTimeline events={events} />}
    {audit.hasNextPage && <div><Button isLoading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{m("loadMore")}</Button></div>}
  </Panel>;
}

function PositionDetails({ position, onClose }: { position: Position; onClose: () => void }) {
  const m = useMessage();
  const f = useFormat();
  const { mode } = useMode();
  return <DetailsDrawer title="positionDetails" onClose={onClose}>
        <BackendText value={{ token: position.token, chain: position.chain, run_id: position.run_id }} />
        <Inline space="space.200" shouldWrap>
          <Text>{m("size")} {f.usd(position.size_usd)}</Text>
          <Text>{m("pnl")} {f.usd(position.unrealized_pnl_usd)}</Text>
          <Text>{m("age")} {f.duration(position.age_sec)}</Text>
        </Inline>
        {mode === "expert" && <ExpertPosition position={position} />}
  </DetailsDrawer>;
}
function ExpertPosition({ position }: { position: Position }) {
  const m = useMessage();
  const f = useFormat();
  const { data, disconnected, reconnect } = useLiveView();
  const [last, setLast] = useState<LiveView>();
  const [showAudit, setShowAudit] = useState(false);
  const current = data.find(item => item.token === position.token && item.chain === position.chain && item.pair === position.pair &&
    (position.exit_policy?.entry_at == null || item.entry_at === position.exit_policy.entry_at));
  useEffect(() => { if (current) setLast(current); }, [current]);
  const tradeHistory = useTradeHistory();
  const liveView = current ?? last;
  const view = useMemo(() => {
    if (!liveView) return undefined;
    const closed = tradeHistory.data?.pages.flatMap(page => page.items).find(trade => identity(trade) === identity(position) && trade.entry_at === liveView.entry_at);
    if (!closed || liveView.marks.some(mark => mark.side === "sell" && mark.at === closed.exit_at)) return liveView;
    return { ...liveView, marks: [...liveView.marks, { side: "sell" as const, at: closed.exit_at,
      price: closed.exit_price, size_usd: closed.size_usd, tx_hash: closed.tx_exit }] };
  }, [liveView, tradeHistory.data, position]);
  return <>
    <Inline space="space.200" shouldWrap>
      <Text>{m("entry")} {f.usd(position.entry_price_usd, 8)}</Text>
      <Text>{m("mark")} {f.usd(current?.current_mark?.price ?? position.mark?.price, 8)}</Text>
    </Inline>
    <Panel title="exitPolicy">{position.exit_policy ? <>
      <Text>{m(position.exit_policy.mode === "stop_loss" ? "stopLoss" : "profitOnly")}</Text>
      <Text>{m("minProfit")} {f.bps(position.exit_policy.min_profit_bps_for_exit)}</Text>
      <Text>{m("maxHold")} {f.duration(position.exit_policy.max_hold_sec)}</Text>
      {position.exit_policy.mode === "stop_loss" && <Text>{m("stopLoss")} {f.bps(position.exit_policy.stop_loss_bps)}</Text>}
      <BackendText value={position.exit_policy} />
    </> : <Text>{m("unavailable")}</Text>}</Panel>
    <Panel title="priceChart">
      {disconnected && <Inline space="space.150" shouldWrap>
        <InlineMessage appearance="warning" title={m("streamDropped")} />
        <Button onClick={reconnect}>{m("reconnect")}</Button>
      </Inline>}
      {view ? <><Text>{m("activeTarget")} {f.bps(view.active_target_bps)}</Text>
        <ErrorBoundary><PriceChart view={view} /></ErrorBoundary></> : <EmptyState header={m("noLiveView")} />}
    </Panel>
    {showAudit ? <PositionAudit position={position} />
      : <div><Button onClick={() => setShowAudit(true)}>{m("auditTrail")}</Button></div>}
  </>;
}
function ExitAction({ position, selector }: { position: Position; selector: Controls["exit"] | null }) {
  const m = useMessage();
  const exit = useExit();
  const { items } = useCommands();
  const scope = "exit:" + identity(position);
  return <Stack space="space.100">
    <ControlButton title="exit" help="exitHelp" current={<BackendText value={{ run_id: position.run_id, chain: position.chain, token: position.token }} />}
      disabled={!selector || !position.exit_policy || items.some(item => item.scope === scope && isPending(item))}
      onConfirm={() => { if (selector) exit(selector, scope); }} />
    {!selector && <Text size="small">{m("ambiguousPosition")}</Text>}
    <InlineReceipts scope={scope} />
  </Stack>;
}

export default function Positions() {
  const m = useMessage();
  const f = useFormat();
  const { mode } = useMode();
  const expert = mode === "expert";
  const positions = usePositions();
  const [selected, setSelected] = useState<Position>();
  const [filter, setFilter] = useState("");
  const [chain, setChain] = useState("");
  const all = positions.data?.items ?? [];
  const shown = expert ? all.filter(p => (!chain || p.chain === chain) && p.token.toLowerCase().includes(filter.trim().toLowerCase())) : all;
  const chains = [{ label: m("allChains"), value: "" }, ...Array.from(new Set(all.map(p => p.chain))).sort().map(chain => ({ label: chain, value: chain }))];
  const exitSelector = (p: Position): Controls["exit"] | null => {
    if (all.filter(row => row.run_id === p.run_id).length === 1) return { run_id: p.run_id };
    if (all.filter(row => row.chain === p.chain && row.token === p.token).length === 1) return { chain: p.chain, token: p.token };
    return null;
  };
  const columns = ["token", "chain", "size", "pnl", "age", "details", ...(expert ? ["entry", "mark", "action"] as const : [])] as const;
  return <PageShell title="positions">
    {expert && <Inline space="space.200" shouldWrap alignBlock="end">
      <Stack space="space.050"><label htmlFor="positions-filter">{m("filter")}</label>
        <TextField id="positions-filter" value={filter} onChange={event => setFilter(event.currentTarget.value)} /></Stack>
      <div className="filter-field"><SelectField id="positions-chain" label="chain" options={chains} value={chain} onChange={setChain} /></div>
    </Inline>}
    {positions.isPending && <Loading />}
    <ErrorNotice error={positions.error} retry={() => void positions.refetch()} />
    {positions.data && <DataTable title="positions" empty="noPositions" sortable={expert}
      head={{ cells: columns.map(key => ({ key, content: m(key), isSortable: expert && key !== "details" && key !== "action" })) }}
      rows={[...shown].sort((a, b) => a.chain.localeCompare(b.chain)).map(p => ({ key: identity(p), cells: [
        { key: p.token, content: <span className="table-id">{p.token}</span> },
        { key: p.chain, content: p.chain }, { key: p.size_usd, content: f.usd(p.size_usd) },
        { key: p.unrealized_pnl_usd ?? undefined, content: f.usd(p.unrealized_pnl_usd) },
        { key: p.age_sec, content: f.duration(p.age_sec) },
        { key: "detail", content: <Button appearance="subtle" aria-label={m("showPosition", { token: p.token })} onClick={() => setSelected(p)}>{m("details")}</Button> },
        ...(expert ? [
          { key: p.entry_price_usd, content: f.usd(p.entry_price_usd, 8) },
          { key: p.mark?.price, content: f.usd(p.mark?.price, 8) },
          { key: "action", content: <ExitAction position={p} selector={exitSelector(p)} /> },
        ] : []),
      ] }))} />}
    {selected && <PositionDetails position={all.find(p => identity(p) === identity(selected)) ?? selected} onClose={() => setSelected(undefined)} />}
  </PageShell>;
}
