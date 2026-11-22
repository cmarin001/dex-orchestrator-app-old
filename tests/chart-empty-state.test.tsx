import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EquityCharts } from "../src/features/performance/Performance";
import { renderPanel } from "./render";

it("renders an empty state for zero equity publications", () => {
  renderPanel(<EquityCharts history={[]} />);
  expect(screen.getByText("No closed trades yet — the equity curve appears after the first close.")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Drawdown" })).toBeNull();
});
