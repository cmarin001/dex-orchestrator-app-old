import { useState, type ReactNode } from "react";
import { ModeContext, type Mode } from "../modes/ModeContext";
import { DensityContext, type Density } from "../modes/density";
import { readPreference, writePreference } from "../lib/preferences";
export function ModeController({ children }: { children: ReactNode }) {
  const [mode, update] = useState<Mode>(() => readPreference("dex-mode") === "expert" ? "expert" : "simple");
  const [density, setDensity] = useState<Density>(() => readPreference("dex-density") === "compact" ? "compact" : "comfortable");
  return <ModeContext.Provider value={{ mode, setMode: value => {
    writePreference("dex-mode", value);
    update(value);
  } }}><DensityContext.Provider value={{ density, setDensity: value => {
    writePreference("dex-density", value);
    setDensity(value);
  } }}>{children}</DensityContext.Provider></ModeContext.Provider>;
}
