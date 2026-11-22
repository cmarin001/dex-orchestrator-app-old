import { screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, it } from "vitest";
import { renderApp } from "./render";

const routes = [
  ["/", "Overview"], ["/positions", "Positions"], ["/audit", "Audit"], ["/risk", "Risk"], ["/controls", "Controls"],
  ["/candidates", "Candidates"], ["/performance", "Performance"], ["/settings", "Settings"], ["/connect", "Connect to backend"],
] as const;
it.each(routes)("has no critical or serious a11y violations on %s", async (path, heading) => {
  renderApp(path, { expert: true, connected: true });
  await screen.findByRole("heading", { level: 1, name: heading });
  const result = await axe.run(document, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.filter(violation => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});
