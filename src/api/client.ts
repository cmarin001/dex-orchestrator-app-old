import { sampleResponse } from "./sample";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message = code, readonly requestId?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Session = { kind: "sample" } | { kind: "connect" } | { kind: "connected"; origin: string; token: string };
const connectionView = "dex-connection-view";
let session: Session = { kind: sessionStorage.getItem(connectionView) ? "connect" : "sample" };

export const getSession = () => session;
export const setSession = (value: Session) => {
  session = value;
  if (value.kind === "sample") sessionStorage.removeItem(connectionView);
  else sessionStorage.setItem(connectionView, "connect");
};
export const configuredOrigin = () => import.meta.env.VITE_DASHBOARD_API_URL || window.location.origin;

export function validateOrigin(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); }
  catch { throw new ApiError(0, "invalid_origin"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new ApiError(0, "invalid_origin");
  }
  return url.origin;
}

async function send(path: string, init: RequestInit = {}, credentials = session) {
  if (credentials.kind !== "connected" || !credentials.token) throw new ApiError(0, "missing_token");
  const url = new URL(path, credentials.origin);
  if (url.origin !== credentials.origin || !path.startsWith("/")) throw new ApiError(0, "invalid_origin");
  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + credentials.token);
  if (init.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try { response = await fetch(url, { ...init, headers, redirect: "error", cache: "no-store", credentials: "omit" }); }
  catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, "network");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    let submittedId: string | undefined;
    if (response.status === 409 && typeof init.body === "string") {
      try { submittedId = JSON.parse(init.body)?.request_id; } catch { /* The body may not be JSON. */ }
    }
    const message = typeof body?.error === "string" ? body.error : undefined;
    throw new ApiError(response.status, message ?? "http_error", message,
      body?.request_id ?? submittedId ?? response.headers.get("x-request-id") ?? undefined);
  }
  return response;
}

export async function verifyConnection(origin: string, token: string, signal?: AbortSignal) {
  const credentials: Session = { kind: "connected", origin: validateOrigin(origin), token: token.trim() };
  const response = await send("/api/v1/health", { signal }, credentials);
  const body = await response.json().catch(() => null);
  if (body?.status !== "ok" || body?.journal_readable !== true) throw new ApiError(0, "invalid_response");
  return credentials;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (session.kind === "sample") {
    if (init?.method && init.method !== "GET") throw new ApiError(0, "sample_read_only");
    return sampleResponse(path) as T;
  }
  const response = await send(path, init);
  return response.json().catch(() => { throw new ApiError(0, "invalid_response_data"); }) as Promise<T>;
}

export async function stream(signal: AbortSignal, receive: (payload: string) => void) {
  if (session.kind === "sample") {
    receive(JSON.stringify(sampleResponse("/live-view")));
    if (!signal.aborted) await new Promise<void>(resolve => signal.addEventListener("abort", () => resolve(), { once: true }));
    return;
  }
  const response = await send("/live-view/stream", { signal });
  if (!response.body || !response.headers.get("content-type")?.startsWith("text/event-stream")) {
    throw new ApiError(0, "invalid_stream");
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const packet = await reader.read();
      if (packet.done) break;
      buffer += packet.value;
      for (let boundary = /\r?\n\r?\n/.exec(buffer); boundary; boundary = /\r?\n\r?\n/.exec(buffer)) {
        const lines = buffer.slice(0, boundary.index).split(/\r?\n/);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const name = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
        if (name === "unavailable") throw new ApiError(0, "invalid_stream");
        if (name !== "live-view") continue;
        const chunks = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, ""));
        if (chunks.length) receive(chunks.join("\n"));
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
