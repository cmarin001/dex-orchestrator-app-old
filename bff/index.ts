import { readFile } from "node:fs/promises";
import { auth0 } from "./oidc.js";
import { createBff } from "./server.js";

function accountUrl(name: string, protocols: string[]) {
  const value = new URL(process.env[name] ?? "");
  if (!protocols.includes(value.protocol) || value.href !== value.origin + "/") {
    throw new Error(name + " must be a bare origin");
  }
  return value;
}

try {
  const origin = accountUrl("BFF_PUBLIC_ORIGIN", ["https:"]);
  const upstream = accountUrl("BFF_API_ORIGIN", ["http:", "https:"]);
  const issuer = accountUrl("AUTH0_ISSUER", ["https:"]);
  const audience = process.env.AUTH0_AUDIENCE;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const secretFile = process.env.AUTH0_CLIENT_SECRET_FILE;
  if (!audience || !clientId || !secretFile) throw new Error("Missing Auth0 settings");
  const secret = (await readFile(secretFile, "utf8")).trim();
  if (!secret) throw new Error("Empty Auth0 client secret file");
  const oidc = await auth0({ issuer, audience, clientId, secret, callback: new URL("/auth/callback", origin).href });
  const server = createBff({ origin, upstream, oidc });
  server.on("error", () => { console.error("bff.listen_failed"); process.exitCode = 1; });
  server.listen(Number(process.env.BFF_PORT ?? 8082), process.env.BFF_HOST ?? "127.0.0.1", () => console.log("bff.started"));
} catch {
  console.error("bff.startup_failed: verify Auth0 discovery, HTTPS origins, and the mounted client secret");
  process.exitCode = 1;
}
