import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import desk from "../desk.module.css";
import { useMessage, type MessageId } from "../i18n/messages";
import { usePause, useResume } from "../api/mutations";

type Item = { id: string; label: string; run: () => void };

export function CommandPalette({
  open, onClose, onKill, pages,
}: {
  open: boolean;
  onClose: () => void;
  onKill: () => void;
  pages: { path: string; label: MessageId }[];
}) {
  const m = useMessage();
  const navigate = useNavigate();
  const pause = usePause();
  const resume = useResume();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => { navigate(path); onClose(); };
    return [
      { id: "kill", label: m("killTitle"), run: () => { onClose(); onKill(); } },
      { id: "pause", label: m("pause"), run: () => { pause({}); onClose(); } },
      { id: "resume", label: m("resume"), run: () => { resume({}); onClose(); } },
      ...pages.map(page => ({ id: page.path, label: m(page.label), run: go(page.path) })),
      { id: "connect", label: m("connect"), run: go("/connect") },
    ];
  }, [m, navigate, onClose, onKill, pages, pause, resume]);

  const shown = items.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const focus = window.setTimeout(() => input.current?.focus(), 0);
    return () => window.clearTimeout(focus);
  }, [open]);

  if (!open) return null;
  return (
    <div className={desk["overlay"]} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={m("palette")}
        className={desk["palette"]}
        onClick={event => event.stopPropagation()}
      >
        <input
          ref={input}
          value={query}
          placeholder={m("palettePlaceholder")}
          aria-label={m("palettePlaceholder")}
          className={desk["palette-input"]}
          onChange={event => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={event => {
            if (event.key === "Escape") { event.preventDefault(); onClose(); }
            if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(index + 1, shown.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
            if (event.key === "Enter" && shown[active]) { event.preventDefault(); shown[active].run(); }
          }}
        />
        <ul className={desk["palette-list"]} role="listbox">
          {shown.length === 0 && <li className={desk["palette-empty"]}>{m("noRecords")}</li>}
          {shown.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? desk["palette-active"] : desk["palette-item"]}
                onMouseEnter={() => setActive(index)}
                onClick={() => item.run()}
              >{item.label}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
