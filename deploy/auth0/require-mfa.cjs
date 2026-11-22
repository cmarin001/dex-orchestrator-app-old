// Install before publish-mfa.cjs in the Auth0 Post Login Action flow.
exports.onExecutePostLogin = async (event, api) => {
  if (!event.secrets.TRADEKEEL_CLIENT_ID || event.client.client_id !== event.secrets.TRADEKEEL_CLIENT_ID ||
    event.transaction?.protocol === "oauth2-refresh-token") return;
  api.authentication.challengeWithAny([
    { type: "webauthn-roaming" },
    { type: "otp" },
  ]);
};
