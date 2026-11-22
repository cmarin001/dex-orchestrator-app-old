import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import SectionMessage from "@atlaskit/section-message";
import { Inline, Stack, Text } from "@atlaskit/primitives";
import { configuredOrigin, verifyConnection } from "../../api/client";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { ErrorNotice } from "../../ui/Feedback";
import { PageShell } from "../../ui/PageShell";

export default function Connect() {
  const { changeSession } = useConnection();
  const m = useMessage();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef<AbortController>();
  useEffect(() => () => pending.current?.abort(), []);
  return <PageShell title="connect"><div className="connect-form panel">
    <form onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const controller = new AbortController();
      pending.current?.abort();
      pending.current = controller;
      setError(null);
      setBusy(true);
      try {
        const session = await verifyConnection(String(data.get("origin")), String(data.get("token")), controller.signal);
        if (controller.signal.aborted) return;
        form.reset();
        changeSession(session);
        navigate("/", { replace: true });
      } catch (error) {
        if (!controller.signal.aborted) setError(error);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }}>
      <Stack space="space.200">
        <SectionMessage appearance="information"><Text>{m("tokenNote")}</Text></SectionMessage>
        <label htmlFor="backend-origin">{m("backendUrl")}</label>
        <TextField id="backend-origin" name="origin" type="url" defaultValue={configuredOrigin()} isRequired />
        <label htmlFor="backend-token">{m("bearer")}</label>
        <TextField id="backend-token" name="token" type="password" autoComplete="off" isRequired />
        {error != null && <ErrorNotice error={error} />}
        <Inline space="space.100" shouldWrap>
          <Button appearance="primary" type="submit" isLoading={busy}>{m(busy ? "connecting" : "connect")}</Button>
          <Button appearance="subtle" onClick={() => { changeSession({ kind: "sample" }); navigate("/", { replace: true }); }}>
            {m("sampleOpen")}
          </Button>
        </Inline>
      </Stack>
    </form>
  </div></PageShell>;
}
