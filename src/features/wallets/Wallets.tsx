import { useState } from "react";
import { useData } from "../../api/queries";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { ErrorNotice, Loading } from "../../ui/Feedback";
import { PageShell } from "../../ui/PageShell";
import desk from "../../desk.module.css";

type Wallet = {
  chain: string;
  address: string;
  tier: "fundable" | "validation_only" | "tracked";
  fundable: boolean;
  balance: string | null;
  currency: string;
};

const chainName: Record<string, string> = {
  ethereum: "Ethereum", base: "Base", bsc: "BNB Chain", polygon: "Polygon",
  robinhood: "Robinhood Chain", hyperevm: "HyperEVM", arc: "Arc", solana: "Solana",
  bitcoin_segwit: "Bitcoin Native SegWit", bitcoin_taproot: "Bitcoin Taproot",
};

function DepositAddress({ wallet }: { wallet: Wallet }) {
  const m = useMessage();
  const [result, setResult] = useState<"copied" | "error">();
  if (wallet.tier !== "fundable") return <span>{m("walletBlocked")}</span>;
  if (!wallet.fundable) return <span>{m("walletNeedsVerification")}</span>;
  return <>
    <button type="button" className={desk["choice"]} onClick={async () => {
      try { await navigator.clipboard.writeText(wallet.address); setResult("copied"); }
      catch { setResult("error"); }
    }}>{m("walletCopyDeposit")}</button>
    {result && <span role="status">{m(result)}</span>}
  </>;
}

export default function Wallets() {
  const m = useMessage();
  const { session } = useConnection();
  const query = useData<{ wallets: Wallet[] }>("/api/v1/wallets", 30_000, session.kind === "connected");
  return <PageShell title="wallets">
    {session.kind !== "connected" && <p>{m("walletConnect")}</p>}
    {query.isFetching && !query.data && <Loading />}
    <ErrorNotice error={query.error} />
    {query.data?.wallets.map(wallet => <section key={wallet.chain} className={desk["panel"]}><h2>{chainName[wallet.chain] ?? wallet.chain}</h2>
      <dl>
        <dt>{m("walletTier")}</dt>
        <dd>{m(wallet.tier === "fundable" ? "walletFundable" : wallet.tier === "tracked" ? "walletTracked" : "walletValidation")}</dd>
        <dt>{m("walletAddress")}</dt><dd><code className={desk["table-id"]}>{wallet.address}</code></dd>
        <dt>{m("walletBalance")}</dt>
        <dd>{wallet.balance === null ? m("unavailable") : [wallet.balance, wallet.currency].filter(Boolean).join(" ")}</dd>
      </dl>
      <DepositAddress wallet={wallet} />
    </section>)}
  </PageShell>;
}
