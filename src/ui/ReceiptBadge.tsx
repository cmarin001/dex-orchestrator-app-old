import desk from "../desk.module.css";
import Button from "@atlaskit/button/new";
import { Link } from "react-router-dom";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { useMessage } from "../i18n/messages";
import { isPending, useCommands, type Tracked } from "../api/mutations";
import { BackendText, ErrorNotice } from "./Feedback";
import { StatusLozenge } from "./StatusLozenge";

export function ReceiptBadge({ item }: { item: Tracked }) {
  const m = useMessage();
  const { check, dismiss } = useCommands();
  const { receipt, error } = item;
  const pending = isPending(item);
  if (item.dismissed) return null;
  return <div className={desk["receipt"]}><Stack space="space.100">
    <div role="status"><Inline space="space.100" shouldWrap alignBlock="center">
      {pending && <StatusLozenge label="pending" appearance="inprogress" />}
      {receipt && <StatusLozenge label={receipt.state} appearance={receipt.state === "applied" ? "success" : receipt.state === "rejected" ? "removed" : "warning"} />}
      <Text>{m("requestId")}</Text><code>{item.id}</code>
    </Inline></div>
    {receipt && <Inline space="space.200" shouldWrap>
      <Text>{m("actor")}</Text><BackendText value={receipt.actor} />
      {"action" in receipt && <><Text>{m("action")}</Text><BackendText value={receipt.action} /></>}
    </Inline>}
    {receipt?.state === "queued" && <Text>{m("queuedNote")}</Text>}
    {receipt?.gaps.map(gap => <BackendText key={gap} value={gap} />)}
    {error != null && <ErrorNotice error={error} />}
    {error != null && pending && <Text>{m("uncertain")}</Text>}
    <Inline space="space.100" shouldWrap>
      {pending && <Button appearance="subtle" onClick={() => check(item)} isDisabled={item.checking}>{m("refreshReceipt")}</Button>}
      {receipt && receipt.state !== "queued" && <Link to={"/audit?request=" + encodeURIComponent(item.id)}>{m("findAudit")}</Link>}
      <Button appearance="subtle" onClick={() => dismiss(item.id)}>{m("dismiss")}</Button>
    </Inline>
  </Stack></div>;
}
export function InlineReceipts({ scope }: { scope: string }) {
  const { items } = useCommands();
  return <Stack space="space.100">{items.filter(item => item.scope === scope && !item.dismissed)
    .map(item => <ReceiptBadge key={item.id} item={item} />)}</Stack>;
}
