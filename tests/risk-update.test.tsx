import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { origin, risk } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("confirms a schema-shaped risk revision, then displays a queued receipt", async () => {
  let posted: Record<string, unknown> | undefined;
  server.use(http.post(origin + "/api/v1/controls/risk", async ({ request }) => {
    posted = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ request_id: posted.request_id, state: "queued", actor: "operator",
      action: { type: "risk", config: posted.config }, gaps: [] }, { status: 202 });
  }));
  renderApp("/risk", { connected: true, expert: true });
  fireEvent.change(await screen.findByLabelText("Maximum slippage (bps)"), { target: { value: "125" } });
  fireEvent.click(screen.getByRole("button", { name: "Queue risk update" }));
  const modal = await screen.findByRole("dialog");
  expect(posted).toBeUndefined();
  fireEvent.click(within(modal).getByRole("button", { name: "Confirm request" }));
  expect(await screen.findByText("Queued — the worker applies this on its next cycle.")).toBeTruthy();
  expect(posted).toEqual({ request_id: expect.any(String), config: { ...risk.config, max_slippage_bps: 125 } });
  expect(screen.queryByText("Applied")).toBeNull();
});
