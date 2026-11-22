import { render } from "@testing-library/react";
import { AppProvider } from "../src/app/AppProvider";
import App from "../src/app/App";
import type { ReactNode } from "react";
import { setSession } from "../src/api/client";
import { origin, token } from "./fixtures";

export function renderApp(path = "/", { connected = false, expert = false } = {}) {
  history.replaceState(null, "", path);
  if (connected) setSession({ kind: "connected", origin, token });
  if (expert) document.cookie = "dex-mode=expert; Path=/";
  return render(<App />);
}
export const renderPanel = (component: ReactNode) => render(<AppProvider>{component}</AppProvider>);
