// @vitest-environment node
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterEach, expect, it, vi } from "vitest";
import { createBff } from "../bff/server";
import type { Login, Oidc } from "../bff/oidc";
import type { Server } from "node:http";

const origin = new URL("https://dashboard.example");
const upstream = new URL("http://api.invalid");
const running: Server[] = [];
afterEach(async () => {
  await Promise.all(running.splice(0).map(server => new Promise<void>(resolve => {
    server.close(() => resolve());
    server.closeAllConnections();
  })));
});

async function fixture(expires = Date.now() + 60_000) {
  let login: Login | undefined;
  const oidc: Oidc = {
    authorize: vi.fn(async input => { login = input; return new URL("https://idp.example/authorize?state=" + input.state); }),
    exchange: vi.fn(async () => ({ identity: { sub: "auth0|test", name: "Operator" },
      tokens: { access: "server-access", refresh: "server-refresh", expires } })),
    refresh: vi.fn(async () => ({ access: "next-access", refresh: "next-refresh", expires: Date.now() + 60_000 })),
    revoke: vi.fn(async () => undefined),
  };
  let streamSignal: AbortSignal | null | undefined;
  const forward = vi.fn<typeof fetch>(async (target, init) => {
    if (String(target).endsWith("/live-view/stream")) {
      streamSignal = init?.signal;
      return new Response(new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode("event: live-view\ndata: []\n\n")); },
      }), { headers: { "Content-Type": "text/event-stream" } });
    }
    return Response.json({ state: "queued", request_id: "same-id" }, { status: init?.method === "POST" ? 202 : 200 });
  });
  const server = createBff({ origin, upstream, oidc, fetch: forward });
  running.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  const call = (path: string, init?: RequestInit) => fetch(base + path, { redirect: "manual", ...init });
  const loginFlow = async () => {
    const response = await call("/auth/login");
    expect(response.status).toBe(303);
    const cookie = response.headers.getSetCookie()[0]!;
    expect(cookie).toContain("Secure; HttpOnly; SameSite=Lax");
    expect(login?.verifier).not.toBe(login?.state);
    expect(login?.nonce).not.toBe(login?.state);
    return { cookie: cookie.split(";")[0]!, url: "/auth/callback?code=test-code&state=" + login?.state };
  };
  const signIn = async () => {
    const flow = await loginFlow();
    const response = await call(flow.url, { headers: { Cookie: flow.cookie } });
    expect(response.headers.get("Location")).toBe("/");
    const cookie = response.headers.getSetCookie().find(value => value.startsWith("__Host-dex-session="))!;
    expect(cookie).toContain("Secure; HttpOnly; SameSite=Lax");
    expect(cookie).not.toContain("server-access");
    expect(cookie).not.toContain("server-refresh");
    return { ...flow, session: cookie.split(";")[0]! };
  };
  return { call, loginFlow, signIn, oidc, forward, streamSignal: () => streamSignal };
}

it("binds and consumes callback state, forwards only allowlisted routes, and revokes on logout", async () => {
  const { call, loginFlow, signIn, oidc, forward, streamSignal } = await fixture();
  expect((await call("/api/v1/status")).status).toBe(401);
  const invalid = await loginFlow();
  expect((await call(invalid.url + "bad", { headers: { Cookie: invalid.cookie } })).headers.get("Location")).toContain("auth=failed");
  expect((await call(invalid.url, { headers: { Cookie: invalid.cookie } })).headers.get("Location")).toContain("auth=failed");
  expect(oidc.exchange).not.toHaveBeenCalled();
  const login = await signIn();
  const headers = { Cookie: login.session };
  expect((await call(login.url, { headers: { Cookie: login.cookie } })).headers.get("Location")).toContain("auth=failed");
  expect(await (await call("/auth/me", { headers })).json()).toEqual({ authenticated: true, name: "Operator" });
  expect((await call("/internal/health", { headers })).status).toBe(404);
  expect((await call("/api/v1/status?target=https://attacker.invalid", { headers })).status).toBe(200);
  expect(String(forward.mock.calls[0]?.[0])).toBe("http://api.invalid/api/v1/status?target=https://attacker.invalid");
  const body = JSON.stringify({ request_id: "same-id" });
  const write = "/api/v1/controls/pause";
  const authenticated = { ...headers, Origin: origin.origin, "Content-Type": "application/json", "X-Dex-CSRF": "1" };
  expect((await call(write, { method: "POST", body, headers })).status).toBe(403);
  expect((await call(write, { method: "POST", body, headers: { ...authenticated, Origin: "https://other.example" } })).status).toBe(403);
  expect((await call(write, { method: "POST", body, headers: { ...authenticated, Authorization: "Bearer forged" } })).status).toBe(202);
  expect(new Headers(forward.mock.calls[1]?.[1]?.headers).get("Authorization")).toBe("Bearer server-access");
  expect(new Headers(forward.mock.calls[1]?.[1]?.headers).has("Cookie")).toBe(false);
  expect(forward.mock.calls[1]?.[1]?.body).toBe(body);
  const live = await call("/live-view/stream", { headers });
  const reader = live.body!.getReader();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain("event: live-view");
  expect((await call("/auth/logout", { headers: authenticated, method: "POST" })).status).toBe(204);
  expect(streamSignal()?.aborted).toBe(true);
  await reader.cancel().catch(() => undefined);
  expect(oidc.revoke).toHaveBeenCalledWith("server-refresh");
  expect((await call("/api/v1/status", { headers })).status).toBe(401);
});

it("coalesces concurrent refreshes and keeps the rotated token server-side", async () => {
  const { call, signIn, oidc, forward } = await fixture(Date.now() + 100);
  const { session } = await signIn();
  const results = await Promise.all(["status", "positions"].map(resource =>
    call("/api/v1/" + resource, { headers: { Cookie: session } })));
  expect(results.map(result => result.status)).toEqual([200, 200]);
  expect(oidc.refresh).toHaveBeenCalledExactlyOnceWith("server-refresh");
  expect(forward.mock.calls.map(([, init]) => new Headers(init?.headers).get("Authorization")))
    .toEqual(["Bearer next-access", "Bearer next-access"]);
});
