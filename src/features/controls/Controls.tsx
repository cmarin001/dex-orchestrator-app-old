import { lazy, Suspense } from "react";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import EmptyState from "@atlaskit/empty-state";
import { useConnection } from "../../app/Connection";
import { isPending, useCommands, useLiveExecution, usePause, useResume } from "../../api/mutations";
import { useStatus } from "../../api/queries";
import { useMessage } from "../../i18n/messages";
import { useMode } from "../../modes/ModeContext";
import { ControlButton } from "../../ui/ControlButton";
import { ErrorNotice, Loading } from "../../ui/Feedback";
import { DashboardGrid, PageShell, Panel } from "../../ui/PageShell";
import { InlineReceipts, ReceiptBadge } from "../../ui/ReceiptBadge";
import { StatusLozenge } from "../../ui/StatusLozenge";

const OperatingControls = lazy(() => import("./OperatingControls"));

export default function Controls() {
  const status = useStatus();
  const pause = usePause();
  const resume = useResume();
  const toggleLive = useLiveExecution();
  const { items } = useCommands();
  const { session } = useConnection();
  const { mode } = useMode();
  const m = useMessage();
  const data = status.data;
  const paused = !!data?.entries_paused;
  const armed = !!data?.live_execution_enabled;
  const recent = items.filter(item => !item.dismissed && !["entries", "execution"].includes(item.scope));
  const pending = items.some(isPending);
  return <PageShell title="controls">
    <ErrorNotice error={status.error} retry={() => void status.refetch()} />
    {status.isPending && <Loading />}
    {session.kind === "sample" && <Text>{m("sampleControls")}</Text>}
    <DashboardGrid variant={mode === "expert" ? "split" : "full"}><Stack space="space.300"><Panel title="controls">
      <Inline space="space.200" shouldWrap alignBlock="center">
        {data && <StatusLozenge label={paused ? "paused" : "resumed"} />}
        <ControlButton primary title={paused ? "resume" : "pause"} help={paused ? "resumeHelp" : "pauseHelp"}
          current={<Text>{m(paused ? "paused" : "resumed")}</Text>}
          disabled={!data || !!status.error || items.some(item => item.scope === "entries" && isPending(item))}
          onConfirm={() => (paused ? resume : pause)({}, "entries")} />
      </Inline>
      <InlineReceipts scope="entries" />
    </Panel>
    {mode === "expert" && <>
      <Panel title="live">
        <Inline space="space.200" shouldWrap alignBlock="center">
          <StatusLozenge label={armed ? "armed" : "disarmed"} appearance={armed ? "success" : "removed"} />
          <ControlButton phrase={armed ? undefined : "ARM"} title={armed ? "disarm" : "arm"} help={armed ? "disarmHelp" : "armHelp"}
            current={<Text>{m(armed ? "armed" : "disarmed")}</Text>}
            disabled={data?.execution_mode !== "live" || (!armed && !!status.error) ||
              items.some(item => item.scope === "execution" && isPending(item))}
            onConfirm={() => toggleLive({ enabled: !armed }, "execution")} />
        </Inline>
        {data?.execution_mode !== "live" && <Text>{m("liveControlsUnavailable")}</Text>}
        <InlineReceipts scope="execution" />
      </Panel>
    </>}
    </Stack>
    {mode === "expert" && <Stack space="space.300">
      <Panel title="pendingCommands"><Stack space="space.150">
        {!pending && <EmptyState header={m("noPending")} />}
        {items.filter(item => isPending(item) && !recent.includes(item))
          .map(item => <div key={item.id}><StatusLozenge label="pending" appearance="inprogress" /> <code>{item.id}</code></div>)}
        {recent.filter(isPending).map(item => <ReceiptBadge key={item.id} item={item} />)}
      </Stack></Panel>
      <Panel title="recentActivity"><Stack space="space.150">
        {recent.filter(item => !isPending(item)).map(item => <ReceiptBadge key={item.id} item={item} />)}
        {!recent.some(item => !isPending(item)) && <EmptyState header={m("noActivity")} />}
      </Stack></Panel>
    </Stack>}
    </DashboardGrid>
    {mode === "expert" && session.kind === "connected" && <Suspense fallback={<Loading />}><OperatingControls /></Suspense>}
  </PageShell>;
}
