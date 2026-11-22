import { useId, useState, type ReactNode } from "react";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from "@atlaskit/modal-dialog";
import { Stack, Text } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";

export function ConfirmDialog({ open, title, help, current, onCancel, onConfirm, canConfirm = true, phrase }: {
  open: boolean; canConfirm?: boolean; phrase?: string; title: MessageId; help: MessageId; current: ReactNode; onCancel: () => void; onConfirm: () => void;
}) {
  const m = useMessage();
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const cancel = () => { setTyped(""); onCancel(); };
  return <ModalTransition>{open && <Modal onClose={cancel}>
    <ModalHeader><ModalTitle>{m(title)}</ModalTitle></ModalHeader>
    <ModalBody><Stack space="space.150">
      <Text>{m(help)}</Text>
      <Text weight="semibold">{m("current")}</Text>
      {current}
      {phrase && <>
        <label htmlFor={inputId}>{m("typeArm", { phrase })}</label>
        <TextField id={inputId} value={typed} autoComplete="off" onChange={event => setTyped(event.currentTarget.value)} />
      </>}
    </Stack></ModalBody>
    <ModalFooter>
      <Button onClick={cancel} appearance="subtle" autoFocus>{m("cancel")}</Button>
      <Button onClick={() => { setTyped(""); onConfirm(); }} appearance={phrase ? "danger" : "primary"} isDisabled={!canConfirm || (!!phrase && typed !== phrase)}>{m("confirm")}</Button>
    </ModalFooter>
  </Modal>}</ModalTransition>;
}
