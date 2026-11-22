import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PriceChart } from "../src/features/positions/PriceChart";
import { useTheme } from "../src/theme/useTheme";
import { liveView } from "./fixtures";
import { renderPanel } from "./render";

const mocked = vi.hoisted(() => ({
  createChart: vi.fn(),
  applyChart: vi.fn(), applySeries: vi.fn(), applyEntry: vi.fn(),
}));
vi.mock("lightweight-charts", async importOriginal => {
  const real = await importOriginal<typeof import("lightweight-charts")>();
  return {
    ...real, createChart: mocked.createChart.mockImplementation(() => ({
      applyOptions: mocked.applyChart, remove: vi.fn(), timeScale: () => ({ fitContent: vi.fn() }),
      addSeries: () => ({ setData: vi.fn(), applyOptions: mocked.applySeries,
        createPriceLine: () => ({ applyOptions: mocked.applyEntry }) }),
    })),
    createSeriesMarkers: () => ({ setMarkers: vi.fn() }),
  };
});

function Switcher() {
  const { setMode } = useTheme();
  return <><button onClick={() => setMode("light")}>Light test</button>
    <button onClick={() => setMode("dark")}>Dark test</button><PriceChart view={liveView} /></>;
}

it("changes the root theme and applies the dark canvas colors without recreating the chart", async () => {
  renderPanel(<Switcher />);
  fireEvent.click(screen.getByText("Light test"));
  await waitFor(() => expect(document.documentElement.dataset.colorMode).toBe("light"));
  expect(mocked.createChart).toHaveBeenCalledTimes(1);
  const light = mocked.applyChart.mock.calls.filter(([options]) => options.layout).at(-1)?.[0].layout.background.color;
  fireEvent.click(screen.getByText("Dark test"));
  await waitFor(() => expect(document.documentElement.dataset.colorMode).toBe("dark"));
  await waitFor(() => expect(mocked.applyChart.mock.calls.filter(([options]) => options.layout).at(-1)?.[0].layout.background.color).not.toEqual(light));
  expect(mocked.createChart).toHaveBeenCalledTimes(1);
  expect(document.cookie).toContain("dex-theme=dark");
});
