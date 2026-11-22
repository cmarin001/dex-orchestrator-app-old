import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, setSession } from "../api/client";
import { browserSession } from "../api/auth";
import { auth0Enabled, sessionExpired } from "../api/auth-mode";

type Session = ReturnType<typeof getSession>;
const Context = createContext<{ session: Session; generation: number; changeSession: (next: Session) => void }>({
  session: { kind: "sample" }, generation: 0, changeSession() {},
});
export function Connection({ children }: { children: ReactNode }) {
  const [session, update] = useState(getSession);
  const [generation, bump] = useState(0);
  const client = useQueryClient();
  const changeSession = useCallback((next: Session) => {
    client.clear();
    setSession(next);
    bump(value => value + 1);
    update(next);
  }, [client]);
  useEffect(() => {
    if (!auth0Enabled()) return;
    const controller = new AbortController();
    const expired = () => {
      if (getSession().kind === "connected") changeSession({ kind: "connect" });
    };
    window.addEventListener(sessionExpired, expired);
    void browserSession(controller.signal).then(authenticated => {
      if (!controller.signal.aborted && authenticated) changeSession({ kind: "connected", origin: window.location.origin });
    }).catch(() => { /* Public sample data stays available while the BFF is unavailable. */ });
    return () => { controller.abort(); window.removeEventListener(sessionExpired, expired); };
  }, [changeSession]);
  return <Context.Provider value={{ session, generation, changeSession }}>{children}</Context.Provider>;
}
export const useConnection = () => useContext(Context);
