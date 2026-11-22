import { createContext, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, setSession } from "../api/client";

type Session = ReturnType<typeof getSession>;
const Context = createContext<{ session: Session; generation: number; changeSession: (next: Session) => void }>({
  session: { kind: "sample" }, generation: 0, changeSession() {},
});
export function Connection({ children }: { children: ReactNode }) {
  const [session, update] = useState(getSession);
  const [generation, bump] = useState(0);
  const client = useQueryClient();
  return <Context.Provider value={{ session, generation, changeSession: next => {
    client.clear();
    setSession(next);
    bump(value => value + 1);
    update(next);
  } }}>{children}</Context.Provider>;
}
export const useConnection = () => useContext(Context);
