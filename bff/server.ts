import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Identity, Login, Oidc, Tokens } from "./oidc.js";

const sessionCookie = "__Host-dex-session";
const loginCookie = "__Host-dex-login";
const loginMs = 5 * 60 * 1000;
const sessionMs = 8 * 60 * 60 * 1000;
const maxSessions = 256;
const maxLogins = 512;
const id = () => randomBytes(32).toString("base64url");
type Session = {
  identity: Identity;
  tokens: Tokens;
  expires: number;
  abort: AbortController;
  refreshing?: Promise<void>;
};

const reads = /^\/api\/v1\/(health|status|positions|wallets|equity|audit|candidates|risk|mode|chain|budget|signals|providers(?:\/[\w-]{1,100})?|strategies(?:\/[\w-]{1,100})?)$/;
const writes = /^\/api\/v1\/(controls\/(pause|resume|risk|exit|reject|live-execution|chain|(?:approve|reject)\/[\w-]{1,100})|mode|chain|budget|(?:providers|strategies)\/[\w-]{1,100}\/(?:enable|disable)|strategies\/(?:reload|[\w-]{1,100}\/params))$/;

function allowed(method: string | undefined, path: string) {
  return method === "GET" ? reads.test(path) || path === "/trades" || path === "/live-view/stream"
    : method === "POST" && writes.test(path);
}

function cookie(req: IncomingMessage, name: string) {
  const values = (req.headers.cookie ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(name + "="));
  const value = values.length === 1 ? values[0]!.slice(name.length + 1) : "";
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
}

function setCookie(name: string, value: string, age: number) {
  return name + "=" + value + "; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=" + age;
}

function json(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function redirect(res: ServerResponse, destination: string) {
  res.writeHead(303, { Location: destination }).end();
}

class TooLarge extends Error {}

async function jsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false }) as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > 16_384) throw new TooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createBff(options: { origin: URL; upstream: URL; oidc: Oidc; fetch?: typeof fetch }) {
  const { origin, upstream, oidc } = options;
  const fetchUpstream = options.fetch ?? fetch;
  const pending = new Map<string, { login: Login; expires: number; prior: string }>();
  const sessions = new Map<string, Session>();

  function endSession(key: string) {
    const session = sessions.get(key);
    if (!session) return;
    sessions.delete(key);
    session.abort.abort();
    if (session.tokens.refresh && !session.refreshing) {
      void oidc.revoke(session.tokens.refresh).catch(() => console.warn("bff.refresh_revocation_failed"));
    }
  }

  function prune() {
    const now = Date.now();
    for (const [key, request] of pending) if (now >= request.expires) pending.delete(key);
    for (const [key, session] of sessions) if (now >= session.expires) endSession(key);
  }

  async function accessToken(session: Session) {
    if (session.tokens.expires > Date.now() + 15_000) return session.tokens.access;
    session.refreshing ??= (async () => {
      const current = session.tokens.refresh;
      if (!current) throw new Error("missing_refresh_token");
      const next = await oidc.refresh(current);
      if (session.abort.signal.aborted) {
        await oidc.revoke(next.refresh ?? current);
        throw new Error("session_revoked");
      }
      session.tokens = { ...next, refresh: next.refresh ?? current };
    })().finally(() => { session.refreshing = undefined; });
    await session.refreshing;
    return session.tokens.access;
  }

  const server = createServer(async (req, res) => {
    const started = performance.now();
    let route = "other";
    let reason = "request_completed";
    let requestId: string | undefined;
    const report = (finished: boolean) => {
      if (route !== "/api/v1/wallets") return;
      const status = finished ? res.statusCode : undefined;
      const failed = !finished || (status ?? 0) >= 400;
      const level = failed ? "warn" : "info";
      console[level](JSON.stringify({
        at: new Date().toISOString(), level, event: "wallet.proxy", component: "auth_bff",
        route, method: req.method === "GET" ? "GET" : "OTHER", status, request_id: requestId,
        duration_ms: Math.round(performance.now() - started),
        outcome: failed ? "failed" : "ok", reason: finished ? reason : "response_interrupted",
      }));
    };
    res.once("finish", () => report(true));
    res.once("close", () => { if (!res.writableFinished) report(false); });
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    try {
      const raw = req.url ?? "";
      if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return json(res, 400, { error: "invalid_path" });
      const url = new URL(raw, origin);
      const path = url.pathname;
      if (path === "/api/v1/wallets") route = path;
      const method = req.method;
      if (url.origin !== origin.origin || raw.split("?")[0] !== path) return json(res, 400, { error: "invalid_path" });
      if (path === "/healthz" && method === "GET") return json(res, 200, { status: "ok" });
      if (method === "POST" && (req.headers.origin !== origin.origin || req.headers["x-dex-csrf"] !== "1")) {
        reason = "csrf_check_failed";
        return json(res, 403, { error: "invalid_request_origin" });
      }
      prune();
      const sessionKey = cookie(req, sessionCookie);
      const session = sessions.get(sessionKey);
      if (path === "/auth/login" && method === "GET") {
        const site = req.headers["sec-fetch-site"];
        if (site && site !== "same-origin" && site !== "none") return json(res, 403, { error: "invalid_request_origin" });
        pending.delete(cookie(req, loginCookie));
        if (pending.size >= maxLogins) return json(res, 429, { error: "too_many_login_requests" });
        const key = id();
        const login = { verifier: id(), state: id(), nonce: id() };
        pending.set(key, { login, expires: Date.now() + loginMs, prior: sessionKey });
        try {
          const target = await oidc.authorize(login);
          res.setHeader("Set-Cookie", setCookie(loginCookie, key, loginMs / 1000));
          return redirect(res, target.href);
        } catch (error) {
          pending.delete(key);
          throw error;
        }
      }
      if (path === "/auth/callback" && method === "GET") {
        const key = cookie(req, loginCookie);
        const transaction = pending.get(key);
        pending.delete(key);
        res.setHeader("Set-Cookie", setCookie(loginCookie, "", 0));
        if (!transaction || transaction.prior !== sessionKey || url.searchParams.getAll("state").length !== 1 ||
          url.searchParams.get("state") !== transaction.login.state || url.searchParams.getAll("code").length !== 1 ||
          !url.searchParams.get("code") || url.searchParams.has("error")) return redirect(res, "/connect?auth=failed");
        try {
          const previous = sessions.get(sessionKey);
          const result = await oidc.exchange(url, transaction.login);
          if ((previous && previous.abort.signal.aborted) || (sessions.size >= maxSessions && !sessions.has(sessionKey))) {
            if (result.tokens.refresh) void oidc.revoke(result.tokens.refresh).catch(() => console.warn("bff.refresh_revocation_failed"));
            return redirect(res, "/connect?auth=failed");
          }
          endSession(sessionKey);
          const key = id();
          sessions.set(key, { ...result, expires: Date.now() + sessionMs, abort: new AbortController() });
          res.setHeader("Set-Cookie", [setCookie(loginCookie, "", 0), setCookie(sessionCookie, key, sessionMs / 1000)]);
          return redirect(res, "/");
        } catch {
          console.warn("bff.login_exchange_failed");
          return redirect(res, "/connect?auth=failed");
        }
      }
      if (path === "/auth/logout" && method === "POST") {
        pending.delete(cookie(req, loginCookie));
        endSession(sessionKey);
        res.setHeader("Set-Cookie", [setCookie(loginCookie, "", 0), setCookie(sessionCookie, "", 0)]);
        return res.writeHead(204).end();
      }
      if (path === "/auth/me" && method === "GET") {
        return json(res, 200, session ? { authenticated: true, name: session.identity.name } : { authenticated: false });
      }
      if (!allowed(method, path)) {
        reason = "route_or_method_not_allowlisted";
        return json(res, 404, { error: "not_found" });
      }
      if (!session) {
        reason = "session_missing_or_expired";
        return json(res, 401, { error: "unauthorized" });
      }
      const headers = new Headers();
      let body: string | undefined;
      if (method === "POST") {
        if (req.headers["content-type"]?.split(";")[0]?.trim() !== "application/json") {
          return json(res, 415, { error: "json_required" });
        }
        headers.set("Content-Type", "application/json");
        body = await jsonBody(req);
      }
      let token: string;
      try { token = await accessToken(session); }
      catch {
        reason = "access_token_unavailable";
        endSession(sessionKey);
        return json(res, 401, { error: "unauthorized" });
      }
      if (session.abort.signal.aborted) return json(res, 401, { error: "unauthorized" });
      headers.set("Authorization", "Bearer " + token);
      reason = "forwarded_with_server_access_token";
      const target = new URL(path + url.search, upstream);
      const stream = path === "/live-view/stream";
      const cutoff = Math.max(0, Math.min(stream ? 60_000 : 15_000, session.expires - Date.now(), session.tokens.expires - Date.now()));
      const disconnected = new AbortController();
      const close = () => disconnected.abort();
      res.once("close", close);
      try {
        const signal = AbortSignal.any([session.abort.signal, disconnected.signal, AbortSignal.timeout(cutoff)]);
        const result = await fetchUpstream(target, { method, headers, body, redirect: "error", signal });
        const upstreamId = result.headers.get("X-Request-Id");
        if (upstreamId && /^[a-f0-9-]{36}$/i.test(upstreamId)) requestId = upstreamId;
        if (result.status === 401) {
          reason = "upstream_authentication_rejected";
          await result.body?.cancel();
          endSession(sessionKey);
          res.setHeader("Set-Cookie", setCookie(sessionCookie, "", 0));
          return json(res, 401, { error: "unauthorized" });
        }
        const type = result.headers.get("Content-Type")?.split(";")[0];
        if (type !== "application/json" && !(stream && result.ok && type === "text/event-stream")) {
          reason = "unexpected_upstream_content_type";
          await result.body?.cancel();
          return json(res, 502, { error: "unexpected_upstream_response" });
        }
        res.setHeader("Content-Type", type);
        if (upstreamId) res.setHeader("X-Request-Id", upstreamId);
        if (!result.ok) reason = "upstream_request_rejected";
        if (stream && result.ok) res.setHeader("X-Accel-Buffering", "no");
        res.writeHead(result.status);
        if (!result.body) return res.end();
        await pipeline(Readable.fromWeb(result.body as Parameters<typeof Readable.fromWeb>[0]), res, { signal });
      } finally { res.off("close", close); }
    } catch (error) {
      reason = "proxy_request_failed";
      if (res.destroyed) return;
      if (res.headersSent) return res.destroy();
      if (error instanceof TooLarge) {
        res.setHeader("Connection", "close");
        return json(res, 413, { error: "request_too_large" });
      }
      console.warn("bff.request_failed");
      return json(res, 502, { error: "dashboard_unavailable" });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  const sweep = setInterval(prune, 30_000);
  sweep.unref();
  server.on("close", () => { clearInterval(sweep); for (const key of sessions.keys()) endSession(key); });
  return server;
}
