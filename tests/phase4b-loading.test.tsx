import { screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { origin } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it.each([
  ["/positions", "/api/v1/positions", { items: [] }, "No open positions"],
  ["/candidates", "/api/v1/candidates", { scanner: [], watched: [] }, "No candidates to display"],
  ["/audit", "/api/v1/audit", { items: [], next_cursor: null }, "No audit events found"],
] as const)("renders a skeleton and then the empty state for %s", async (route, endpoint, fixture, label) => {
  server.use(http.get(origin + endpoint, async () => {
    await delay(200);
    return HttpResponse.json(fixture);
  }));
  renderApp(route, { connected: true, expert: true });
  await waitFor(() => expect(screen.getAllByRole("status", { name: "Loading…" }).length).toBeGreaterThan(0));
  expect(await screen.findByText(label)).toBeTruthy();
});
