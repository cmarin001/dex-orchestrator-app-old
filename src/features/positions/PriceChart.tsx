import { useEffect, useRef } from "react";
import { useColorMode } from "@atlaskit/app-provider";
import { createChart, createSeriesMarkers, LineSeries, LineStyle, LineType, ColorType } from "lightweight-charts";
import type { UTCTimestamp } from "lightweight-charts";
import { useIntl } from "react-intl";
import type { LiveView } from "../../api/types";
import { useMessage } from "../../i18n/messages";
import { canvasColors } from "../../theme/chartTokens";

const seconds = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp;
function createPriceChart(root: HTMLDivElement) {
  const chart = createChart(root, { autoSize: true, timeScale: { timeVisible: true } });
  const series = chart.addSeries(LineSeries, {
    lineWidth: 2, priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
  });
  const entry = series.createPriceLine({ price: 0, lineStyle: LineStyle.Dashed });
  const target = chart.addSeries(LineSeries, { lineType: LineType.WithSteps, lineWidth: 1, priceLineVisible: false });
  return { chart, series, entry, target, markers: createSeriesMarkers(series) };
}
export function PriceChart({ view }: { view: LiveView }) {
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<ReturnType<typeof createPriceChart>>();
  const palette = useRef<ReturnType<typeof canvasColors>>();
  const fitted = useRef(false);
  const colorMode = useColorMode();
  const intl = useIntl();
  const m = useMessage();
  const label = m("priceChart"), entryLabel = m("entry"), targetLabel = m("targetPrice"), buy = m("buy"), sell = m("sell");
  useEffect(() => {
    if (!root.current) return;
    const current = createPriceChart(root.current);
    api.current = current;
    return () => { current.chart.remove(); api.current = undefined; fitted.current = false; };
  }, []);
  useEffect(() => {
    if (!api.current) return;
    const colors = canvasColors();
    palette.current = colors;
    api.current.chart.applyOptions({
      layout: { background: { type: ColorType.Solid, color: colors.background }, textColor: colors.axis },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
    });
    api.current.series.applyOptions({ color: colors.series });
    api.current.entry.applyOptions({ color: colors.axis });
    api.current.target.applyOptions({ color: colors.target });
  }, [colorMode]);
  useEffect(() => {
    const value = api.current;
    const colors = palette.current;
    if (!value || !colors) return;
    value.chart.applyOptions({ localization: { locale: intl.locale } });
    const points = new Map<UTCTimestamp, number>([[seconds(view.entry_at), view.entry_price]]);
    for (const mark of view.marks) points.set(seconds(mark.at), mark.price);
    for (const point of view.series) points.set(seconds(point.t), point.price);
    value.series.setData([...points.entries()].sort(([a], [b]) => a - b).map(([time, value]) => ({ time, value })));
    const targets = new Map(view.target_series.map(point => [seconds(point.t), point.price]));
    value.target.setData([...targets.entries()].sort(([a], [b]) => a - b).map(([time, value]) => ({ time, value })));
    value.target.applyOptions({ title: targetLabel });
    value.entry.applyOptions({ price: view.entry_price, title: entryLabel });
    value.markers.setMarkers([...view.marks].sort((a, b) => a.at - b.at).map(mark => ({
      time: seconds(mark.at), position: "atPriceMiddle", price: mark.price,
      color: mark.side === "buy" ? colors.buy : colors.sell,
      shape: mark.side === "buy" ? "arrowUp" : "arrowDown", text: mark.side === "buy" ? buy : sell,
    })));
    if (!fitted.current) { value.chart.timeScale().fitContent(); fitted.current = true; }
  }, [view, intl.locale, colorMode, entryLabel, targetLabel, buy, sell]);
  return <div ref={root} className="chart" role="img" aria-label={label} />;
}
