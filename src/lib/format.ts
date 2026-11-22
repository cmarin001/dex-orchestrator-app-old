import { useIntl } from "react-intl";
import { useMessage } from "../i18n/messages";

export function useFormat() {
  const intl = useIntl();
  const msg = useMessage();
  const available = (value: number | null | undefined, format: (number: number) => string) =>
    value == null || !Number.isFinite(value) ? msg("unavailable") : format(value);
  return {
    usd: (n?: number | null, precision = 2) => available(n, v => intl.formatNumber(v, {
      style: "currency", currency: "USD", maximumFractionDigits: precision,
    })),
    number: (n?: number | null) => available(n, v => intl.formatNumber(v, { maximumFractionDigits: 4 })),
    percent: (n?: number | null) => available(n, v => intl.formatNumber(v, { style: "percent", maximumFractionDigits: 2 })),
    bps: (n?: number | null) => available(n, count => msg("bps", { count })),
    date: (value?: string | number | null) => {
      const timestamp = typeof value === "string" ? Date.parse(value) : value;
      return available(timestamp, v => intl.formatDate(v, { dateStyle: "medium", timeStyle: "short" }));
    },
    duration: (seconds?: number | null) => available(seconds, v => {
      if (v >= 86_400) return msg("dayDuration", { count: Math.floor(v / 86_400) });
      if (v >= 3600) return msg("hourDuration", { count: Math.round(v / 360) / 10 });
      if (v >= 60) return msg("minuteDuration", { count: Math.floor(v / 60) });
      return msg("shortDuration", { count: Math.floor(v) });
    }),
  };
}
