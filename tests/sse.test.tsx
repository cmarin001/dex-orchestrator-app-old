import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { liveView, origin, token } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

vi.mock("../src/features/positions/PriceChart", () => ({
  PriceChart: ({ view }: { view: typeof liveView }) => <output>{view.current_mark?.price}</output>,
}));
it("reads the authenticated live-view array, shows an EOF warning, and reconnects", async () => {
  let opened = 0;
  server.use(http.get(origin + "/live-view/stream", ({ request }) => {
    expect(request.headers.get("Authorization")).toBe("Bearer " + token);
    expect(new URL(request.url).search).toBe("");
    opened++;
    const frame = { ...liveView, current_mark: { ...liveView.current_mark, price: opened === 1 ? 1.25 : 1.50 } };
    return new HttpResponse("event: live-view\r\ndata: " + JSON.stringify([frame]) + "\r\n\r\n", {
      headers: { "content-type": "text/event-stream" },
    });
  }));
  renderApp("/positions", { expert: true, connected: true });
  fireEvent.click(await screen.findByRole("button", { name: /^Details for / }));
  expect(await screen.findByText("1.25", { selector: "output" })).toBeTruthy();
  expect(await screen.findByText("Live prices are disconnected. The last received marks remain visible.")).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: "Reconnect" }));
  expect(await screen.findByText("1.5", { selector: "output" })).toBeTruthy();
  expect(opened).toBe(2);
});
