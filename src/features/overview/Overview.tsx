import { useEffect, useState } from "react";
import Lozenge from "@atlaskit/lozenge";
import { Inline, Text } from "@atlaskit/primitives";
import { useCandidates, useHealth, useStatus } from "../../api/queries";
import type { Status } from "../../api/types";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { useMode } from "../../modes/ModeContext";
import { ErrorNotice, BackendText, Loading } from "../../ui/Feedback";
import { Metric } from "../../ui/Metrics";
import { PageShell, Panel } from "../../ui/PageShell";
import { StatusLozenge } from "../../ui/StatusLozenge";

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
export default function Overview() {
  const m = useMessage();
  const f = useFormat();
  const { mode } = useMode();
  const { session } = useConnection();
  const status = useStatus();
  const health = useHealth();
  const candidates = useCandidates();
  const data = status.data;
  return <PageShell title="overview">
    {status.isPending && <Loading />}
    <ErrorNotice error={status.error} retry={() => void status.refetch()} />
    <div className="kpi-grid">
      <Metric label="equity" value={f.usd(data?.current_equity)} />
      <Metric label="openPositions" value={f.number(data?.open_positions)} />
      {mode === "expert" && <Metric label="drawdown" value={f.percent(data?.drawdown_pct)} />}
    </div>
    <Panel title="cycleState">
      <Inline space="space.150" shouldWrap alignBlock="center">
        <CycleBadge lastCycle={data?.last_cycle_at ?? null} />
        <StatusLozenge label={session.kind === "sample" ? "sample" : health.isError ? "unhealthy" : health.data ? "healthy" : "apiStatus"}
          appearance={session.kind === "sample" ? "new" : health.isError ? "removed" : health.data ? "success" : "default"} />
        {mode === "expert" && data && <>
          <StatusLozenge label={data.execution_mode} />
          <Text>{m("breaker")}</Text>
          <StatusLozenge label={data.breaker_open ? "breakerOpen" : "breakerClosed"} appearance={data.breaker_open ? "warning" : "default"} />
          <BackendText value={data.loop_state} />
        </>}
      </Inline>
      <Text>{candidates.data ? m("watching", { count: candidates.data.watched.length }) : m("unavailable")}</Text>
    </Panel>
  </PageShell>;
}
