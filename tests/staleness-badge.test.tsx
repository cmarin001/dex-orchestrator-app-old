import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { expectedInterval } from "../src/features/overview/Overview";
import { origin, status } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("shows a stale last-cycle warning even when the API health check passes", async () => {
  const last = new Date(Date.now() - 2 * expectedInterval - 20_000).toISOString();
  server.use(http.get(origin + "/api/v1/status", () => HttpResponse.json(status({ last_cycle_at: last }))));
  renderApp("/", { connected: true });
  expect(await screen.findByText(/Last cycle: /)).toBeTruthy();
  expect(screen.getByTestId("cycle-stale")).toBeTruthy();
  expect(await screen.findAllByText("API reachable")).not.toHaveLength(0);
});
