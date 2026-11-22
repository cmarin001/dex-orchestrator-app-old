import desk from "../../desk.module.css";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import EmptyState from "@atlaskit/empty-state";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { useAudit } from "../../api/queries";
import type { JournalEvent } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { useMode } from "../../modes/ModeContext";
import Lozenge from "@atlaskit/lozenge";
import Heading from "@atlaskit/heading";
import { useIntl } from "react-intl";
import { SelectField } from "../../ui/SelectField";
import { StatusLozenge } from "../../ui/StatusLozenge";
import { BackendText, ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell, Panel } from "../../ui/PageShell";
import { controlEvent, eventKey, stageLabel, statusLabel } from "./events";

export function AuditTimeline({ events }: { events: JournalEvent[] }) {
  const m = useMessage();
  const f = useFormat();
  if (!events.length) return <EmptyState header={m("noAudit")} />;
  return <Stack as="ul" space="space.100">{events.map((event, index) => {
    const stage = stageLabel[event.stage];
    const state = statusLabel[event.status];
    return <li className={desk["audit-row"]} key={eventKey(event, index)}>
      <Stack space="space.050">
        <Text size="small" color="color.text.subtle">{f.date(event.at)}</Text>
        <Inline space="space.100" shouldWrap>
          {stage ? <Text weight="semibold">{m(stage)}</Text> : <BackendText value={event.stage} />}
          {state ? <StatusLozenge label={state} appearance={event.status === "failed" ? "removed" : event.status === "skipped" ? "warning" : "default"} /> : <Lozenge>{event.status}</Lozenge>}
        </Inline>
        {event.identity && <Inline space="space.100" shouldWrap>
          <Text>{event.identity.chain}</Text><BackendText value={event.identity.token} />
        </Inline>}
        {event.gaps.map((gap, i) => <BackendText key={i} value={gap} />)}
        {controlEvent(event) && <BackendText value={controlEvent(event)?.action} />}
        {event.detail && typeof event.detail === "object" && "reason" in event.detail ? <BackendText value={event.detail.reason} /> : null}
      </Stack>
    </li>;
  })}</Stack>;
}

function EventData({ event }: { event: JournalEvent }) {
  const m = useMessage();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const id = controlEvent(event)?.id;
  return <details><summary>{m("eventData")}</summary>
    <Stack space="space.100">
      <BackendText value={event} />
      {id && <Button appearance="subtle" onClick={async () => {
        try { await navigator.clipboard.writeText(id); setCopied(true); }
        catch (error) { setError(error); }
      }}>{m(copied ? "copied" : "copyId")}</Button>}
      <ErrorNotice error={error} />
    </Stack>
  </details>;
}

export default function Audit() {
  const m = useMessage();
  const f = useFormat();
  const { mode } = useMode();
  const expert = mode === "expert";
  const intl = useIntl();
  const [agent, setAgent] = useState("");
  const [chain, setChain] = useState("");
  const [severity, setSeverity] = useState("");
  const [order, setOrder] = useState<"latestFirst" | "oldestFirst" | "byAgent" | "byChain" | "byStatus">("latestFirst");
  const [params, setParams] = useSearchParams();
  const requested = params.get("request");
  const [filters, setFilters] = useState<{ limit: number; since?: string }>({ limit: 50 });
  const audit = useAudit(expert ? filters : { limit: 20 });
  const all = audit.data?.pages.flatMap(page => page.items) ?? [];
  const chainOf = (event: JournalEvent) => (event.identity ?? event.position)?.chain ?? "";
  const matching = all.filter(event => (!requested || controlEvent(event)?.id === requested) && (!expert ||
    (!agent || event.stage === agent) && (!chain || chainOf(event) === chain) && (!severity || event.status === severity)));
  if (expert && order !== "latestFirst") matching.sort((first, second) => ({
    oldestFirst: () => first.at.localeCompare(second.at),
    byAgent: () => first.stage.localeCompare(second.stage),
    byChain: () => chainOf(first).localeCompare(chainOf(second)),
    byStatus: () => first.status.localeCompare(second.status),
  })[order]());
  const options = (values: string[]) => [{ label: m("allValues"), value: "" },
    ...Array.from(new Set(values.filter(Boolean))).sort().map(value => ({ label: value, value }))];
  const groups = new Map<string, JournalEvent[]>();
  for (const event of matching) {
    const day = intl.formatDate(new Date(event.at), { dateStyle: "long" });
    const group = groups.get(day) ?? [];
    group.push(event);
    groups.set(day, group);
  }
  return <PageShell title="audit">
    {expert && <form onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const since = String(form.get("since") ?? "");
      setFilters({ limit: Number(form.get("limit")), since: since ? new Date(since).toISOString() : undefined });
    }}>
      <Inline space="space.150" shouldWrap alignBlock="end">
        <Stack space="space.050"><label htmlFor="audit-since">{m("since")}</label>
          <TextField id="audit-since" type="datetime-local" name="since" /></Stack>
        <Stack space="space.050"><label htmlFor="audit-limit">{m("limit")}</label>
          <TextField id="audit-limit" type="number" name="limit" min={1} max={200} defaultValue={50} isRequired /></Stack>
        <Button appearance="primary" type="submit">{m("applyFilters")}</Button>
      </Inline>
    </form>}
    {expert && <Stack space="space.100"><Inline space="space.150" shouldWrap>
      <SelectField id="audit-agent" label="agent" value={agent} options={options(all.map(event => event.stage))} onChange={setAgent} />
      <SelectField id="audit-chain" label="chain" value={chain} options={options(all.map(chainOf))} onChange={setChain} />
      <SelectField id="audit-severity" label="severity" value={severity} options={options(all.map(event => event.status))} onChange={setSeverity} />
      <SelectField id="audit-order" label="order" value={order}
        options={(["latestFirst", "oldestFirst", "byAgent", "byChain", "byStatus"] as const).map(key => ({ label: m(key), value: key }))} onChange={setOrder} />
    </Inline><Text color="color.text.subtle">{m("auditFilterScope")}</Text></Stack>}
    {requested && <Panel title="requestId"><BackendText value={requested} />
      <div><Button onClick={() => setParams({})}>{m("showEvents")}</Button></div>
    </Panel>}
    {audit.isPending && <Loading />}
    <ErrorNotice error={audit.error} retry={() => void audit.refetch()} />
    {audit.data && (expert
      ? (matching.length ? <Stack space="space.250">{[...groups].map(([day, events]) => <section className={desk["timeline-day"]} key={day}>
          <div className={desk["day-heading"]}><Heading size="small" as="h2">{day}</Heading></div>
          <Stack as="ul" space="space.100">{events.map((event, index) => <li className={desk["audit-row"]} key={eventKey(event, index)}>
            <Inline space="space.150" shouldWrap alignBlock="center">
              <Text>{f.date(event.at)}</Text><BackendText value={event.stage} />
              <Lozenge appearance={event.status === "failed" ? "removed" : "default"}>{event.status}</Lozenge>
              {chainOf(event) && <Lozenge>{chainOf(event)}</Lozenge>}
            </Inline>
            <EventData event={event} />
          </li>)}</Stack>
        </section>)}</Stack> : <EmptyState header={m("noAudit")} />)
      : <Panel title="audit"><AuditTimeline events={matching} /></Panel>)}
    {(expert || requested) && audit.hasNextPage && <div><Button isLoading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{m("loadMore")}</Button></div>}
  </PageShell>;
}
