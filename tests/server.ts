import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { audit, health, liveView, origin, position, risk, status, token, trades } from "./fixtures";

const reads = {
  health, status: status(), audit, positions: { items: [position] }, risk,
  candidates: { scanner: [], watched: [] }, equity: { latest: null, history: [] },
};
export const server = setupServer(
  ...Object.entries(reads).map(([path, payload]) => http.get(origin + "/api/v1/" + path, ({ request }) =>
    request.headers.get("Authorization") === "Bearer " + token ? HttpResponse.json(payload) : HttpResponse.json({}, { status: 401 }))),
  http.get(origin + "/trades", () => HttpResponse.json(trades)),
  http.get(origin + "/live-view/stream", () => new HttpResponse(
    "event: live-view\r\ndata: " + JSON.stringify([liveView]) + "\r\n\r\n", { headers: { "content-type": "text/event-stream" } },
  )),
);
