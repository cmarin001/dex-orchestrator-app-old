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
import { DataTable } from "../../ui/DataTable";
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
    return <li className="audit-row" key={eventKey(event, index)}>
      <Stack space="space.050">
        <Text size="small" color="color.text.subtle">{f.date(event.at)}</Text>
        <Inline space="space.100" shouldWrap>
          {stage ? <Text weight="semibold">{m(stage)}</Text> : <BackendText value={event.stage} />}
          {state ? <Text>{m(state)}</Text> : <BackendText value={event.status} />}
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
      {id && <Button onClick={async () => {
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
  const [params, setParams] = useSearchParams();
  const requested = params.get("request");
  const [filters, setFilters] = useState<{ limit: number; since?: string }>({ limit: 50 });
  const audit = useAudit(expert ? filters : { limit: 20 });
  const all = audit.data?.pages.flatMap(page => page.items) ?? [];
  const matching = requested ? all.filter(event => controlEvent(event)?.id === requested) : all;
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
        <Button type="submit">{m("applyFilters")}</Button>
      </Inline>
    </form>}
    {requested && <Panel title="requestId"><BackendText value={requested} />
      <div><Button onClick={() => setParams({})}>{m("showEvents")}</Button></div>
    </Panel>}
    {audit.isPending && <Loading />}
    <ErrorNotice error={audit.error} retry={() => void audit.refetch()} />
    {audit.data && (expert
      ? <DataTable title="audit" sortable empty="noAudit"
          head={{ cells: (["time", "stage", "outcome", "chain", "eventData"] as const)
            .map(key => ({ key, content: m(key), isSortable: key !== "eventData" })) }}
          rows={matching.map((event, i) => ({ key: eventKey(event, i), cells: [
            { key: event.at, content: f.date(event.at) },
            { key: event.stage, content: <BackendText value={event.stage} /> },
            { key: event.status, content: <BackendText value={event.status} /> },
            { key: event.identity?.chain, content: event.identity?.chain ?? m("unavailable") },
            { key: "data", content: <EventData event={event} /> },
          ] }))} />
      : <Panel title="audit"><AuditTimeline events={matching} /></Panel>)}
    {(expert || requested) && audit.hasNextPage && <div><Button isLoading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{m("loadMore")}</Button></div>}
  </PageShell>;
}
