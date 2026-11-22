# Phase 5 staging and cutover

Run the BFF and dashboard on the same HTTPS origin as the droplet's Nginx
site. The orchestrator API stays on loopback. The public UI still offers
sample data without signing in. The BFF keeps OAuth tokens in a bounded
in-memory store. Use one BFF instance. A restart requires users to sign in
again and closes open streams. Normal logout invalidates the local session,
closes its streams and attempts to revoke the current refresh token in Auth0.

## Auth0 tenant setup

Use separate tenants for staging and production. For each tenant:

1. Create a **Regular Web Application** with token endpoint authentication
   set to **Basic** (client secret). Enable Authorization Code and Refresh
   exact HTTPS callback. Production is
   `https://dex-orchestrator.best/auth/callback`. Use the staging hostname
   for the staging tenant.
2. Register a custom API with the identifier matching `AUTH0_AUDIENCE`.
   Select RS256 and the **RFC 9068** access-token profile. Set the API
   token lifetime to 600 seconds. The API rejects access tokens whose
   lifetime exceeds 900 seconds.
3. Enable API RBAC and assign permissions to approved accounts only.
   A viewer gets `read:dashboard`. An operator also gets `write:dashboard`.
   Administrators also get `admin:dashboard`. The API enforces the actual
   granted OAuth scopes in the access token. Disable public sign-up for
   the dashboard connection.
4. Enable Allow Offline Access on the API and rotating refresh tokens on the
   application. Configure their absolute lifetime and idle timeout. Keep
   the **Refresh Token Revocation Deletes Grant** tenant setting disabled
   so revoking one browser session does not revoke another session's grant.
5. Enable **Customize MFA Factors using Actions**. Enable and enroll the
   operators' security keys or OTP before turning on the dashboard flow.
   Add the version 3 Post Login Actions in this order
   [require MFA](require-mfa.cjs), then [publish MFA](publish-mfa.cjs). Set
   the Action secrets `TRADEKEEL_CLIENT_ID` (both Actions) and
   `TRADEKEEL_MFA_CLAIM` (publish Action only).
   Use the same namespaced claim URL as `AUTH0_MFA_CLAIM` in the API.
   The first Action requests MFA for interactive logins. The second reads
   the completed MFA method's timestamp. On refresh, it uses only the
   timestamp associated with that refresh token and never the refresh time.
   Auth0 refresh token metadata availability depends on tenant entitlement.
   Without it, refreshed access tokens carry no MFA claim and elevated API
   requests receive `403 recent_mfa_required`. Signing in again performs MFA.
   Validate both interactive and refresh issuance on the actual staging
   tenant before treating this setup as cutover-ready.

See [Auth0's RFC 9068 profile notes](https://support.auth0.com/center/s/article/receive-the-client-id-claim-instead-of-the-azp-claim-in-an-auth0-access-token),
[Action timing for completed MFA](https://support.auth0.com/center/s/article/using-actions-mfa-authentication-method-is-missing-on-first-login)
and [refresh token metadata](https://support.auth0.com/center/s/article/questions-request-about-early-access-feature-refresh-token-metadata).

## Droplet deployment

1. On the orchestrator set `DASHBOARD_AUTH_MODE=dual` and set
   `AUTH0_ISSUER`, `AUTH0_AUDIENCE`, `AUTH0_CLIENT_ID`,
   `AUTH0_MFA_CLAIM`, and optionally `DASHBOARD_MFA_MAX_AGE_SEC` (default 300).
   Use a paper worker and a separate staging journal. Keep the existing
   shared-token secret during migration.
2. In this repo, copy the documented settings from [.env.example](../../.env.example)
   into a deployment `.env`. Set `VITE_DASHBOARD_AUTH_MODE=auth0`. Production uses
   `BFF_PUBLIC_ORIGIN=https://dex-orchestrator.best`.
   The browser build needs no issuer, secret, API token or tenant claims.
   Mount the Auth0 client secret from a mode-600 file owned by the UID
   used by the BFF service. Set `BFF_UID` / `BFF_GID` as needed (default
   1000:1000). Keep that file out of the Git checkout and image.
3. Build the dashboard and BFF images with
   `docker compose --profile auth0 build`. On the droplet, prebuilt
   images can be set with `DASHBOARD_IMAGE` and `BFF_IMAGE`. Start the
   containers with `docker compose --profile auth0 up -d --no-build --wait`.
   The Linux host-network BFF binds to `127.0.0.1:8082` so it can reach
   the existing loopback API at `127.0.0.1:8787`.
4. Inside the site's existing HTTPS server block use
   [dashboard-auth0.locations.conf](../nginx/dashboard-auth0.locations.conf)
   in place of the legacy dashboard location blocks. Keep the TLS setup,
   existing security headers and the `api` rate-limit zone. Run
   `sudo nginx -t && sudo systemctl reload nginx`. The worker and
   authenticated API routes preserve their paths and receipt format.
   The Auth0 snippet clears inbound Authorization headers and excludes
   login/callback requests from the access log.

## Staging acceptance

- Verify the HTTPS origin, sign-in redirect, reload, sign-out, wrong state,
  and callback replay. Check browser requests and storage for bearer tokens.
- Verify a viewer can read data but receives 403 on writes. Verify an
  operator can submit a paper command and see the same request ID and
  authenticated actor in its receipt and journal. Confirm the same ID
  cannot be reused by another actor.
- With an administrator, check that stale or absent MFA blocks live-arm
  and risk updates. Exercise arms only against a disposable **paper**
  worker. Verify disarm works with write permission even after MFA expires.
  Inspect a sanitized refresh issuance with the staging tenant tools to
  confirm the MFA timestamp stays the same and does not become the refresh
  time. Verify a live-view stream stops on logout.
- Inventory old machine clients, then switch the API to
  `DASHBOARD_AUTH_MODE=auth0` when REST legacy reads and HTTP MCP access
  can be retired. Stdio MCP remains read-only outside legacy. No live
  command should be tested until staging verifies real JWT and MFA claims.

Rollback requires an explicit decision. Switching JWT-only back to dual
restores legacy reads on loopback while keeping JWT authorization on
writes. Returning to legacy re-enables shared-token writes and MFA-free
legacy controls. Keep the worker in paper if returning to legacy.
