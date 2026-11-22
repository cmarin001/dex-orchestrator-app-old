import { useState, type ReactNode } from "react";
import Button from "@atlaskit/button/new";
import Tooltip from "@atlaskit/tooltip";
import { useMessage, type MessageId } from "../i18n/messages";
import { useConnection } from "../app/Connection";
import { ConfirmDialog } from "./ConfirmDialog";

type Action = { title: MessageId; help: MessageId; current: ReactNode; onConfirm: () => void };
export function ControlButton({ title, help, current, onConfirm, disabled }: Action & { disabled?: boolean }) {
  const m = useMessage();
  const [action, setAction] = useState<Action>();
  const { session } = useConnection();
  const canSubmit = !disabled && session.kind === "connected";
  return <>
    <Tooltip content={m(help)}><span><Button isDisabled={!canSubmit} onClick={() => setAction({ title, help, current, onConfirm })}>
      {m(title)}
    </Button></span></Tooltip>
    <ConfirmDialog open={!!action} title={action?.title ?? title} help={action?.help ?? help} current={action?.current}
      canConfirm={canSubmit && title === action?.title} onCancel={() => setAction(undefined)} onConfirm={() => {
        action?.onConfirm();
        setAction(undefined);
      }} />
  </>;
}
