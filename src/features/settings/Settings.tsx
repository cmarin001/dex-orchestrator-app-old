import { useNavigate } from "react-router-dom";
import Button from "@atlaskit/button/new";
import { Text } from "@atlaskit/primitives";
import { AuthControls } from "../connect/AuthControls";
import { auth0Enabled } from "../../api/auth-mode";
import { configuredOrigin } from "../../api/client";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { useMode } from "../../modes/ModeContext";
import { PageShell, Panel } from "../../ui/PageShell";

import Preferences from "./Preferences";

export default function Settings() {
  const { mode } = useMode();
  const { session, changeSession } = useConnection();
  const navigate = useNavigate();
  const m = useMessage();
  return <PageShell title="settings">
    <Panel title="preferences"><Preferences /></Panel>
    {mode === "expert" && auth0Enabled() && <Panel title="connect"><AuthControls /></Panel>}
    {mode === "expert" && !auth0Enabled() && <Panel title="backendUrl">
      <Text>{session.kind === "connected" ? session.origin : configuredOrigin()}</Text>
      <div><Button onClick={() => { changeSession({ kind: "connect" }); navigate("/connect"); }}>
        {m(session.kind === "connected" ? "disconnect" : "connect")}
      </Button></div>
    </Panel>}
  </PageShell>;
}
