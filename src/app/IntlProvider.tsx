import { useEffect, useState, type ReactNode } from "react";
import { IntlProvider as ReactIntlProvider } from "react-intl";
import en from "../i18n/en.json";
import es from "../i18n/es.json";
import { LocaleContext, type Locale } from "../i18n/useLocale";
import { readPreference, writePreference } from "../lib/preferences";

export function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, update] = useState<Locale>(() => {
    const saved = readPreference("dex-locale");
    if (saved === "en" || saved === "es") return saved;
    return /^es(?:-|$)/i.test(navigator.language) ? "es" : "en";
  });
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale: value => {
    writePreference("dex-locale", value);
    update(value);
  } }}><ReactIntlProvider locale={locale} defaultLocale="en" messages={locale === "es" ? es : en}>
    {children}
  </ReactIntlProvider></LocaleContext.Provider>;
}
