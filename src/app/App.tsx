import desk from "../desk.module.css";
import Dashboard from "@atlaskit/icon/core/dashboard";
import List from "@atlaskit/icon/core/list-bulleted";
import Search from "@atlaskit/icon/core/search";
import Chart from "@atlaskit/icon/core/chart-trend";
import AuditIcon from "@atlaskit/icon/core/pulse";
import Shield from "@atlaskit/icon/core/shield";
import Filter from "@atlaskit/icon/core/filter";
import SettingsIcon from "@atlaskit/icon/core/settings";
import ConnectIcon from "@atlaskit/icon/core/link";
import { lazy, Suspense, useState } from "react";
import { BrowserRouter, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Root, TopNav, TopNavStart, TopNavEnd, SideNav, SideNavBody, SideNavToggleButton, Main,
} from "@atlaskit/navigation-system";
import Button from "@atlaskit/button/new";
import Banner from "@atlaskit/banner";
import { Stack, Inline, Text } from "@atlaskit/primitives";
import { useMessage } from "../i18n/messages";
import { useDensity } from "../modes/density";
import { useTablet } from "../lib/useMedia";
import { useMode } from "../modes/ModeContext";
import { useHealth, useStatus } from "../api/queries";
import { CommandProvider } from "../api/mutations";
import { StatusLozenge } from "../ui/StatusLozenge";
import { ErrorBoundary, Loading } from "../ui/Feedback";
import { auth0Enabled } from "../api/auth-mode";
import { AuthControls } from "../features/connect/AuthControls";
import { AppProvider } from "./AppProvider";
import { useConnection } from "./Connection";
import { pages, Router } from "./router";

const Preferences = lazy(() => import("../features/settings/Preferences"));

const navIcons = { overview: Dashboard, positions: List, candidates: Search, performance: Chart,
  audit: AuditIcon, risk: Shield, controls: Filter, settings: SettingsIcon, connect: ConnectIcon };

function Shell() {
  const m = useMessage();
  const { session, changeSession } = useConnection();
  const { mode } = useMode();
  const health = useHealth();
  const status = useStatus();
  const { density } = useDensity();
  const tablet = useTablet();
  const navigate = useNavigate();
  const location = useLocation();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const connecting = location.pathname === "/connect" || session.kind === "connect";
  const links = (connecting ? [{ path: "/connect", label: "connect" as const }] : pages.filter(page => !page.expert || mode === "expert"));
  const navLinks = links.map(page => {
    const Icon = navIcons[page.label];
    return <NavLink className={desk["side-link"]} key={page.path} to={page.path} title={m(page.label)} end>
      <span className={desk["side-icon"]}><Icon label="" /></span><span className={desk["side-label"]}>{m(page.label)}</span>
    </NavLink>;
  });
  return <div className={desk["desk-frame"]} data-density={mode === "expert" ? density : "comfortable"} data-desktop-nav-open={desktopNavOpen}><Root defaultSideNavCollapsed={false} skipLinksLabel={m("skipNav")} skipLinksTriggerLabel={m("skipNav")}>
    <TopNav height={56} skipLinkLabel={m("topActions")}>
      <TopNavStart sideNavToggleButton={<SideNavToggleButton expandLabel={m("menu")} collapseLabel={m("closeNavigation")} />}>
        <NavLink to={connecting ? "/connect" : "/"} className={desk["brand"]}><Text weight="bold" size="large">{m("app")}</Text></NavLink>
      </TopNavStart>
      <TopNavEnd label={m("topActions")} showMoreButtonLabel={m("preferences")}>
        <div role="listitem">
        <Inline space="space.150" alignBlock="center">
          {!connecting && <span className={desk["health-pill"]}>{session.kind === "sample"
            ? <StatusLozenge label="sample" appearance="default" />
            : <StatusLozenge label={health.isError ? "unhealthy" : health.data?.journal_readable ? "healthy" : "apiStatus"}
              appearance={health.isError ? "removed" : health.data?.journal_readable ? "success" : "default"} />}</span>}
          {!connecting && status.data && <span className={desk["health-pill"]}><StatusLozenge label={status.data.execution_mode} /></span>}
          {!connecting && auth0Enabled() && session.kind === "connected" && <AuthControls />}
          {!connecting && session.kind === "sample" && <Button appearance="subtle" onClick={() => {
            changeSession({ kind: "connect" });
            navigate("/connect");
          }}>{m(auth0Enabled() ? "signIn" : "connect")}</Button>}
          <details className={desk["preferences-menu"]} onToggle={event => setPreferencesOpen(event.currentTarget.open)}>
            <summary>{m("preferences")}</summary>
            {preferencesOpen && <div className={desk["preferences-popup"]}>
              <ErrorBoundary><Suspense fallback={<Loading />}><Preferences /></Suspense></ErrorBoundary>
            </div>}
          </details>
        </Inline>
        </div>
      </TopNavEnd>
    </TopNav>
    {!tablet && <SideNav id="desk-navigation" defaultWidth={240} label={m("menu")} skipLinkLabel={m("menu")}
      onExpand={({ screen }) => { if (screen === "desktop") setDesktopNavOpen(true); }}
      onCollapse={({ screen }) => { if (screen === "desktop") setDesktopNavOpen(false); }}><SideNavBody>
      <div className={desk["side-content"]}><Stack space="space.100">
        <Text size="small" weight="semibold" color="color.text.subtle">{m("dashboard")}</Text>
        {navLinks}
      </Stack></div>
    </SideNavBody></SideNav>}
    <Main skipLinkLabel={m("skipNav")}>
      {location.state?.expertOnly && <Banner appearance="warning">{m("expertOnly")}</Banner>}
      {!connecting && session.kind === "sample" && <Banner appearance="announcement">{m("sampleNote")}</Banner>}
      <div className={desk["route-frame"]}>{tablet && <nav className={desk["compact-rail"]} aria-label={m("menu")}>{navLinks}</nav>}<div className={desk["route-content"]}><Router /></div></div>
    </Main>
  </Root></div>;
}

function ConnectedShell() {
  const { generation } = useConnection();
  return <CommandProvider key={generation}><ErrorBoundary><Shell /></ErrorBoundary></CommandProvider>;
}
export default function App() {
  return <BrowserRouter><AppProvider><ConnectedShell /></AppProvider></BrowserRouter>;
}
