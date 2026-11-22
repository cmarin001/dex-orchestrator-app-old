import { createContext, useContext } from "react";
export type Density = "comfortable" | "compact";
export const DensityContext = createContext<{ density: Density; setDensity: (value: Density) => void }>({
  density: "comfortable", setDensity() {},
});
export const useDensity = () => useContext(DensityContext);
