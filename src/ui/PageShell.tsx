import desk from "../desk.module.css";
import type { ReactNode } from "react";
import Page from "@atlaskit/page";
import Heading from "@atlaskit/heading";
import { Grid, Inline, Stack, Text } from "@atlaskit/primitives";
import { FormattedMessage } from "react-intl";
import { messages, type MessageId } from "../i18n/messages";

const descriptions: Partial<Record<MessageId, MessageId>> = {
  overview: "overviewIntro", positions: "positionsIntro", candidates: "candidatesIntro",
  performance: "performanceIntro", audit: "auditIntro", risk: "riskIntro",
  controls: "controlsIntro", settings: "settingsIntro", connect: "connectIntro",
};

export function PageShell({ title, actions, children }: { title: MessageId; actions?: ReactNode; children: ReactNode }) {
  const description = descriptions[title];
  return <Page><div className={desk["page"]}>
    <header className={desk["page-header"]}>
      <Stack space="space.100">
        <Heading size="large" as="h1"><FormattedMessage {...messages[title]} /></Heading>
        {description && <Text color="color.text.subtle"><FormattedMessage {...messages[description]} /></Text>}
      </Stack>
      {actions && <div>{actions}</div>}
    </header>
    <Stack space="space.400">{children}</Stack>
  </div></Page>;
}

export function Panel({ title, children, actions }: { title: MessageId; children: ReactNode; actions?: ReactNode }) {
  return <section className={desk["panel"]}><Stack space="space.200">
    <Inline spread="space-between" alignBlock="center" shouldWrap space="space.100">
      <Heading size="small" as="h2"><FormattedMessage {...messages[title]} /></Heading>
      {actions}
    </Inline>
    {children}
  </Stack></section>;
}

export function DashboardGrid({ children, variant = "split" }: { children: ReactNode; variant?: "split" | "metrics" | "full" }) {
  return <div className={variant === "metrics" ? desk["metric-layout"] : variant === "full" ? desk["full-layout"] : desk["split-layout"]}>
    <Grid templateColumns="repeat(12, minmax(0, 1fr))" columnGap="space.300" rowGap="space.300">{children}</Grid>
  </div>;
}
