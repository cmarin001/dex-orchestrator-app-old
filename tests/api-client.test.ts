import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { request, setSession } from "../src/api/client";
import { server } from "./server";
import { origin, receipt, token } from "./fixtures";

const body = { method: "POST", body: JSON.stringify({ request_id: "pause-1" }) } as const;
const url = "/api/v1/controls/pause";
it("returns a 202 queued receipt and authenticates with a header", async () => {
  setSession({ kind: "connected", origin, token });
  server.use(http.post(origin + url, ({ request }) => {
    expect(request.headers.get("Authorization")).toBe("Bearer " + token);
    expect(new URL(request.url).search).toBe("");
    return HttpResponse.json(receipt("pause-1"), { status: 202 });
  }));
  await expect(request(url, body)).resolves.toEqual(receipt("pause-1"));
});
it("uses the submitted request ID when a 409 has no ID", async () => {
  setSession({ kind: "connected", origin, token });
  server.use(http.post(origin + url, () => HttpResponse.json({ error: "request_id already used" }, { status: 409 })));
  await expect(request(url, body)).rejects.toMatchObject({ status: 409, requestId: "pause-1", code: "request_id already used" });
});
it("rejects a missing token before fetch", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  setSession({ kind: "connect" });
  await expect(request("/api/v1/status")).rejects.toMatchObject({ code: "missing_token" });
  expect(fetch).not.toHaveBeenCalled();
});
it("blocks an unexpected destination before sending the bearer", async () => {
  setSession({ kind: "connected", origin, token });
  const fetch = vi.spyOn(globalThis, "fetch");
  await expect(request("//foreign.example/api/v1/status")).rejects.toMatchObject({ code: "invalid_origin" });
  expect(fetch).not.toHaveBeenCalled();
});
it("serves sample data without a network connection and refuses sample writes", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  await expect(request("/api/v1/status")).resolves.toMatchObject({ execution_mode: "paper" });
  await expect(request(url, body)).rejects.toMatchObject({ code: "sample_read_only" });
  expect(fetch).not.toHaveBeenCalled();
});
