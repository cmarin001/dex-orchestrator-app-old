import { useState, type ReactNode } from "react";
import { ModeContext, type Mode } from "../modes/ModeContext";
import { readPreference, writePreference } from "../lib/preferences";
export function ModeController({ children }: { children: ReactNode }) {
  const [mode, update] = useState<Mode>(() => readPreference("dex-mode") === "expert" ? "expert" : "simple");
  return <ModeContext.Provider value={{ mode, setMode: value => {
    writePreference("dex-mode", value);
    update(value);
  } }}>{children}</ModeContext.Provider>;
}
