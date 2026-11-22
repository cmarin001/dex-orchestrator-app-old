import { createContext, useContext } from "react";
export type ThemeMode = "light" | "dark" | "auto";
export const ThemeContext = createContext<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void }>({ mode: "auto", setMode() {} });
export const useTheme = () => useContext(ThemeContext);
