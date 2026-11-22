import { createRequire } from "node:module";
import { expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const requireMfa = require("../deploy/auth0/require-mfa.cjs").onExecutePostLogin;
const publishMfa = require("../deploy/auth0/publish-mfa.cjs").onExecutePostLogin;
const claim = "https://tradekeel.example/claims/mfa_at";
const settings = { client: { client_id: "app" }, secrets: { TRADEKEEL_CLIENT_ID: "app", TRADEKEEL_MFA_CLAIM: claim } };

it("challenges an interactive login and preserves the verified challenge time on refresh", async () => {
  const challengeWithAny = vi.fn();
  const setCustomClaim = vi.fn();
  const setMetadata = vi.fn();
  const api = { authentication: { challengeWithAny }, accessToken: { setCustomClaim }, refreshToken: { setMetadata } };
  const completed = Math.floor(Date.now() / 1000) - 20;
  await requireMfa(settings, api);
  expect(challengeWithAny).toHaveBeenCalledTimes(1);
  await publishMfa({ ...settings, authentication: { methods: [
    { name: "pwd", timestamp: new Date().toISOString() },
    { name: "mfa", timestamp: new Date(completed * 1000).toISOString() },
  ] } }, api);
  expect(setCustomClaim).toHaveBeenLastCalledWith(claim, completed);
  expect(setMetadata).toHaveBeenLastCalledWith("mfa_at", String(completed));
  const refresh = { ...settings, transaction: { protocol: "oauth2-refresh-token" } };
  await requireMfa(refresh, api);
  expect(challengeWithAny).toHaveBeenCalledTimes(1);
  await publishMfa(refresh, api);
  expect(setCustomClaim).toHaveBeenCalledTimes(1);
  await publishMfa({ ...refresh, refresh_token: { metadata: { mfa_at: String(completed) } } }, api);
  expect(setCustomClaim).toHaveBeenCalledTimes(2);
  expect(setCustomClaim).toHaveBeenLastCalledWith(claim, completed);
});
