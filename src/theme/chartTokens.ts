export const chartTokens = {
  surface: "var(--ds-surface)",
  grid: "var(--ds-border)",
  axis: "var(--ds-text-subtlest)",
  positive: "var(--ds-text-success)",
  negative: "var(--ds-text-danger)",
  series1: "var(--ds-chart-categorical-1, var(--ds-background-brand-bold))",
  series2: "var(--ds-text-subtle)",
};

// Lightweight Charts uses canvas, so it needs the computed colors.
export function canvasColors() {
  const root = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => root.getPropertyValue(name).trim() || fallback;
  return {
    background: read("--ds-surface", "#ffffff"),
    axis: read("--ds-text-subtlest", "#44546f"),
    grid: read("--ds-border", "#dcdfe4"),
    series: read("--ds-chart-categorical-1", read("--ds-background-brand-bold", "#0055cc")),
    target: read("--ds-text-subtlest", "#44546f"),
    warning: read("--ds-text-warning", "#974f0c"),
    buy: read("--ds-text-success", "#216e4e"),
    sell: read("--ds-text-danger", "#ae2e24"),
  };
}
