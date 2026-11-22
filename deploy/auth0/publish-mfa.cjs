// Install after require-mfa.cjs so authentication.methods reflects the completed challenge.
exports.onExecutePostLogin = async (event, api) => {
  const client = event.secrets.TRADEKEEL_CLIENT_ID;
  const claim = event.secrets.TRADEKEEL_MFA_CLAIM;
  if (!client || !claim || event.client.client_id !== client) return;
  const now = Math.floor(Date.now() / 1000);
  if (event.transaction?.protocol === "oauth2-refresh-token") {
    // Treat refresh as continuation of this grant. Missing metadata grants no elevation.
    const value = event.refresh_token?.metadata?.mfa_at;
    if (typeof value !== "string" || !/^\d{10}$/.test(value)) return;
    const original = Number(value);
    if (original > now) return;
    api.accessToken.setCustomClaim(claim, original);
    if (api.refreshToken?.setMetadata) api.refreshToken.setMetadata("mfa_at", value);
    return;
  }
  const evidence = (event.authentication?.methods ?? [])
    .filter(method => method.name === "mfa")
    .map(method => Math.floor(Date.parse(method.timestamp) / 1000))
    .filter(timestamp => Number.isSafeInteger(timestamp) && timestamp > 0 && timestamp <= now);
  if (evidence.length === 0) return;
  const timestamp = Math.max(...evidence);
  api.accessToken.setCustomClaim(claim, timestamp);
  if (api.refreshToken?.setMetadata) api.refreshToken.setMetadata("mfa_at", String(timestamp));
};
