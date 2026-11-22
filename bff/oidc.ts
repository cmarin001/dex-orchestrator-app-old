import * as oidc from "openid-client";

export type Login = { verifier: string; state: string; nonce: string };
export type Identity = { sub: string; name?: string };
export type Tokens = { access: string; refresh?: string; expires: number };

function tokens(result: oidc.TokenEndpointResponse): Tokens {
  const lifetime = result.expires_in;
  if (!result.access_token || result.token_type.toLowerCase() !== "bearer" ||
    typeof lifetime !== "number" || !Number.isFinite(lifetime) || lifetime <= 0) {
    throw new Error("invalid_token_response");
  }
  return {
    access: result.access_token,
    refresh: result.refresh_token,
    expires: Date.now() + lifetime * 1000,
  };
}

export type Oidc = {
  authorize(login: Login): Promise<URL>;
  exchange(url: URL, login: Login): Promise<{ identity: Identity; tokens: Tokens }>;
  refresh(token: string): Promise<Tokens>;
  revoke(token: string): Promise<void>;
};

export async function auth0(options: { issuer: URL; audience: string; clientId: string; secret: string; callback: string }): Promise<Oidc> {
  const { issuer, audience, clientId, secret, callback } = options;
  const config = await oidc.discovery(issuer, clientId, undefined, oidc.ClientSecretBasic(secret), {
    execute: [oidc.enableNonRepudiationChecks],
  });
  config.timeout = 5;
  if (config.serverMetadata().issuer !== issuer.href) throw new Error("unexpected_oidc_issuer");
  return {
    async authorize(login) {
      return oidc.buildAuthorizationUrl(config, {
        redirect_uri: callback,
        audience,
        scope: "openid profile offline_access read:dashboard write:dashboard admin:dashboard",
        response_mode: "query",
        code_challenge_method: "S256",
        code_challenge: await oidc.calculatePKCECodeChallenge(login.verifier),
        state: login.state,
        nonce: login.nonce,
        prompt: "login",
      });
    },
    async exchange(url, login) {
      const result = await oidc.authorizationCodeGrant(config, url, {
        pkceCodeVerifier: login.verifier,
        expectedState: login.state,
        expectedNonce: login.nonce,
        idTokenExpected: true,
      });
      const claims = result.claims();
      if (!claims?.sub) throw new Error("missing_identity");
      return {
        identity: { sub: claims.sub, name: typeof claims.name === "string" ? claims.name : undefined },
        tokens: tokens(result),
      };
    },
    async refresh(token) {
      return tokens(await oidc.refreshTokenGrant(config, token));
    },
    async revoke(token) {
      // Auth0 documents the OAuth revocation endpoint separately from OIDC discovery.
      const response = await fetch(new URL("oauth/revoke", issuer), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: secret, token }),
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("refresh_revocation_failed");
    },
  };
}
