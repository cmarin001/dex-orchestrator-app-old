import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { MessageId } from "../i18n/messages";
import { useConnection } from "./Connection";
import { useMode } from "../modes/ModeContext";
import { ErrorBoundary, Loading } from "../ui/Feedback";

const Overview = lazy(() => import("../features/overview/Overview"));
const Positions = lazy(() => import("../features/positions/Positions"));
const Wallets = lazy(() => import("../features/wallets/Wallets"));
const Candidates = lazy(() => import("../features/candidates/Candidates"));
const Performance = lazy(() => import("../features/performance/Performance"));
const Audit = lazy(() => import("../features/audit/Audit"));
const Risk = lazy(() => import("../features/risk/Risk"));
const Controls = lazy(() => import("../features/controls/Controls"));
const Connect = lazy(() => import("../features/connect/Connect"));
const Settings = lazy(() => import("../features/settings/Settings"));

export const pages = [
  { path: "/", label: "overview", Component: Overview },
  { path: "/positions", label: "positions", Component: Positions },
  { path: "/wallets", label: "wallets", Component: Wallets },
  { path: "/candidates", label: "candidates", Component: Candidates, expert: true },
  { path: "/performance", label: "performance", Component: Performance, expert: true },
  { path: "/audit", label: "audit", Component: Audit },
  { path: "/risk", label: "risk", Component: Risk },
  { path: "/controls", label: "controls", Component: Controls },
  { path: "/settings", label: "settings", Component: Settings },
] satisfies { path: string; label: MessageId; Component: typeof Overview; expert?: boolean }[];

export function Router() {
  const { session } = useConnection();
  const { mode } = useMode();
  const location = useLocation();
  const connecting = session.kind === "connect";
  return <ErrorBoundary resetKey={location.key}><Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/connect" element={<Connect />} />
      {pages.map(({ path, Component, expert }) => <Route key={path} path={path}
        element={connecting ? <Navigate to="/connect" replace /> : expert && mode !== "expert"
          ? <Navigate to="/" replace state={{ expertOnly: true }} /> : <Component />} />)}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense></ErrorBoundary>;
}
