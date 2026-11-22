import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { origin, token } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("uses the existing mode endpoint and preserves Phase 3 receipt semantics", async () => {
  const requests: unknown[] = [];
  const config = { mode: "strategies", strategyConsensus: "majority" };
  server.use(
    http.get(origin + "/api/v1/mode", () => HttpResponse.json(config)),
    http.post(origin + "/api/v1/mode", async ({ request }) => {
      expect(request.headers.get("Authorization")).toBe("Bearer " + token);
      const body = await request.json() as { request_id: string };
      requests.push(body);
      return HttpResponse.json({
        request_id: body.request_id, actor: "operator", state: requests.length === 1 ? "queued" : "applied", gaps: [],
      }, { status: requests.length === 1 ? 202 : 200 });
    }),
  );
  renderApp("/controls", { expert: true, connected: true });
  fireEvent.click(await screen.findByRole("button", { name: "Operating mode" }));
  fireEvent.change(await screen.findByLabelText("Configuration JSON"), { target: { value: JSON.stringify({ ...config, mode: "human" }) } });
  fireEvent.change(screen.getByLabelText("Reason for change"), { target: { value: "Review signals" } });
  fireEvent.click(screen.getByRole("button", { name: "Review update" }));
  expect(requests).toHaveLength(0);
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm request" }));
  expect(await screen.findByText("Queued")).toBeTruthy();
  expect(requests[0]).toMatchObject({ reason: "Review signals", config: { ...config, mode: "human" } });
  fireEvent.click(screen.getByRole("button", { name: "Check receipt" }));
  expect(await screen.findByText("Applied")).toBeTruthy();
  expect(requests[1]).toEqual(requests[0]);
});
