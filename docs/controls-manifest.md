# Phase 4B controls manifest

S = Simple, E = Expert. Session, unavailable data, authorization and pending
requests can disable controls. All actions that change backend state require a
review dialog and use the existing idempotent queued-receipt flow. Sample mode
stays read-only.

| Control | Phase 4 location | Phase 4B location | Mode | Confirmation | Receipt |
|---|---|---|---|---|---|
| Brand/home, skip links, expand/collapse navigation, page links | Shell | Shell | S, E; expert routes gated | No | No |
| Open/close display preferences | Top navigation | Top navigation | S, E | No | No |
| Toggle display mode | Preferences, Settings | Preferences, Settings | S, E | No | No |
| Select language | Preferences, Settings | Preferences, Settings | S, E | No | No |
| Select theme | Preferences, Settings | Preferences, Settings | S, E | No | No |
| Enter backend origin and bearer, connect, return to sample | Connect | Connect | S, E | No | No |
| Connect/disconnect | Settings, top navigation (connect) | Settings and Connect | S, E | No | No |
| Edit connected origin | Connect flow | Settings → Connect | E | Yes | No |
| Filter positions by token and chain, sort columns | Positions | Positions | E | No | No |
| Open/close position details | Positions | Positions | S, E | No | No |
| Reconnect live prices, show position audit, load older audit | Position inspector | Position inspector | E | No | No |
| Request exit | Positions row | Positions row and inspector | E | Yes | Yes |
| Filter candidates by chain | Candidates | Candidates | E | No | No |
| Reject token permanently | Scanner and watchlist rows | Candidates rows and inspector | E | Yes | Yes |
| Switch trade history/per-chain views, sort trades, load older trades | Performance | Performance | E | No | No |
| Audit since, page size, apply filters, reset receipt filter, load older events | Audit | Audit | E, plus receipt pagination in S | No | No |
| Sort audit columns | Audit | Audit ordering controls | E | No | No |
| Expand event, copy request ID | Audit | Audit event | E | No | No |
| Review risk revisions, compare/close drawer, load older events | Risk | Risk | E | No | No |
| Edit numeric limits and ladder, add/remove rung, submit risk revision | Risk | Risk | E | Yes, with preview | Yes |
| Pause, resume | Controls | Controls | S, E | Yes | Yes |
| Arm, disarm live execution | Controls | Controls | E | Arm typed; disarm modal | Yes |
| Check receipt, dismiss, open audit event | Shared command receipts | Shared command receipts | Same as originating action | No | Existing |
| Cancel/confirm command, close overlays, retry failed reads | Shared components | Shared components | S, E | As applicable | As applicable |
| Change table density | Approved presentation option | Settings | E | No | No |
| Open/close candidate evidence, load older evidence | Approved candidate inspector | Candidates | E | No | No |
| Filter loaded audit events by agent, chain and severity | Approved audit layout | Audit | E | No | No |

## Existing backend operations approved for exposure

These operations already exist on the backend under `/api/v1`. They appear
on Controls in Expert mode, behind confirmation. The live and paper safeguards
remain owned by the backend. Phase 3 receipts omit the action payload.

| Control | Existing write path | Read source |
|---|---|---|
| Operating mode | `/mode` | `/mode` |
| Chain routing | `/chain` (alias `/controls/chain`) | `/chain` |
| Provider budget | `/budget` | `/budget` |
| Enable/disable a configured provider | `/providers/:id/enable`, `/providers/:id/disable` | `/providers` |
| Enable/disable a registered strategy | `/strategies/:id/enable`, `/strategies/:id/disable` | `/strategies` |
| Edit registered strategy parameters | `/strategies/:id/params` | `/strategies` |
| Reload strategy registry | `/strategies/reload` | `/strategies` |
| Approve/reject a recorded signal | `/controls/approve/:id`, `/controls/reject/:id` | `/signals` |

The legacy `/risk-config` write duplicates the risk revision capability;
the dashboard continues to send revisions to `/controls/risk`.

## Out of scope

Command palette, exports, manual order forms, new endpoints, missing token
symbols, starting-equity baseline, slippage estimates, and generated series.
