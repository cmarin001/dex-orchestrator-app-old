import desk from "../desk.module.css";
import type { ReactNode } from "react";
import { Drawer, DrawerCloseButton, DrawerContent, DrawerSidebar } from "@atlaskit/drawer";
import Heading from "@atlaskit/heading";
import { Stack } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";

export function DetailsDrawer({ title, onClose, children }: { title: MessageId; onClose: () => void; children: ReactNode }) {
  const m = useMessage();
  return <Drawer isOpen label={m(title)} width="wide" onClose={onClose} enterFrom="right">
    <DrawerSidebar><DrawerCloseButton label={m("close")} /></DrawerSidebar>
    <DrawerContent scrollContentLabel={m(title)}><div className={desk["details-content"]}><Stack space="space.250">
      <Heading size="medium">{m(title)}</Heading>
      {children}
    </Stack></div></DrawerContent>
  </Drawer>;
}
