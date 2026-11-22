import desk from "../desk.module.css";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { Stack } from "@atlaskit/primitives";
import { messages, type MessageId } from "../i18n/messages";

export function Metric({ label, value, detail }: { label: MessageId; value: ReactNode; detail?: ReactNode }) {
  return <div className={desk["metric"]}><Stack space="space.100">
    <span className={desk["data-label"]}><FormattedMessage {...messages[label]} /></span>
    <div className={desk["metric-value"]}>{value}</div>
    {detail}
  </Stack></div>;
}
