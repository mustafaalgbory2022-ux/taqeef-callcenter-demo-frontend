# Integration with the local Taqeef system

## Provisional dependency versions (Phase 0)

All versions are pinned exactly in `package.json` and are **provisional** until confirmed
against the local ORD-0035 frontend. Code avoids React-19-only APIs so React 18 remains viable.

Runtime: react 19.3.1, react-dom 19.3.1, zod 4.6.7.
Deferred until versions are confirmed: react-router, @tanstack/react-query, i18next +
react-i18next, msw, @fontsource/ibm-plex-sans-arabic.

## Questions for the local project

1. React, TypeScript, Vite/bundler and Node versions used by ORD-0035.
2. Router (React Router version? other?), data-fetching and i18n libraries already in use.
3. Styling approach (CSS Modules, Tailwind, UI kit?) — affects how tokens are delivered.
4. Delivery target: separate app served by FastAPI `StaticFiles`, or modules merged into
   ORD-0035?
5. FastAPI OpenAPI spec (`/openapi.json`) or contract document; JSON casing; time units.
6. Auth model the host provides (cookie session, bearer token) — this repo ships none.
7. Official brand tokens, fonts (with licences) and logo files; dark-mode logo variant.
8. Arabic numerals: Western (0–9) or Arabic-Indic (٠–٩)?
9. Scorecard: default criteria, weights, pass threshold; who may edit; versioning rules.
10. Audio formats produced by the pipeline and whether Range requests are supported.

11. Agent data: does the backend already store agents/queues? Field names for Yeastar
    extension vs agent number; can an agent have several extensions?
12. How calls are linked to agents (extension in recording metadata, CDR join, manual).
13. Yeastar PBX metadata (CDR/queue stats) availability, fields for missed / abandoned / SLA,
    and the SLA definition (e.g. answered within N seconds).
14. Who may add/disable agents in the UI; is agent management done in the backend instead?
15. Minimum evaluated calls before per-agent results are treated as indicative
    (provisional default 10).

## Handoff plan

The local team pulls this branch (or the built `dist/`), sets `VITE_API_MODE=fastapi` and
`VITE_API_BASE_URL`, and resolves any contract differences inside `src/api/` only.
