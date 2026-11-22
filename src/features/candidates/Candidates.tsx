import { useState } from "react";
import { Stack } from "@atlaskit/primitives";
import { useCandidates } from "../../api/queries";
import { isPending, useCommands, useReject } from "../../api/mutations";
import type { Market } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { useFormat } from "../../lib/format";
import { ControlButton } from "../../ui/ControlButton";
import { DataTable } from "../../ui/DataTable";
import { BackendText, ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell, Panel } from "../../ui/PageShell";
import { InlineReceipts } from "../../ui/ReceiptBadge";
import { SelectField } from "../../ui/SelectField";
import { StatusLozenge } from "../../ui/StatusLozenge";

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
export default function Candidates() {
  const m = useMessage();
  const f = useFormat();
  const candidates = useCandidates();
  const [chain, setChain] = useState("");
  const batch = candidates.data?.scanner ?? [];
  const watched = candidates.data?.watched ?? [];
  const chains = [{ label: m("allChains"), value: "" }, ...Array.from(new Set([...batch, ...watched].map(row => row.chain)))
    .sort().map(chain => ({ label: chain, value: chain }))];
  const group = <T extends Market>(rows: T[]) => rows.filter(row => !chain || row.chain === chain)
    .sort((a, b) => a.chain.localeCompare(b.chain));
  return <PageShell title="candidates">
    <div className="filter-field filter-standalone"><SelectField id="candidates-chain" label="chain" value={chain} options={chains} onChange={setChain} /></div>
    {candidates.isPending && <Loading />}
    <ErrorNotice error={candidates.error} retry={() => void candidates.refetch()} />
    {candidates.data && <>
      <Panel title="scanner">
        <DataTable title="scanner" empty="noCandidates"
          head={{ cells: (["token", "chain", "liquidity", "volume", "rank", "trigger", "outcome", "reason", "action"] as const)
            .map(key => ({ key, content: m(key) })) }}
          rows={group(batch).map((row, i) => ({ key: row.run_id + ":" + i, cells: [
            { content: row.token }, { content: row.chain }, { content: f.usd(row.liquidity_usd) },
            { content: f.usd(row.vol_1h_usd) }, { content: f.number(row.rank_score) }, { content: <BackendText value={row.trigger} /> },
            { content: <StatusLozenge label={row.skipped ? "skipped" : "eligible"} appearance={row.skipped ? "warning" : "default"} /> },
            { content: <BackendText value={row.reason} /> }, { content: <Reject target={row} location="scanner" /> },
          ] }))} />
      </Panel>
      <Panel title="watched">
        <DataTable title="watched" empty="noWatched"
          head={{ cells: (["token", "chain", "pair", "reason", "action"] as const).map(key => ({ key, content: m(key) })) }}
          rows={group(watched).map(row => {
            const latest = batch.find(candidate => keyFor(candidate) === keyFor(row));
            return { key: keyFor(row), cells: [
              { content: row.token }, { content: row.chain }, { content: row.pair },
              { content: <BackendText value={latest?.reason} /> },
              { content: <Stack space="space.100"><Reject target={row} location="watched" />
                <InlineReceipts scope={"reject:" + row.chain + ":" + row.token} /></Stack> },
            ] };
          })} />
      </Panel>
    </>}
  </PageShell>;
}
