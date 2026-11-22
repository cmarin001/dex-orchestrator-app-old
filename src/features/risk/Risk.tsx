import { useId, useState } from "react";
import Button from "@atlaskit/button/new";
import EmptyState from "@atlaskit/empty-state";
import Heading from "@atlaskit/heading";
import TextField from "@atlaskit/textfield";
import SectionMessage from "@atlaskit/section-message";
import Tooltip from "@atlaskit/tooltip";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { isPending, useCommands, useRiskUpdate } from "../../api/mutations";
import { useAudit, useRisk } from "../../api/queries";
import type { RiskConfig, RiskResponse } from "../../api/types";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { useMode } from "../../modes/ModeContext";
import { DetailsDrawer } from "../../ui/DetailsDrawer";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { DataTable } from "../../ui/DataTable";
import { BackendText, ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell, Panel } from "../../ui/PageShell";
import { InlineReceipts } from "../../ui/ReceiptBadge";
import { controlEvent } from "../audit/events";
import { fields, validRisk } from "./risk-form";

function ConfigValues({ config }: { config: RiskConfig }) {
  const m = useMessage();
  const f = useFormat();
  return <Stack space="space.100">
    {fields.map(([key, label]) => <Inline key={key} shouldWrap space="space.100">
      <Text weight="semibold">{m(label)}</Text><Text>{key === "max_slippage_bps" ? f.bps(config[key]) : f.number(config[key])}</Text>
    </Inline>)}
    <Text weight="semibold">{m("riskLadder")}</Text>
    <DataTable title="riskLadder" empty="noAudit" head={{ cells: [
      { key: "at", content: m("afterSeconds") }, { key: "target", content: m("targetBps") },
    ] }} rows={config.timeout_ladder.map(rung => ({ key: String(rung.at_sec), cells: [
      { content: f.duration(rung.at_sec) }, { content: f.bps(rung.target_profit_bps) },
    ] }))} />
  </Stack>;
}
function RiskForm({ initial }: { initial: RiskConfig }) {
  const m = useMessage();
  const submit = useRiskUpdate();
  const { items } = useCommands();
  const { session } = useConnection();
  const id = useId();
  const [rungs, setRungs] = useState(() => initial.timeout_ladder.map((rung, i) => ({ key: i, ...rung })));
  const [nextKey, setNextKey] = useState(rungs.length);
  const [candidate, setCandidate] = useState<RiskConfig>();
  const [validation, setValidation] = useState<"invalidRisk" | "noChanges">();
  if (session.kind === "sample") return <Text>{m("sampleControls")}</Text>;
  return <form onSubmit={event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const config: RiskConfig = {
      max_risk_pct_per_trade: Number(values.get("max_risk_pct_per_trade")),
      max_position_vs_pool_depth: Number(values.get("max_position_vs_pool_depth")),
      max_slippage_bps: Number(values.get("max_slippage_bps")),
      halt_new_entries_dd: Number(values.get("halt_new_entries_dd")),
      timeout_ladder: rungs.map(({ key }) => ({
        at_sec: Number(values.get("time-" + key)), target_profit_bps: Number(values.get("target-" + key)),
      })),
    };
    if (!validRisk(config)) { setValidation("invalidRisk"); return; }
    if (JSON.stringify(config) === JSON.stringify(initial)) { setValidation("noChanges"); return; }
    setValidation(undefined);
    setCandidate(config);
  }}>
    <Stack space="space.150">
      {fields.map(([key, label, max]) => <Stack space="space.050" key={key}>
        <label htmlFor={id + key}>{m(label)}</label>
        <TextField id={id + key} name={key} type="number" min={0} max={max}
          step={key === "max_slippage_bps" ? 1 : "any"} isRequired defaultValue={String(initial[key])} />
      </Stack>)}
      <Heading size="xsmall">{m("riskLadder")}</Heading>
      {rungs.map((rung, index) => <Inline space="space.150" shouldWrap alignBlock="end" key={rung.key}>
        <Stack space="space.050"><label htmlFor={id + "time-" + rung.key}>{m("afterSeconds")}</label>
          <TextField id={id + "time-" + rung.key} name={"time-" + rung.key} type="number"
            min={0} defaultValue={String(rung.at_sec)} isRequired /></Stack>
        <Stack space="space.050"><label htmlFor={id + "target-" + rung.key}>{m("targetBps")}</label>
          <TextField id={id + "target-" + rung.key} name={"target-" + rung.key} type="number"
            min={1} max={10000} defaultValue={String(rung.target_profit_bps)} isRequired /></Stack>
        <Button aria-label={m("removeRungN", { number: index + 1 })} isDisabled={index === 0} onClick={() => {
          setRungs(rungs.filter(row => row.key !== rung.key));
        }}>{m("removeRung")}</Button>
      </Inline>)}
      <div><Button isDisabled={rungs.length >= 20} onClick={() => {
        setRungs([...rungs, { key: nextKey, at_sec: (rungs.at(-1)?.at_sec ?? 0) + 600, target_profit_bps: rungs.at(-1)?.target_profit_bps ?? 50 }]);
        setNextKey(nextKey + 1);
      }}>{m("addRung")}</Button></div>
      {validation && <SectionMessage appearance="warning"><Text>{m(validation)}</Text></SectionMessage>}
      <div><Tooltip content={m("riskHelp")}><span><Button appearance="primary" type="submit"
        isDisabled={items.some(item => item.scope === "risk" && isPending(item))}>{m("saveRisk")}</Button></span></Tooltip></div>
    </Stack>
    <ConfirmDialog open={!!candidate} title="saveRisk" help="riskHelp" current={<Stack space="space.150">
      <ConfigValues config={initial} />
      {candidate && <><Heading size="small">{m("requested")}</Heading><ConfigValues config={candidate} /></>}
    </Stack>} onCancel={() => setCandidate(undefined)} onConfirm={() => {
      if (candidate) submit({ config: candidate }, "risk");
      setCandidate(undefined);
    }} />
  </form>;
}

function RiskHistory({ current, expert }: { current: RiskResponse; expert: boolean }) {
  const m = useMessage();
  const f = useFormat();
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string>();
  const history = useAudit({ limit: 100 }, loaded && expert, "risk");
  const revisions = history.data?.pages.flatMap(page => page.items.flatMap(event => {
    const command = controlEvent(event);
    return event.status === "ok" && command?.action.type === "risk" && command.action.config
      ? [{ ...command, config: command.action.config }] : [];
  })) ?? [];
  const index = revisions.findIndex(row => row.id === selected);
  const chosen = revisions[index];
  const previous = revisions[index + 1];
  return <>
    {expert && <Panel title="riskHistory">
    {!loaded && <div><Button onClick={() => setLoaded(true)}>{m("showEvents")}</Button></div>}
    {loaded && history.isPending && <Loading />}
    {loaded && <ErrorNotice error={history.error} retry={() => void history.refetch()} />}
    {history.data && (revisions.length ? <DataTable title="riskHistory" empty="noRiskHistory"
      head={{ cells: (["revision", "actor", "requestId", "details"] as const).map(key => ({ key, content: m(key) })) }}
      rows={revisions.map(row => ({ key: row.id, cells: [
        { content: f.date(row.at) }, { content: <BackendText value={row.actor} /> }, { content: row.id },
        { content: <Button onClick={() => setSelected(row.id)}>{m("compare")}</Button> },
      ] }))} /> : <EmptyState header={m("noRiskHistory")} />)}
    {history.hasNextPage && <div><Button isLoading={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{m("loadMore")}</Button></div>}
    </Panel>}
    {chosen && <DetailsDrawer title="compare" onClose={() => setSelected(undefined)}>
          <BackendText value={{ request_id: chosen.id, actor: chosen.actor }} />
          <Panel title="before">{previous ? <ConfigValues config={previous.config} /> : <Text>{m("unavailable")}</Text>}</Panel>
          <Panel title="after"><ConfigValues config={chosen.config} /></Panel>
          <Panel title="riskConfig"><ConfigValues config={current.config} /></Panel>
    </DetailsDrawer>}
  </>;
}
export default function Risk() {
  const m = useMessage();
  const f = useFormat();
  const risk = useRisk();
  const { mode } = useMode();
  return <PageShell title="risk">
    {risk.isPending && <Loading />}
    <ErrorNotice error={risk.error} retry={() => void risk.refetch()} />
    {risk.data && <>
      <Panel title="riskConfig">
        <Text>{m("revision")} {f.date(risk.data.as_of)}</Text>
        {risk.data.actor && <BackendText value={risk.data.actor} />}
        <ConfigValues config={risk.data.config} />
      </Panel>
      {mode === "expert" && <>
        <Panel title="riskUpdate">
          <RiskForm key={risk.data.as_of ?? "initial"} initial={risk.data.config} />
          <InlineReceipts scope="risk" />
        </Panel>
      </>}
      <RiskHistory current={risk.data} expert={mode === "expert"} />
    </>}
  </PageShell>;
}
