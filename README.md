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

1. Build this checkout at `/opt/dex-orchestrator-app` with `npm ci` and
   `npm run build`. Leave `VITE_DASHBOARD_API_URL` empty so the dashboard
   uses its own HTTPS origin.
2. Set `VITE_EXPECTED_CYCLE_INTERVAL_MS` in the dashboard build environment.
   Its default is `90000`. Match the backend worker's `LOOP_INTERVAL_MS`
   whenever it changes, then rebuild. The dashboard marks the last cycle
   stale after two expected intervals. API health is displayed separately.
3. Set the API's `DASHBOARD_ORIGIN` to the complete HTTPS dashboard origin
   including the scheme (for example `https://dex.example.com`). Set this
   in the droplet deployment configuration.
4. Incorporate [the dashboard locations](deploy/nginx/dashboard.locations.conf)
   in the existing Nginx TLS server block. Keep the existing TLS configuration,
   security headers, rate limits, and firewall policy. Ensure Nginx can read
   `dist`. The paths `/api/v1/`, `/trades`, and `/live-view/stream` proxy
   to loopback. Preserve Authorization on them and leave SSE buffering off.
   Check with `sudo nginx -t` before reloading Nginx. Existing deployments may
   have versioned API proxy options to carry over from their `/api/` block.

Visit the HTTPS hostname, check sample mode, then use **Connect to backend**
with the droplet origin and the dashboard bearer. Confirm the health indicator,
the cycle timestamp, and the current paper/live mode before submitting controls.

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
