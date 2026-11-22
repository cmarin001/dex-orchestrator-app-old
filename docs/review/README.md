# Phase 4B browser review

Each sheet shows the same routes in reading order. Overview, Positions,
Candidates, Performance, Audit, Risk, Controls, Settings, and Connect.
The Candidates and Performance URLs redirect to Overview in Simple mode
with a notice.

| Locale | Theme | Simple | Expert |
|---|---|---|---|
| English | Light | [Simple](simple-en-light.webp) | [Expert](expert-en-light.webp) |
| English | Dark | [Simple](simple-en-dark.webp) | [Expert](expert-en-dark.webp) |
| Spanish | Light | [Simple](simple-es-light.webp) | [Expert](expert-es-light.webp) |
| Spanish | Dark | [Simple](simple-es-dark.webp) | [Expert](expert-es-dark.webp) |

Positions was also checked at [1024 px](responsive-1024.webp) and
[390 px](responsive-390.webp) for horizontal overflow and initial keyboard focus.

Chromium and axe checked the 72 route, mode, locale and theme combinations
in sample mode, with zero critical or serious violations. The app's Vitest
suite uses mock HTTP responses for queueing, receipt retrieval and live-stream
reconnect. Production credentials and trading were outside this verification.
