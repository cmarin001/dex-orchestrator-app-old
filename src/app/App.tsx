import { lazy, Suspense, useState } from "react";
import { BrowserRouter, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Root, TopNav, TopNavStart, TopNavEnd, SideNav, SideNavBody, SideNavToggleButton, Main,
} from "@atlaskit/navigation-system";
import Button from "@atlaskit/button/new";
import Banner from "@atlaskit/banner";
import { Stack, Inline, Text } from "@atlaskit/primitives";
import { useMessage } from "../i18n/messages";
import { useMode } from "../modes/ModeContext";
import { useHealth } from "../api/queries";
import { CommandProvider } from "../api/mutations";
import { StatusLozenge } from "../ui/StatusLozenge";
import { ErrorBoundary, Loading } from "../ui/Feedback";
import { auth0Enabled } from "../api/auth-mode";
import { AuthControls } from "../features/connect/AuthControls";
import { AppProvider } from "./AppProvider";
import { useConnection } from "./Connection";
import { pages, Router } from "./router";

const Preferences = lazy(() => import("../features/settings/Preferences"));

function Shell() {
  const m = useMessage();
  const { session, changeSession } = useConnection();
  const { mode } = useMode();
  const health = useHealth();
  const navigate = useNavigate();
  const location = useLocation();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const connecting = location.pathname === "/connect" || session.kind === "connect";
  return <div data-desktop-nav-open={desktopNavOpen}><Root defaultSideNavCollapsed={false} skipLinksLabel={m("skipNav")} skipLinksTriggerLabel={m("skipNav")}>
    <TopNav skipLinkLabel={m("topActions")}>
      <TopNavStart sideNavToggleButton={<SideNavToggleButton expandLabel={m("menu")} collapseLabel={m("closeNavigation")} />}>
        <NavLink to={connecting ? "/connect" : "/"} className="brand"><Text weight="bold" size="large">{m("app")}</Text></NavLink>
      </TopNavStart>
      <TopNavEnd label={m("topActions")} showMoreButtonLabel={m("preferences")}>
        <div role="listitem">
        <Inline space="space.150" alignBlock="center">
          {!connecting && <span className="health-pill">{session.kind === "sample"
            ? <StatusLozenge label="sample" appearance="new" />
            : <StatusLozenge label={health.isError ? "unhealthy" : health.data?.journal_readable ? "healthy" : "apiStatus"}
              appearance={health.isError ? "removed" : health.data?.journal_readable ? "success" : "default"} />}</span>}
          {!connecting && auth0Enabled() && session.kind === "connected" && <AuthControls />}
          {!connecting && session.kind === "sample" && <Button onClick={() => {
            changeSession({ kind: "connect" });
            navigate("/connect");
          }}>{m(auth0Enabled() ? "signIn" : "connect")}</Button>}
          <details className="preferences-menu" onToggle={event => setPreferencesOpen(event.currentTarget.open)}>
            <summary>{m("preferences")}</summary>
            {preferencesOpen && <div className="preferences-popup">
              <ErrorBoundary><Suspense fallback={<Loading />}><Preferences /></Suspense></ErrorBoundary>
            </div>}
          </details>
        </Inline>
        </div>
      </TopNavEnd>
    </TopNav>
    <SideNav id="desk-navigation" defaultWidth={240} label={m("menu")} skipLinkLabel={m("menu")}
      onExpand={({ screen }) => { if (screen === "desktop") setDesktopNavOpen(true); }}
      onCollapse={({ screen }) => { if (screen === "desktop") setDesktopNavOpen(false); }}><SideNavBody>
      <div className="side-content"><Stack space="space.100">
        <Text size="small" weight="semibold" color="color.text.subtle">{m("dashboard")}</Text>
        {connecting ? <NavLink className="side-link" to="/connect">{m("connect")}</NavLink>
          : pages.filter(page => !page.expert || mode === "expert").map(page =>
            <NavLink className="side-link" key={page.path} to={page.path} end>{m(page.label)}</NavLink>)}
      </Stack></div>
    </SideNavBody></SideNav>
    <Main skipLinkLabel={m("skipNav")}>
      {location.state?.expertOnly && <Banner appearance="warning">{m("expertOnly")}</Banner>}
      {!connecting && session.kind === "sample" && <Banner appearance="announcement">{m("sampleNote")}</Banner>}
      <Router />
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
