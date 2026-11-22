import type { ReactNode } from "react";
import Page from "@atlaskit/page";
import PageHeader from "@atlaskit/page-header";
import Heading from "@atlaskit/heading";
import { Stack } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";

export function PageShell({ title, actions, children }: { title: MessageId; actions?: ReactNode; children: ReactNode }) {
  const m = useMessage();
  return <Page><div className="page">
    <PageHeader actions={actions ? <>{actions}</> : undefined}>{m(title)}</PageHeader>
    <Stack space="space.400">{children}</Stack>
  </div></Page>;
}
export function Panel({ title, children }: { title: MessageId; children: ReactNode }) {
  const m = useMessage();
  return <section className="panel"><Stack space="space.200">
    <Heading size="small">{m(title)}</Heading>
    {children}
  </Stack></section>;
}
