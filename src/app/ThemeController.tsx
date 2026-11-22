import { useEffect, useState, type ReactNode } from "react";
import { useSetColorMode } from "@atlaskit/app-provider";
import { ThemeContext, type ThemeMode } from "../theme/useTheme";
import { readPreference, writePreference } from "../lib/preferences";

export function ThemeController({ children }: { children: ReactNode }) {
  const [mode, update] = useState<ThemeMode>(() => {
    const saved = readPreference("dex-theme");
    return saved === "dark" || saved === "light" ? saved : "auto";
  });
  const apply = useSetColorMode();
  useEffect(() => {
    apply(mode);
  }, [apply, mode]);
  return <ThemeContext.Provider value={{ mode, setMode: value => {
    writePreference("dex-theme", value);
    update(value);
  } }}>{children}</ThemeContext.Provider>;
}
