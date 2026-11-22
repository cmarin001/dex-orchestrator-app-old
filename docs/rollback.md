# TradeKeel dashboard deployment and rollback

Use the operator SSH key for the one-command rollback.

```sh
ssh deploy@dex-orchestrator.best /opt/dex-orchestrator/deploy/cicd/rollback.sh --repo app
```

The dashboard uses its own `/opt/dex-orchestrator/data/.last-known-good.app`
record and the same droplet lock as the backend. The app never changes the
worker's deployment pause. In Auth0 mode the static app and BFF deploy as
a pair. Restarting the BFF ends its in-memory sessions.

Check `curl -fsS http://127.0.0.1:8081/healthz` on the droplet and read
`/opt/dex-orchestrator/data/deploy-log.jsonl`. With Auth0, verify
`curl -fsS http://127.0.0.1:8082/auth/me` and try a browser sign-in. If SSH
is unavailable, restore access from the droplet console, locate the prior
**deployed** SHA in Actions, and run the rollback command with
`--image <full-sha>` appended.

Use `https://dex-orchestrator.best` for the dashboard and API. Production
Auth0 callback is `https://dex-orchestrator.best/auth/callback`. Set the
repository variable `DASHBOARD_AUTH_MODE` to match the droplet's app
`VITE_DASHBOARD_AUTH_MODE`. The default is `legacy`. In Auth0 mode, publish
the static app and its separate BFF package at the same SHA. A change of
authentication mode needs the supervised Phase 5 Auth0 cutover since the
rollback pair must match the running Compose profile.

Before enabling the first deployment, create the GitHub **production**
environment, require an approving reviewer, restrict it to `main`, add
the dedicated SSH environment secrets, and install the public key using
the backend installer. Enable `PRODUCTION_DEPLOY_ENABLED` only after the
operator has completed paper bootstrap and verified the gate. See the
[shared droplet runbook](https://github.com/cmarin001/dex-orchestrator/blob/phase-5-cicd/docs/rollback.md).
