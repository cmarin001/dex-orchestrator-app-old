import type { ReactNode } from "react";
import { Stack, Text, MetricText } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";

export function Metric({ label, value, detail }: { label: MessageId; value: string; detail?: ReactNode }) {
  const m = useMessage();
  return <div className="panel"><Stack space="space.100">
    <Text color="color.text.subtle" weight="semibold">{m(label)}</Text>
    <MetricText size="large">{value}</MetricText>
    {detail}
  </Stack></div>;
}
