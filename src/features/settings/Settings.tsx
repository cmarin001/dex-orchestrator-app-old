import desk from "../../desk.module.css";
import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@atlaskit/button/new";
import { Inline, Text } from "@atlaskit/primitives";
import { AuthControls } from "../connect/AuthControls";
import { auth0Enabled } from "../../api/auth-mode";
import { configuredOrigin } from "../../api/client";
import { useConnection } from "../../app/Connection";
import { useMessage } from "../../i18n/messages";
import { useMode } from "../../modes/ModeContext";
import { useDensity } from "../../modes/density";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { PageShell, Panel } from "../../ui/PageShell";
import { SelectField } from "../../ui/SelectField";
import Preferences from "./Preferences";

export default function Settings() {
  const { mode } = useMode();
  const { density, setDensity } = useDensity();
  const { session, changeSession } = useConnection();
  const navigate = useNavigate();
  const m = useMessage();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const change = () => { changeSession({ kind: "connect" }); navigate("/connect"); };
  return <PageShell title="settings">
    <Panel title="appearance">
      <Preferences section="appearance" />
      {mode === "expert" && <div className={desk["filter-standalone"]}><SelectField id={id} label="density" value={density} onChange={setDensity}
        options={(["comfortable", "compact"] as const).map(key => ({ label: m(key), value: key }))} /></div>}
    </Panel>
    <Panel title="language"><Preferences section="language" /></Panel>
    <Panel title="connection">
      {auth0Enabled() ? <AuthControls /> : <>
        {mode === "expert" && <Text>{session.kind === "connected" ? session.origin : configuredOrigin()}</Text>}
        <Inline space="space.100" shouldWrap>
          <Button appearance="subtle" onClick={change}>{m(session.kind === "connected" ? "disconnect" : "connect")}</Button>
          {mode === "expert" && session.kind === "connected" &&
            <Button appearance="subtle" onClick={() => setEditing(true)}>{m("editOrigin")}</Button>}
        </Inline>
        <ConfirmDialog open={editing} title="editOrigin" help="editOriginHelp"
          current={<Text>{session.kind === "connected" ? session.origin : configuredOrigin()}</Text>}
          onCancel={() => setEditing(false)} onConfirm={change} />
      </>}
    </Panel>
  </PageShell>;
}
