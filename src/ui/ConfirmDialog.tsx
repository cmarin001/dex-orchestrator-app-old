import type { ReactNode } from "react";
import Button from "@atlaskit/button/new";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from "@atlaskit/modal-dialog";
import { Stack, Text } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";

export function ConfirmDialog({ open, title, help, current, onCancel, onConfirm, canConfirm = true }: {
  open: boolean; canConfirm?: boolean; title: MessageId; help: MessageId; current: ReactNode; onCancel: () => void; onConfirm: () => void;
}) {
  const m = useMessage();
  return <ModalTransition>{open && <Modal onClose={onCancel}>
    <ModalHeader><ModalTitle>{m(title)}</ModalTitle></ModalHeader>
    <ModalBody><Stack space="space.150">
      <Text>{m(help)}</Text>
      <Text weight="semibold">{m("current")}</Text>
      {current}
    </Stack></ModalBody>
    <ModalFooter>
      <Button onClick={onCancel} appearance="subtle" autoFocus>{m("cancel")}</Button>
      <Button onClick={onConfirm} appearance="primary" isDisabled={!canConfirm}>{m("confirm")}</Button>
    </ModalFooter>
  </Modal>}</ModalTransition>;
}
