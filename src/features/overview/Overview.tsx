import desk from "../../desk.module.css";
import { useEffect, useState } from "react";
import Lozenge from "@atlaskit/lozenge";
import EmptyState from "@atlaskit/empty-state";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { useAudit, useCandidates, useEquity, useHealth, usePositions, useStatus } from "../../api/queries";
import type { Status } from "../../api/types";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { useMode } from "../../modes/ModeContext";
import { ErrorNotice, BackendText, Loading } from "../../ui/Feedback";
import { Metric } from "../../ui/Metrics";
import { DashboardGrid, PageShell, Panel } from "../../ui/PageShell";
import { StatusLozenge } from "../../ui/StatusLozenge";
import { AuditTimeline } from "../audit/Audit";

const Sparkline = lazy(() => import("./Sparkline"));

const configuredInterval = Number(import.meta.env.VITE_EXPECTED_CYCLE_INTERVAL_MS);
export const expectedInterval = configuredInterval > 0 && Number.isFinite(configuredInterval) ? configuredInterval : 90_000;

export function CycleBadge({ lastCycle }: { lastCycle: Status["last_cycle_at"] }) {
  const m = useMessage();
  const f = useFormat();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lastCycle]);
  const elapsed = lastCycle ? Math.max(0, now - Date.parse(lastCycle)) : NaN;
  const stale = !Number.isFinite(elapsed) || elapsed > 2 * expectedInterval;
  return <Lozenge appearance={stale ? "warning" : "default"} testId={stale ? "cycle-stale" : "cycle-recorded"}>
    {Number.isFinite(elapsed) ? m("cycle", { time: f.duration(elapsed / 1000) }) : m("never")}
  </Lozenge>;
}
function ExpertOverview() {
  const m = useMessage();
  const equity = useEquity();
  const audit = useAudit({ limit: 10 }, true, "overview");
  return <>
    <Panel title="equity" actions={<Link to="/performance">{m("performance")}</Link>}>
      {equity.isPending && <Loading />}
      <ErrorNotice error={equity.error} retry={() => void equity.refetch()} />
      {equity.data && <Suspense fallback={<Loading />}><Sparkline history={equity.data.history} /></Suspense>}
    </Panel>
    <Panel title="recentActivity" actions={<Link to="/audit">{m("audit")}</Link>}>
      {audit.isPending && <Loading />}
      <ErrorNotice error={audit.error} retry={() => void audit.refetch()} />
      {audit.data && <AuditTimeline events={audit.data.pages[0]?.items ?? []} />}
    </Panel>
  </>;
}

export default function Overview() {
  const m = useMessage();
  const f = useFormat();
  const { mode } = useMode();
  const { session } = useConnection();
  const status = useStatus();
  const health = useHealth();
  const candidates = useCandidates();
  const positions = usePositions();
  const data = status.data;
  const expert = mode === "expert";
  return <PageShell title="overview" actions={session.kind === "sample" && <Link to="/connect">{m("connect")}</Link>}>
    {status.isPending && <Loading />}
    <ErrorNotice error={status.error} retry={() => void status.refetch()} />
    <DashboardGrid variant="metrics">
      <Metric label="equity" value={f.usd(data?.current_equity)} />
      <Metric label="openPositions" value={f.number(data?.open_positions)} />
      {expert && <Metric label="lastCycle" value={<CycleBadge lastCycle={data?.last_cycle_at ?? null} />} />}
      {expert && <Metric label="drawdown" value={f.percent(data?.drawdown_pct)} />}
    </DashboardGrid>
    <DashboardGrid>
      <Panel title="positions" actions={<Link to="/positions">{m("positions")}</Link>}>
        {positions.isPending && <Loading />}
        <ErrorNotice error={positions.error} retry={() => void positions.refetch()} />
        {positions.data && (positions.data.items.length
          ? <Stack as="ul" space="space.100">{positions.data.items.slice(0, 5).map(position => <li key={position.run_id + position.token} className={desk["audit-row"]}>
            <Inline shouldWrap spread="space-between" space="space.100">
              <code className={desk["table-id"]}>{position.token}</code><Text>{position.chain}</Text><code>{f.usd(position.unrealized_pnl_usd)}</code>
            </Inline>
          </li>)}</Stack> : <EmptyState header={m("noPositions")} />)}
      </Panel>
      <Panel title="cycleState" actions={expert && <Link to="/candidates">{m("candidates")}</Link>}>
        <Inline space="space.150" shouldWrap alignBlock="center">
          {!expert && <CycleBadge lastCycle={data?.last_cycle_at ?? null} />}
          <StatusLozenge label={session.kind === "sample" ? "sample" : health.isError ? "unhealthy" : health.data ? "healthy" : "apiStatus"}
            appearance={session.kind === "sample" ? "default" : health.isError ? "removed" : health.data ? "success" : "default"} />
          {expert && data && <>
            <StatusLozenge label={data.execution_mode} />
            <Text>{m("breaker")}</Text>
            <StatusLozenge label={data.breaker_open ? "breakerOpen" : "breakerClosed"} appearance={data.breaker_open ? "warning" : "default"} />
            <BackendText value={data.loop_state} />
          </>}
        </Inline>
        {candidates.isPending && <Loading />}
        <ErrorNotice error={candidates.error} retry={() => void candidates.refetch()} />
        {candidates.data && <Text>{m("watching", { count: candidates.data.watched.length })}</Text>}
        {expert && candidates.data && (candidates.data.watched.length
          ? <Stack as="ul" space="space.100">{candidates.data.watched.slice(0, 5).map(target => <li key={target.chain + target.pair} className={desk["audit-row"]}>
            <Inline shouldWrap space="space.100"><code className={desk["table-id"]}>{target.token}</code><Text>{target.chain}</Text></Inline>
          </li>)}</Stack> : <EmptyState header={m("noWatched")} />)}
      </Panel>
    </DashboardGrid>
    {expert && <ExpertOverview />}
  </PageShell>;
}
