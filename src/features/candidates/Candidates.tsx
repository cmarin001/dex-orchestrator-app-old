import desk from "../../desk.module.css";
import { useState } from "react";
import Button from "@atlaskit/button/new";
import Lozenge from "@atlaskit/lozenge";
import Tooltip from "@atlaskit/tooltip";
import { Text } from "@atlaskit/primitives";
import { Stack } from "@atlaskit/primitives";
import { useAudit, useCandidates } from "../../api/queries";
import { isPending, useCommands, useReject } from "../../api/mutations";
import type { Market, ScannerRow } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { ControlButton } from "../../ui/ControlButton";
import { DataTable } from "../../ui/DataTable";
import { BackendText, ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell, Panel } from "../../ui/PageShell";
import { InlineReceipts } from "../../ui/ReceiptBadge";
import { SelectField } from "../../ui/SelectField";
import { StatusLozenge } from "../../ui/StatusLozenge";
import { DetailsDrawer } from "../../ui/DetailsDrawer";
import { AuditTimeline } from "../audit/Audit";

const keyFor = ({ chain, token, pair }: Market) => [chain, token, pair].join(":");
function Reject({ target, location }: { target: Market; location: string }) {
  const reject = useReject();
  const { items } = useCommands();
  const scope = "reject:" + target.chain + ":" + target.token;
  const { chain, token } = target;
  return <Stack space="space.100">
    <ControlButton title="reject" help="rejectHelp" current={<BackendText value={{ chain, token }} />}
      disabled={items.some(item => item.scope === scope && (isPending(item) || item.receipt?.state === "applied"))}
      onConfirm={() => reject({ chain, token }, scope)} />
    {location === "scanner" ? <InlineReceipts scope={scope} /> : null}
  </Stack>;
}
function CandidateEvidence({ target, candidate, onClose }: { target: Market; candidate?: ScannerRow; onClose: () => void }) {
  const m = useMessage();
  const audit = useAudit({ limit: 50 }, true, "candidate:" + keyFor(target));
  const events = audit.data?.pages.flatMap(page => page.items).filter(event => {
    const identity = event.identity ?? event.position;
    return identity && keyFor(identity) === keyFor(target) && (!candidate || identity.run_id === candidate.run_id);
  }) ?? [];
  return <DetailsDrawer title="candidateEvidence" onClose={onClose}>
    <BackendText value={candidate ?? target} />
    <Text color="color.text.subtle">{m("evidenceGap")}</Text>
    {audit.isPending && <Loading />}
    <ErrorNotice error={audit.error} retry={() => void audit.refetch()} />
    {audit.data && <AuditTimeline events={events} />}
    {audit.hasNextPage && <div><Button appearance="subtle" onClick={() => void audit.fetchNextPage()}>{m("loadMore")}</Button></div>}
    <Reject target={target} location="scanner" />
  </DetailsDrawer>;
}

export default function Candidates() {
  const m = useMessage();
  const f = useFormat();
  const candidates = useCandidates();
  const [chain, setChain] = useState("");
  const [selected, setSelected] = useState<Market>();
  const batch = candidates.data?.scanner ?? [];
  const watched = candidates.data?.watched ?? [];
  const chains = [{ label: m("allChains"), value: "" }, ...Array.from(new Set([...batch, ...watched].map(row => row.chain)))
    .sort().map(chain => ({ label: chain, value: chain }))];
  const group = <T extends Market>(rows: T[]) => rows.filter(row => !chain || row.chain === chain)
    .sort((a, b) => a.chain.localeCompare(b.chain));
  return <PageShell title="candidates">
    <div className={desk["filter-field"] + " " + desk["filter-standalone"]}><SelectField id="candidates-chain" label="chain" value={chain} options={chains} onChange={setChain} /></div>
    {candidates.isPending && <Loading />}
    <ErrorNotice error={candidates.error} retry={() => void candidates.refetch()} />
    {candidates.data && <>
      <Panel title="scanner">
        <DataTable title="scanner" empty="noCandidates" cards sortable
          head={{ cells: (["token", "chain", "liquidity", "outcome", "reason", "action"] as const)
            .map(key => ({ key, content: m(key), isSortable: ["token", "chain", "liquidity"].includes(key) })) }}
          rows={group(batch).map((row, i) => ({ key: row.run_id + ":" + i, cells: [
            { key: row.token, content: <code className={desk["table-id"]}>{row.token}</code> }, { key: row.chain, content: <Lozenge>{row.chain}</Lozenge> }, { key: row.liquidity_usd, content: <code className={desk["numeric"]}>{f.usd(row.liquidity_usd)}</code> },
            { content: <StatusLozenge label={row.skipped ? "skipped" : "eligible"} appearance={row.skipped ? "warning" : "default"} /> },
            { content: <Tooltip content={row.reason}><span><BackendText value={row.reason} /></span></Tooltip> },
            { content: <Stack space="space.100"><Button appearance="subtle" onClick={() => setSelected(row)}>{m("details")}</Button><Reject target={row} location="scanner" /></Stack> },
          ] }))} />
      </Panel>
      <Panel title="watched">
        <DataTable title="watched" empty="noWatched" cards
          head={{ cells: (["token", "chain", "pair", "reason", "action"] as const).map(key => ({ key, content: m(key) })) }}
          rows={group(watched).map(row => {
            const latest = batch.find(candidate => keyFor(candidate) === keyFor(row));
            return { key: keyFor(row), cells: [
              { content: <code className={desk["table-id"]}>{row.token}</code> }, { content: <Lozenge>{row.chain}</Lozenge> }, { content: <BackendText value={row.pair} /> },
              { content: <BackendText value={latest?.reason} /> },
              { content: <Stack space="space.100"><Button appearance="subtle" onClick={() => setSelected(row)}>{m("details")}</Button><Reject target={row} location="watched" />
                <InlineReceipts scope={"reject:" + row.chain + ":" + row.token} /></Stack> },
            ] };
          })} />
      </Panel>
    </>}
    {selected && <CandidateEvidence target={selected} candidate={"run_id" in selected ? selected as ScannerRow : batch.find(row => keyFor(row) === keyFor(selected))} onClose={() => setSelected(undefined)} />}
  </PageShell>;
}
