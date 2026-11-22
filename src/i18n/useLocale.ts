import { createContext, useContext } from "react";
export type Locale = "en" | "es";
export const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale() {} });
export const useLocale = () => useContext(LocaleContext);
