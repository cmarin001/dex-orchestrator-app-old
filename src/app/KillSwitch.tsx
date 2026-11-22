import { useState } from "react";
import desk from "../desk.module.css";
import { useExit, usePause } from "../api/mutations";
import { usePositions } from "../api/queries";
import { useFormat } from "../lib/format";
import { useMessage } from "../i18n/messages";

export function KillSwitch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMessage();
  const f = useFormat();
  const pause = usePause();
  const exit = useExit();
  const positions = usePositions();
  const [full, setFull] = useState(false);
  const [word, setWord] = useState("");
  if (!open) return null;
  const items = positions.data?.items ?? [];
  const exposure = items.reduce((sum, position) => sum + (position.size_usd || 0), 0);
  const close = () => { setFull(false); setWord(""); onClose(); };
  return (
    <div className={desk["overlay"]} onClick={close}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="kill-title"
        className={desk["kill-dialog"]}
        onClick={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          if (word !== "KILL") return;
          pause({}, "kill-flatten");
          for (const position of items) exit({ run_id: position.run_id }, "kill-" + position.run_id);
          close();
        }}
      >
        <h2 id="kill-title">{m("killTitle")}</h2>
        <p className={desk["muted"]}>{items.length} · {f.usd(exposure)}. {m("pauseHelp")}</p>
        <button type="button" className={desk["choice"]} onClick={() => { pause({}, "kill-pause"); close(); }}>{m("killPause")}</button>
        <button type="button" className={full ? desk["choice-danger"] : desk["choice"]} onClick={() => setFull(true)}>{m("killFlatten")}</button>
        {full && (
          <label className={desk["kill-label"]}>
            {m("typeKill")}
            <input autoFocus value={word} autoComplete="off" onChange={event => setWord(event.target.value)} className={desk["kill-input"]} />
          </label>
        )}
        {full && <button type="submit" className={desk["kill"]} disabled={word !== "KILL"}>{m("confirm")}</button>}
      </form>
    </div>
  );
}
