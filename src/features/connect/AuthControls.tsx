import { useState } from "react";
import Button from "@atlaskit/button/new";
import { signIn, signOut } from "../../api/auth";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { ErrorNotice } from "../../ui/Feedback";

export function AuthControls() {
  const m = useMessage();
  const { session, changeSession } = useConnection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  if (session.kind !== "connected") return <Button appearance="primary" onClick={signIn}>{m("signIn")}</Button>;
  return <div>
    <Button isLoading={busy} onClick={async () => {
      setError(undefined);
      setBusy(true);
      try {
        await signOut();
        changeSession({ kind: "sample" });
      } catch (error) {
        setError(error);
      } finally {
        setBusy(false);
      }
    }}>{m("signOut")}</Button>
    <ErrorNotice error={error} />
  </div>;
}
