import Lozenge from "@atlaskit/lozenge";
import { useMessage, type MessageId } from "../i18n/messages";
export function StatusLozenge({ label, appearance }: {
  label: MessageId; appearance?: "default" | "success" | "removed" | "inprogress" | "new" | "warning";
}) {
  const m = useMessage();
  return <Lozenge appearance={appearance}>{m(label)}</Lozenge>;
}
