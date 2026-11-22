# TradeKeel dashboard

A standalone Vite, React, and TypeScript control surface for the
[DEX orchestrator](https://github.com/cmarin001/dex-orchestrator). The first
visit opens a read-only sample dashboard. Connect to see and control a worker
with a dashboard bearer token. The app uses Atlaskit (ADS), English and
Spanish catalogs, and light, dark, and system themes.

**Simple** mode shows overview, read-only positions and risk, 20 recent
audit events, and entry pause/resume. **Expert** mode adds candidates,
performance, position details and exit requests, permanent rejections,
risk edits, audit filters, and live execution controls.

## Development

Use Node 20.19 or later. Start the backend dashboard API separately if you
want live data. Vite proxies the dashboard's REST routes to port 8787 in
development.

```sh
npm ci
npm run dev
npm run build
npm test
```

The bearer stays in memory and is sent in the Authorization header for REST
and the price stream. Reloading a connected tab opens Connect and requires the
bearer again. Only a credential-free screen flag stays in the browser tab.
Theme, language, and display mode are stored in preference cookies. Keep the
DASHBOARD_API_TOKEN, provider keys, and wallet keys out of `VITE_*` variables
and the app directory.

## Deploy to the DigitalOcean droplet

The dashboard image serves static files as a non-root user. Compose publishes
it only at `127.0.0.1:8081`. Host Nginx serves HTTPS and proxies the REST API,
trade history, and price stream to the existing backend on port 8787.

1. Check out the desired dashboard revision on the droplet. Download the
   matching `dashboard-image-<commit>` artifact from the GitHub **Actions →
   Dashboard image** run and extract the outer ZIP. Transfer
   `dashboard-image.tar.gz` to the droplet. From the checked-out dashboard
   repo, load and start the image:

   ```sh
   sudo docker image load -i dashboard-image.tar.gz
   sudo env DASHBOARD_IMAGE=dex-orchestrator-app:<commit> docker compose up -d --no-build --wait
   curl --fail http://127.0.0.1:8081/healthz
   ```

   Replace `<commit>` with the full SHA from the image tag printed by
   `docker image load`. To build locally instead, run
   `sudo docker compose up -d --build --wait`. Prefer loading a prebuilt
   image on a small droplet.
2. The image uses the page's HTTPS origin and defaults to a 90-second worker
   interval. If the worker's `LOOP_INTERVAL_MS` differs, build the image
   with the matching public `VITE_EXPECTED_CYCLE_INTERVAL_MS`. The browser
   marks the last cycle stale after two expected intervals.
3. Set the API's `DASHBOARD_ORIGIN` to the complete HTTPS dashboard origin,
   including the scheme. With an existing TLS server block, incorporate the
   [dashboard locations](deploy/nginx/dashboard.locations.conf). Preserve
   the TLS settings, response headers, existing `api` rate-limit zone,
   and firewall rules. Run `sudo nginx -t` before reloading Nginx.
4. Visit the HTTPS hostname. Check sample mode, then connect with the
   dashboard bearer token and verify API health and worker freshness.
   Verify that an unauthenticated API request returns HTTP 401.

To roll back the dashboard, rerun the Compose command with the previous
image tag. Keep the previous image available until verification is complete.

## Operating notes

- Controls use the [versioned REST contract](https://github.com/cmarin001/dex-orchestrator/blob/main/docs/dashboard-api.md).
  HTTP 202 means queued. The UI reuses the request ID and original body to
  read the worker's eventual result. Tracking survives page and mode switches
  in the connected tab and ends when the session is disconnected or reloaded.
  After an unconfirmed initial submission, use Check receipt to retry with the
  same ID. A queued receipt is checked automatically while the tab is visible.
- Positions use lightweight-charts for financial series and trade markers.
  The fetch stream sends the bearer in a header and supports reconnect.
  Recharts renders the equity, drawdown, and per-chain performance panels.
- Risk history comes from audit pages loaded on demand. Trade-derived
  statistics describe the trade pages loaded so far. Starting equity and
  average slippage display as unavailable when the REST contract omits them.
