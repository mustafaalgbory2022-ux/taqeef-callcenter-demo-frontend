# Handoff package — Local ORD-0035 `demo/frontend`

For Local Claude / the ORD-0035 team. This standalone repository does not modify the local
application. Integration is a reviewed copy into a local feature branch — never a merge
into `main`.

## 1. Source

| Item                    | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| Repository              | `mustafaalgbory2022-ux/taqeef-callcenter-demo-frontend`                     |
| Branch                  | `claude/affectionate-ritchie-cr40s7`                                        |
| Implementation commit   | `705799c16f8e29013cf84a6bb10cf54f0880104e`                                  |
| Handoff document commit | the commit that adds this file revision (tip of the branch)                 |
| Previous milestone      | `9ad1467` (10 modules); this revision adds the approved scoring corrections |

```bash
git fetch origin claude/affectionate-ritchie-cr40s7
git checkout 705799c16f8e29013cf84a6bb10cf54f0880104e   # or the branch tip for these docs
```

## 2. File structure

```
index.html                  Single external module script; no inline code (CSP-safe)
vite.config.ts              Build, dev proxy, preview CSP header, Vitest config
tsconfig*.json              Strict TypeScript
eslint.config.js            Lint rules (incl. RTL logical-properties rule)
playwright.config.ts        E2E: desktop + mobile against the built app under CSP
public/brand/               Neutral logo placeholder (official assets come from /api/branding)
src/
  main.tsx                  Entry
  app/                      Providers, router (lazy pages), shell + navigation, session gate
  features/
    dashboard/              Overall + per-agent performance (model/aggregate.ts)
    agents/                 Profiles, Yeastar extensions, queues, change history
    calls/                  Upload, audio player, synced transcript, call review
    scorecards/             Editable scorecard: points, partial credit, minimum, penalty rule, versions
    evaluations/            Evidence, re-scoring, history, previous-vs-new comparison
    settings/               Language/theme, reporting rules, demo data, planned admin areas
  shared/
    api/                    ApiClient, transport, endpoints, errors, query cache
      wire/                 snake_case decoders/mappers — ALL integration assumptions live here
      mock/                 Simulated backend + synthetic fixtures (mock mode only)
    ui/ hooks/ types/ utils/ theme/ branding/ i18n/
tests/e2e/                  Playwright specs (session, dashboard, calls, admin, a11y)
docs/                       Architecture, API adapter, requirements, integration, screenshots
```

Feature folders follow `pages/ components/ hooks/ model/ index.ts`; see
`docs/architecture.md` for module boundaries and how each feature is maintained.

## 3. Dependencies versus the confirmed ORD-0035 stack

Runtime and build — **identical to the confirmed versions** (pinned exactly):

| Package                            | This repo           | ORD-0035   |
| ---------------------------------- | ------------------- | ---------- |
| react, react-dom                   | 19.3.0              | 19.3.0     |
| react-router                       | 8.4.0               | 8.4.0      |
| typescript                         | 6.0.3               | 6.0.3      |
| vite                               | 8.3.2               | 8.3.2      |
| @vitejs/plugin-react               | 6.1.1               | 6.1.1      |
| vitest                             | 5.0.3               | 5.0.3      |
| eslint                             | 10.12.0             | 10.12.0    |
| @playwright/test / playwright-core | 1.63.0              | 1.63.0     |
| Node                               | 24 (tested 24.22.1) | ≥24.15 <25 |

**Differences — dev-only tooling not in the confirmed list** (not needed for `vite build`;
reconcile or omit when adopting the test suite):

| Package                                                                                        | Version                               | License | Used for               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- | ------- | ---------------------- |
| jsdom                                                                                          | 30.1.3                                | MIT     | Vitest DOM environment |
| @testing-library/react, /dom, /jest-dom, /user-event                                           | 16.3.3, 10.4.2, 7.0.1, 14.6.8         | MIT     | component tests        |
| @axe-core/playwright                                                                           | 4.14.0                                | MPL-2.0 | accessibility checks   |
| @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | 10.0.1, 8.72.1, 7.1.1, 0.5.7, 17.14.0 | MIT     | lint rules             |
| prettier                                                                                       | 3.9.10                                | MIT     | formatting             |
| @types/react, @types/react-dom, @types/node                                                    | 19.3.0, 19.3.0, 24.19.2               | MIT     | types                  |

`package.json` also has an npm `overrides` entry: `minimatch` 11.0.3, a patched transitive
dependency of the lint tooling.

Not used, by design: Zod, TanStack Query, i18next, MSW, UI kits, chart libraries, web fonts.

**Security recommendation (not applied here):** `npm audit` reports dev-server advisories for
Vite 8.3.0–8.3.2 (fixed in 8.3.5). They affect the development server only, not the built
static files. This repository intentionally keeps the confirmed 8.3.2 and its lockfile; the
local project should decide on 8.3.2 → 8.3.5 for both projects together.

## 4. Build and verification commands (Node 24)

```bash
npm ci                               # install exactly from package-lock.json
npm run check                        # typecheck + lint + format check + unit tests (66)
npm run build                        # mock-mode build → dist/
VITE_API_MODE=live npm run build     # live build for FastAPI (same-origin /api)
npm run test:e2e                     # Playwright + axe (40 tests) against vite preview + CSP
```

Optional: `VITE_ROUTER_MODE=hash` if FastAPI cannot return `index.html` for app routes.

## 5. API contract assumptions (provisional, adapter-only)

Full reference: `docs/api-adapter.md`. Summary — none of these are finalized:

- Routes in `src/shared/api/endpoints.ts`; base `/api`, same origin.
- snake_case wire fields decoded in `src/shared/api/wire/*.ts`; ids are opaque strings.
- Time offsets/durations in **milliseconds** (`WIRE_TIME_UNIT`, unconfirmed).
- Session cookie + CSRF cookie/header names in `src/shared/api/config.ts`.
- One-time launch via `?launch_code=` → `POST /api/session/launch`.
- Evaluations carry actual points (`awarded_points`, `assessable_points`, `possible_points`,
  `minimum_assessable_points`), `outcome`, and per-hit `speaker` / `disposition`.
- Calls carry `channel_layout` (`dual` | `mixed`); transcript speakers may be `unresolved`.

## 6. FastAPI serving requirements

1. Serve `dist/` statically on 127.0.0.1:8000 with the API under same-origin `/api`.
2. Return `index.html` for non-`/api`, non-asset paths (or build with `VITE_ROUTER_MODE=hash`).
3. CSP (what the tests run under): `default-src 'self'; script-src 'self'; style-src 'self';
img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
   (`blob:` media is only needed in mock mode).
4. HttpOnly session cookie, readable CSRF cookie, HTTP Range support for audio.
5. Branding at `GET /api/branding` (same-origin logo URLs, `#rrggbb` tokens).

## 7. Integration acceptance checklist

- [ ] Checked out the exact commit above into a local feature branch (not `main`).
- [ ] `npm ci`, `npm run check` and `npm run build` pass offline on Node 24.
- [ ] Endpoints/wire mappers aligned with the confirmed backend contract — only `src/shared/api/` changed.
- [ ] Launch link opens "Open local demo session"; reused codes are rejected; the code never reappears in the URL.
- [ ] Data-source badge shows "Live backend" in live mode; no "Simulated" labels on live data.
- [ ] Default scorecard shows the six approved criteria at 1/1/2/3/2/1 = 10 points, threshold 7.00, minimum 6.
- [ ] An evaluation with fewer than 6 assessable points shows "Insufficient evidence — No score" and is excluded from averages and low-score counts.
- [ ] Criterion results show actual points (e.g. "2 / 3 pts"); dashboard meters are labelled normalized and show points.
- [ ] Scores show two decimals rounded down; low score strictly < 7.00; overall averages pooled per call.
- [ ] Prohibited expressions are flagged for review unless an approved penalty rule is active and the speaker is reliably the agent.
- [ ] Mixed-channel calls keep speakers unresolved.
- [ ] Re-score creates a new immutable evaluation; history and comparison update.
- [ ] Missed / abandoned / SLA show "Not available" until PBX data exists.
- [ ] Official logo and brand tokens arrive via `/api/branding`; no CSP violations in the console.
- [ ] Arabic RTL and English, Light/Dark/System verified on desktop and mobile.

## 8. Open items

See `docs/integration.md` → _Open questions_.
