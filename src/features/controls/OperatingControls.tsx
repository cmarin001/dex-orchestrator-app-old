import desk from "../../desk.module.css";
import { useId, useState, type ReactNode } from "react";
import Button from "@atlaskit/button/new";
import EmptyState from "@atlaskit/empty-state";
import TextArea from "@atlaskit/textarea";
import TextField from "@atlaskit/textfield";
import Tooltip from "@atlaskit/tooltip";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { useData } from "../../api/queries";
import { isPending, useCommands } from "../../api/mutations";
import { useMessage, type MessageId } from "../../i18n/messages";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { ControlButton } from "../../ui/ControlButton";
import { BackendText, ErrorNotice, Loading } from "../../ui/Feedback";
import { Panel } from "../../ui/PageShell";
import { StatusLozenge } from "../../ui/StatusLozenge";
import { operationId, type ConfigResource, type OperationCommand, type OperationResource } from "./operations";

type Config = Record<string, unknown>;
type RegistryEntry = { id: string; enabled: boolean; params?: Config; schema?: Config };
type SignalEntry = { id: string; state: string; expires_at: number; signal: Config };
const configLabels: Record<ConfigResource, MessageId> = { mode: "operatingMode", chain: "chainRouting", budget: "providerBudget" };

function useOperation(resource: OperationResource) {
  const { submit, items } = useCommands();
  return {
    send: (command: OperationCommand) => submit(command, "operation:" + resource),
    busy: items.some(item => item.scope === "operation:" + resource && isPending(item)),
  };
}

function Editor({ title, value, withReason, busy, onSubmit }: {
  title: MessageId; value: Config; withReason?: boolean; busy: boolean;
  onSubmit: (value: Config, reason: string) => void;
}) {
  const m = useMessage();
  const id = useId();
  const [draft, setDraft] = useState<{ value: Config; reason: string }>();
  const [invalid, setInvalid] = useState(false);
  return <>
    <form onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      try {
        const next: unknown = JSON.parse(String(fields.get("config")));
        if (!next || Array.isArray(next) || typeof next !== "object") throw new Error();
        const reason = String(fields.get("reason") ?? "").trim();
        if (withReason && !reason) return setInvalid(true);
        setInvalid(false);
        setDraft({ value: next as Config, reason });
      } catch { setInvalid(true); }
    }}>
      <Stack space="space.150">
        <label htmlFor={id}>{m(title)}</label>
        <TextArea id={id} name="config" key={JSON.stringify(value)} defaultValue={JSON.stringify(value, null, 2)} minimumRows={6} isRequired />
        {withReason && <><label htmlFor={id + "-reason"}>{m("modeReason")}</label>
          <TextField id={id + "-reason"} name="reason" maxLength={200} isRequired /></>}
        {invalid && <p role="alert">{m("configInvalid")}</p>}
        <div><Tooltip content={m("configHelp")}><Button appearance="subtle" type="submit" isDisabled={busy}>{m("updateConfig")}</Button></Tooltip></div>
      </Stack>
    </form>
    <ConfirmDialog open={!!draft} title="confirmConfig" help="configHelp" canConfirm={!busy}
      current={<Stack space="space.150"><BackendText value={value} /><Text>{m("requested")}</Text>
        <BackendText value={draft?.value} /></Stack>}
      onCancel={() => setDraft(undefined)} onConfirm={() => {
        if (draft) onSubmit(draft.value, draft.reason);
        setDraft(undefined);
      }} />
  </>;
}

function ConfigControl({ resource }: { resource: ConfigResource }) {
  const query = useData<Config>("/api/v1/" + resource);
  const { send, busy } = useOperation(resource);
  const value = resource === "budget" ? query.data?.config as Config | undefined : query.data;
  return <Panel title={configLabels[resource]}>
    {query.isPending && <Loading />}
    <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    {value && <Editor title="configJson" value={value} withReason={resource === "mode"} busy={busy} onSubmit={(config, reason) => {
      if (resource === "mode") send({ type: "operation", resource, path: "/mode", payload: { config, reason } });
      else send({ type: "operation", resource, path: resource === "chain" ? "/chain" : "/budget", payload: { config } });
    }} />}
  </Panel>;
}

function Registry({ resource }: { resource: "providers" | "strategies" }) {
  const m = useMessage();
  const registry = useData<{ items: RegistryEntry[] }>("/api/v1/" + resource);
  const { send, busy } = useOperation(resource);
  return <Panel title={resource} actions={resource === "strategies" &&
    <ControlButton title="reloadRegistry" help="configHelp" current={<Text>{m("strategies")}</Text>} disabled={busy || !registry.data}
      onConfirm={() => send({ type: "operation", resource, path: "/strategies/reload", payload: {} })} />}>
    {registry.isPending && <Loading />}
    <ErrorNotice error={registry.error} retry={() => void registry.refetch()} />
    {registry.data?.items.length === 0 && <EmptyState header={m("noRecords")} />}
    {registry.data?.items.map(entry => {
      const id = operationId(entry.id);
      return <details key={entry.id} className={desk["controls-group"]}>
        <summary><code>{entry.id}</code> <StatusLozenge label={entry.enabled ? "enabled" : "disabled"} /></summary>
        <Stack space="space.150">
          <ControlButton title={entry.enabled ? "disable" : "enable"} help="configHelp"
            current={<BackendText value={{ id: entry.id, enabled: entry.enabled }} />} disabled={busy || !id}
            onConfirm={() => { if (id) send({ type: "operation", resource,
              path: `/${resource}/${id}/${entry.enabled ? "disable" : "enable"}`, payload: {} }); }} />
          {resource === "strategies" && id && entry.params && <>
            <details><summary>{m("strategySchema")}</summary><BackendText value={entry.schema} /></details>
            <Editor title="strategyParams" value={entry.params} busy={busy} onSubmit={params =>
              send({ type: "operation", resource, path: `/strategies/${id}/params`, payload: { params } })} />
          </>}
        </Stack>
      </details>;
    })}
  </Panel>;
}

function Signals() {
  const m = useMessage();
  const signals = useData<{ items: SignalEntry[] }>("/api/v1/signals");
  const { send, busy } = useOperation("signals");
  return <Panel title="signals">
    {signals.isPending && <Loading />}
    <ErrorNotice error={signals.error} retry={() => void signals.refetch()} />
    {signals.data?.items.length === 0 && <EmptyState header={m("noRecords")} />}
    {signals.data?.items.map(item => {
      const id = operationId(item.id);
      return <details key={item.id}><summary><code>{item.id}</code></summary>
        <BackendText value={item} />
        <Inline space="space.100" shouldWrap>{(["approve", "reject"] as const).map(action =>
          <ControlButton key={action} title={action === "approve" ? "approve" : "rejectSignal"} help="configHelp"
            current={<BackendText value={item} />} disabled={busy || !id || item.state !== "pending" || item.expires_at <= Date.now()}
            onConfirm={() => { if (id && item.expires_at > Date.now()) send({ type: "operation", resource: "signals",
              path: `/controls/${action}/${id}`, payload: {} }); }} />)}
        </Inline>
      </details>;
    })}
  </Panel>;
}

const sections: { key: OperationResource; title: MessageId; render: () => ReactNode }[] = [
  { key: "mode", title: "operatingMode", render: () => <ConfigControl resource="mode" /> },
  { key: "chain", title: "chainRouting", render: () => <ConfigControl resource="chain" /> },
  { key: "budget", title: "providerBudget", render: () => <ConfigControl resource="budget" /> },
  { key: "providers", title: "providers", render: () => <Registry resource="providers" /> },
  { key: "strategies", title: "strategies", render: () => <Registry resource="strategies" /> },
  { key: "signals", title: "signals", render: () => <Signals /> },
];
export default function OperatingControls() {
  const m = useMessage();
  const [active, setActive] = useState<OperationResource>();
  return <Panel title="advancedControls">
    <Inline space="space.100" shouldWrap>{sections.map(({ key, title }) =>
      <Button key={key} appearance="subtle" aria-pressed={active === key} onClick={() => setActive(active === key ? undefined : key)}>{m(title)}</Button>)}</Inline>
    {sections.find(item => item.key === active)?.render()}
  </Panel>;
}
