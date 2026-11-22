import { createContext, useContext } from "react";
export type Mode = "simple" | "expert";
export const ModeContext = createContext<{ mode: Mode; setMode: (mode: Mode) => void }>({ mode: "simple", setMode() {} });
export const useMode = () => useContext(ModeContext);
