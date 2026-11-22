import desk from "../desk.module.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, NavLink, useLocation, useNavigate } from "react-router-dom";
import Button from "@atlaskit/button/new";
import Banner from "@atlaskit/banner";
import { useMessage, type MessageId } from "../i18n/messages";
import { useDensity } from "../modes/density";
import { useMode } from "../modes/ModeContext";
import { useHealth, usePositions, useStatus } from "../api/queries";
import { CommandProvider } from "../api/mutations";
import { ErrorBoundary, Loading } from "../ui/Feedback";
import { auth0Enabled } from "../api/auth-mode";
import { AuthControls } from "../features/connect/AuthControls";
import { AppProvider } from "./AppProvider";
import { useConnection } from "./Connection";
import { pages, Router } from "./router";
import { CommandPalette } from "./CommandPalette";
import { KillSwitch } from "./KillSwitch";
import { useFormat } from "../lib/format";

const Preferences = lazy(() => import("../features/settings/Preferences"));

const groups: { label: MessageId; items: MessageId[] }[] = [
  { label: "groupLive", items: ["overview", "positions", "wallets", "candidates"] },
  { label: "groupAnalysis", items: ["performance", "audit"] },
  { label: "groupControl", items: ["controls", "risk"] },
  { label: "groupSystem", items: ["settings"] },
];

function Shell() {
  const m = useMessage();
  const f = useFormat();
  const { session, changeSession } = useConnection();
  const { mode } = useMode();
  const health = useHealth();
  const status = useStatus();
  const positions = usePositions();
  const { density } = useDensity();
  const navigate = useNavigate();
  const location = useLocation();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const connecting = location.pathname === "/connect" || session.kind === "connect";
  const visible = connecting
    ? [{ path: "/connect", label: "connect" as const }]
    : pages.filter(page => !page.expert || mode === "expert");
  const data = status.data;
  const exposure = (positions.data?.items ?? []).reduce((sum, position) => sum + (position.size_usd || 0), 0);
  const pnl = (positions.data?.items ?? []).reduce((sum, position) => sum + (position.unrealized_pnl_usd ?? 0), 0);
  const cycleSec = data?.last_cycle_at ? Math.max(0, Math.round((Date.now() - Date.parse(data.last_cycle_at)) / 1000)) : null;

  useEffect(() => {
    let chord = "";
    let timer = 0;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.shiftKey) {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setKillOpen(true);
        return;
      }
      if (typing) return;
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setKillOpen(false);
        setHelpOpen(false);
        setNavOpen(false);
        return;
      }
      if (event.key === "?") { setHelpOpen(true); return; }
      const key = event.key.toLowerCase();
      if (chord === "g") {
        const map: Record<string, string> = { o: "/", p: "/positions", c: "/controls", a: "/audit", s: "/settings" };
        if (map[key]) navigate(map[key]);
        chord = "";
        return;
      }
      if (key === "g") {
        chord = "g";
        window.clearTimeout(timer);
        timer = window.setTimeout(() => { chord = ""; }, 800);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className={desk["shell"]} data-density={mode === "expert" ? density : "comfortable"} data-nav={navOpen ? "open" : "closed"}>
      <a className={desk["skip"]} href="#desk-main">{m("skipNav")}</a>
      <header className={desk["top"]}>
        <button type="button" className={desk["menu-button"]} aria-label={m("menu")} onClick={() => setNavOpen(open => !open)}>☰</button>
        <NavLink to={connecting ? "/connect" : "/"} className={desk["brand"]}>{m("app")}</NavLink>
        {!connecting && <>
          <span className={desk["pulse-wrap"]} title={m("lastCycle")}>
            <span className={`${desk["pulse"]} ${data?.entries_paused ? "" : "desk-pulse"}`} />
            <span className={desk["mono"]}>{cycleSec == null ? "—" : `${cycleSec}s`}</span>
          </span>
          <span className={desk["meta"]}>{m("operatingMode")} <strong className={desk["mono"]}>{data?.execution_mode ?? health.data?.mode ?? "—"}</strong></span>
          <span className={data?.live_execution_enabled ? desk["badge-danger"] : desk["badge-ok"]}>
            {data?.live_execution_enabled ? m("armed") : m("disarmed")}
          </span>
          <span className={desk["meta"]}>{data?.entries_paused ? m("paused") : m("entriesOn")}</span>
          <NavLink to="/positions" className={`${desk["mono"]} ${desk["meta"]}`}>{f.usd(positions.data ? exposure : null)}</NavLink>
          <NavLink to="/performance" className={`${desk["mono"]} ${pnl >= 0 ? desk["up"] : desk["down"]}`}>{f.usd(positions.data ? pnl : null)}</NavLink>
        </>}
        <span className={desk["spacer"]} />
        {!connecting && auth0Enabled() && session.kind === "connected" && <AuthControls />}
        {!connecting && session.kind === "sample" && <Button appearance="subtle" onClick={() => {
          changeSession({ kind: "connect" });
          navigate("/connect");
        }}>{m(auth0Enabled() ? "signIn" : "connect")}</Button>}
        <button type="button" className={desk["kbd"]} aria-label={m("palette")} onClick={() => setPaletteOpen(true)}>⌘K</button>
        <button type="button" className={desk["text-button"]} onClick={() => setPreferencesOpen(open => !open)}>{m("preferences")}</button>
        <button type="button" className={desk["kill"]} aria-label={m("kill")} onClick={() => setKillOpen(true)}>{m("kill")}</button>
      </header>
      {preferencesOpen && <div className={desk["preferences-popup"]}>
        <ErrorBoundary><Suspense fallback={<Loading />}><Preferences /></Suspense></ErrorBoundary>
      </div>}
      <div className={desk["body"]}>
        <nav className={desk["side"]} aria-label={m("menu")}>
          <div className={desk["side-kicker"]}>{m("desk")}</div>
          {connecting
            ? visible.map(page => <NavLink key={page.path} to={page.path} className={desk["side-link"]} end>{m(page.label)}</NavLink>)
            : groups.map(group => {
              const links = group.items.flatMap(label => visible.filter(page => page.label === label));
              if (!links.length) return null;
              return <div key={group.label}>
                <div className={desk["group"]}>{m(group.label)}</div>
                {links.map(page => <NavLink key={page.path} to={page.path} className={desk["side-link"]} end onClick={() => setNavOpen(false)}>{m(page.label)}</NavLink>)}
              </div>;
            })}
        </nav>
        <main id="desk-main" className={desk["main"]}>
          {location.state?.expertOnly && <Banner appearance="warning">{m("expertOnly")}</Banner>}
          {!connecting && session.kind === "sample" && <Banner appearance="announcement">{m("sampleNote")}</Banner>}
          <Router />
        </main>
      </div>
      <footer className={desk["bottom"]}>
        <span>desk</span>
        <span>{session.kind === "sample" ? m("sample") : data?.execution_mode ?? ""}</span>
        <span>{m(mode === "expert" ? "expert" : "simple")}</span>
      </footer>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onKill={() => setKillOpen(true)} pages={visible} />
      <KillSwitch open={killOpen} onClose={() => setKillOpen(false)} />
      {helpOpen && <div className={desk["overlay"]} onClick={() => setHelpOpen(false)}>
        <div role="dialog" aria-modal="true" aria-label={m("shortcuts")} className={desk["kill-dialog"]} onClick={event => event.stopPropagation()}>
          <h2>{m("shortcuts")}</h2>
          <ul className={desk["help-list"]}>
            <li><kbd>⌘K</kbd> {m("palette")}</li>
            <li><kbd>⌘⇧K</kbd> {m("kill")}</li>
            <li><kbd>G</kbd> {m("overview")} / {m("positions")} / {m("controls")}</li>
            <li><kbd>?</kbd> {m("shortcuts")}</li>
          </ul>
        </div>
      </div>}
    </div>
  );
}

function ConnectedShell() {
  const { generation } = useConnection();
  return <CommandProvider key={generation}><ErrorBoundary><Shell /></ErrorBoundary></CommandProvider>;
}
export default function App() {
  return <BrowserRouter><AppProvider><ConnectedShell /></AppProvider></BrowserRouter>;
}
