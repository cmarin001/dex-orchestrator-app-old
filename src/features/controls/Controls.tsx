import { Inline, Stack, Text } from "@atlaskit/primitives";
import EmptyState from "@atlaskit/empty-state";
import { useConnection } from "../../app/Connection";
import { isPending, useCommands, useLiveExecution, usePause, useResume } from "../../api/mutations";
import { useStatus } from "../../api/queries";
import { useMessage } from "../../i18n/messages";
import { useMode } from "../../modes/ModeContext";
import { ControlButton } from "../../ui/ControlButton";
import { ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell, Panel } from "../../ui/PageShell";
import { InlineReceipts, ReceiptBadge } from "../../ui/ReceiptBadge";
import { StatusLozenge } from "../../ui/StatusLozenge";

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
  const other = items.filter(item => !item.dismissed && !["entries", "execution"].includes(item.scope));
  const pending = items.some(isPending);
  return <PageShell title="controls">
    <ErrorNotice error={status.error} retry={() => void status.refetch()} />
    {status.isPending && <Loading />}
    {session.kind === "sample" && <Text>{m("sampleControls")}</Text>}
    <Panel title="controls">
      <Inline space="space.200" shouldWrap alignBlock="center">
        {data && <StatusLozenge label={paused ? "paused" : "resumed"} />}
        <ControlButton title={paused ? "resume" : "pause"} help={paused ? "resumeHelp" : "pauseHelp"}
          current={<Text>{m(paused ? "paused" : "resumed")}</Text>}
          disabled={!data || !!status.error || items.some(item => item.scope === "entries" && isPending(item))}
          onConfirm={() => (paused ? resume : pause)({}, "entries")} />
      </Inline>
      <InlineReceipts scope="entries" />
    </Panel>
    {mode === "expert" && <>
      <Panel title="live">
        <Inline space="space.200" shouldWrap alignBlock="center">
          <StatusLozenge label={armed ? "armed" : "disarmed"} appearance={armed ? "warning" : "default"} />
          <ControlButton title={armed ? "disarm" : "arm"} help={armed ? "disarmHelp" : "armHelp"}
            current={<Text>{m(armed ? "armed" : "disarmed")}</Text>}
            disabled={data?.execution_mode !== "live" || (!armed && !!status.error) ||
              items.some(item => item.scope === "execution" && isPending(item))}
            onConfirm={() => toggleLive({ enabled: !armed }, "execution")} />
        </Inline>
        {data?.execution_mode !== "live" && <Text>{m("liveControlsUnavailable")}</Text>}
        <InlineReceipts scope="execution" />
      </Panel>
      <Panel title="pendingCommands"><Stack space="space.150">
        {!pending && <EmptyState header={m("noPending")} />}
        {items.filter(item => isPending(item) && !other.includes(item))
          .map(item => <div key={item.id}><StatusLozenge label="pending" appearance="inprogress" /> <code>{item.id}</code></div>)}
        {other.map(item => <ReceiptBadge key={item.id} item={item} />)}
      </Stack></Panel>
    </>}
  </PageShell>;
}
