# Handoff package — Taqeef Call Center AI full frontend (Phases A–D)

For Local Claude / the ORD-0035 team. This standalone repository never modifies the local
application. Integration is a reviewed copy into a local feature branch — never a merge into
`main`. Everything here runs against a **simulated backend**; no production behaviour has been
verified end to end.

## 1. Source

| Item                        | Value                                                                     |
| --------------------------- | ------------------------------------------------------------------------- |
| Repository                  | `mustafaalgbory2022-ux/taqeef-callcenter-demo-frontend`                   |
| Branch                      | `feature/taqeef-full-frontend`                                            |
| Final implementation commit | `f91a92ac103f7266a6bcea9034ad68e6df92b105` (Phase D fixes)                |
| Handoff document commit     | the commit that adds this revision (branch tip)                           |
| Preserved demo baseline     | branch `claude/affectionate-ritchie-cr40s7`, commit `860ffa9` — untouched |
| `main`                      | untouched; nothing merged                                                 |

```bash
git fetch origin feature/taqeef-full-frontend
git checkout f91a92ac103f7266a6bcea9034ad68e6df92b105   # or the branch tip for these docs
```

## 2. Frontend module inventory

Feature folders follow `pages/ components/ hooks/ model/ index.ts`; cross-feature imports go
through `index.ts` (or a pure `model/index.ts`). See `docs/architecture.md`.

| Area                                    | Route(s)                                | Feature                | Phase   |
| --------------------------------------- | --------------------------------------- | ---------------------- | ------- |
| Executive dashboard                     | `/`                                     | `dashboard`            | Demo, A |
| Agent performance, comparison           | `/agents`, `/agents/:id`                | `dashboard`, `agents`  | Demo, A |
| Live center                             | `/live`                                 | `live`                 | A       |
| Calls, upload, call detail, review      | `/calls`, `/calls/upload`, `/calls/:id` | `calls`, `evaluations` | Demo, A |
| Customer insights                       | `/insights`                             | `insights`             | A       |
| Reports, Excel export, audio sample     | `/reports`                              | `reports`              | A       |
| Evaluations                             | `/evaluations`                          | `evaluations`          | Demo    |
| Scorecard (versions, penalty rule)      | `/admin/scorecard`                      | `scorecards`           | Demo    |
| Agents                                  | `/admin/agents`                         | `agents`               | Demo    |
| Queues                                  | `/admin/queues`                         | `queues`               | B       |
| AI administration                       | `/admin/ai`                             | `ai-admin`             | B       |
| Iraqi Arabic dictionary, corrections    | `/admin/dictionary`                     | `dictionary`           | B       |
| PBX (Yeastar P550, vendor adapters)     | `/admin/pbx`                            | `pbx-admin`            | B       |
| Notifications and email                 | `/admin/notifications`                  | `notifications`        | B       |
| Report configuration, weekly generation | `/admin/reports`                        | `reports`              | B       |
| Users and roles                         | `/admin/users`                          | `users`                | C       |
| Authentication and MFA                  | `/admin/security`, `/account/security`  | `security`             | C       |
| Storage and retention                   | `/admin/storage`                        | `storage`              | C       |
| Backup, restore, migration              | `/admin/backups`                        | `backups`              | C       |
| System health, error log                | `/admin/health`                         | `system`               | C       |
| Audit log                               | `/admin/audit`                          | `audit-log`            | C       |
| General settings and branding           | `/admin/general`                        | `general`              | C       |
| Personal appearance, demo data          | `/admin/settings`                       | `settings`             | Demo    |
| Administration overview                 | `/admin/planned`                        | `settings`             | C       |

Data access: `ApiClient` (`src/shared/api/client.ts`) with one replaceable adapter per area in
`src/shared/api/adapters/`; decoders in `src/shared/api/wire/`; routes only in
`src/shared/api/endpoints.ts`; simulated backend in `src/shared/api/mock/` (mock mode only).

## 3. Confirmed dependencies (unchanged since the demo)

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

## 4. Build and verification (Node 24, offline)

```bash
npm ci                               # exactly from package-lock.json
npm run check                        # typecheck + lint + format check + unit tests
npm run build                        # mock-mode build → dist/ (standalone demo)
VITE_API_MODE=live npm run build     # live build for FastAPI (same-origin /api)
npm run test:e2e                     # Playwright desktop + mobile, axe WCAG 2.2 AA, under the CSP
```

Phase D results (simulated backend only): typecheck, lint and format clean; **144 unit tests** (incl. the live-bundle guard)
pass; the Playwright suite (functional flows on desktop and mobile plus axe on 26 pages ×
EN/AR × light/dark) passes — **290 passed, 0 failed** (210 in the accessibility spec). The production build
succeeds (it is part of the e2e run). Optional: `VITE_ROUTER_MODE=hash` if FastAPI cannot
return `index.html` for application routes.

## 5. Authentication, CSRF, CSP and deployment requirements

- **Sessions.** The frontend uses an HttpOnly session cookie (never readable by JS) and sends
  `X-CSRF-Token` from the readable `csrf_token` cookie on every non-GET request
  (`src/shared/api/config.ts`, provisional names). 401 returns the user to the session screen.
- **Demo launch code ≠ production login.** The only sign-in UI is the one-time launch-code
  exchange (`POST /session/launch`). **A production sign-in screen (username + password, then
  6-digit TOTP; enrollment on first sign-in; reset links) is not implemented** — the
  administration and account screens for it exist (`/admin/security`, `/account/security`),
  but the backend must provide the authentication flow and the frontend needs a login screen
  wired to it during integration (see §9).
- **Permissions are UI gating only.** `usePermission()` hides or disables actions; the backend
  must authorize every request (403) and enforce the self/last-administrator protections,
  four-eyes rules (dictionary review, MFA reset) and confirmation flags (`confirm: true`).
- **Secrets.** Write-only in every form; responses carry only `credential_set`. Never return or
  log passwords, TOTP secrets, one-time codes, recovery codes (except once when generated) or
  secret values. Messages are additionally redacted client-side (`shared/utils/redact.ts`).
- **CSP** (what the tests run under): `default-src 'self'; script-src 'self'; style-src 'self';
img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. No inline
  scripts/styles in HTML, no remote origins, no `dangerouslySetInnerHTML`; styles set only via
  CSSOM. `blob:` media is needed in mock mode only.
- **Serving.** FastAPI serves `dist/` on 127.0.0.1:8000 with the API under same-origin `/api`,
  returns `index.html` for non-API paths, supports HTTP Range for audio, and serves
  `/brand/*` assets.

## 6. Permission matrix (provisional names; backend is the authority)

Read-only users can view all dashboards, calls, evaluations and reports. Agents never receive
accounts (no agent self-service).

| Permission                                                                   | Administrator | Read-only and export |
| ---------------------------------------------------------------------------- | ------------- | -------------------- |
| `reports.export`                                                             | ✓             | ✓                    |
| `agents.manage`, `queues.manage`, `scorecards.manage`, `evaluations.rescore` | ✓             | —                    |
| `calls.upload`, `calls.review`                                               | ✓             | —                    |
| `reports.manage`, `settings.manage`                                          | ✓             | —                    |
| `ai.manage`, `dictionary.manage`, `dictionary.review`                        | ✓             | —                    |
| `pbx.manage`, `notifications.manage`                                         | ✓             | —                    |
| `users.manage`, `security.manage`                                            | ✓             | —                    |
| `storage.manage`, `backups.manage`                                           | ✓             | —                    |
| `system.view`, `audit.view`, `audit.export`, `branding.manage`               | ✓             | —                    |

The matrix shown in the GUI (`/admin/users`) comes from `GET /auth/roles`. Unknown permissions
from a newer backend are ignored.

## 7. Local branding integration

1. Copy the approved Taqeef logo files into the served `/brand/` folder (e.g.
   `/brand/logo-light.svg`, `/brand/logo-dark.svg`). Nothing is redrawn in this repository;
   `public/brand/logo-placeholder.svg` stays the neutral default.
2. In **General and branding** (`/admin/general`), enter the bilingual names, the two logo paths
   (must match `/brand/<name>.(svg|png|webp)`), light/dark primary colours (validated for 4.5:1
   contrast) and the approval reference. Each save is a version; earlier versions can be loaded.
3. The backend serves the latest version at `GET /api/branding`; `BrandingProvider` applies it
   at runtime (hex-validated tokens via CSSOM, same-origin logo URLs only).

## 8. Integration acceptance checklist

Repository and build

- [ ] Exact commit checked out into a local feature branch (not `main`); `npm ci`, `npm run check`, `npm run build` pass offline on Node 24.
- [ ] Only `src/shared/api/` (endpoints, wire decoders, config) changed to match the confirmed contract; `VITE_API_MODE=live` build used.
- [ ] `VITE_API_MODE=live` build used; `npm run test` includes `src/test/liveBundle.test.ts`, which builds the live bundle and fails if any simulated-backend module or synthetic data is present.
- [ ] Data-source badge shows "Live backend"; no "Simulated" labels on live data.

Security

- [ ] Production login (password + TOTP) implemented; launch-code access disabled or restricted in production.
- [ ] Every mutating route enforces its permission server-side (try each as a read-only user → 403).
- [ ] CSRF header required on non-GET; session cookie HttpOnly/SameSite; idle and maximum session limits applied.
- [ ] No secret, password, OTP or recovery code appears in any response, audit entry or log.
- [ ] Served CSP matches §5; no console CSP violations.

Business rules (unchanged from the demo)

- [ ] Six approved criteria 1/1/2/3/2/1 = 10 points, threshold 7.00, minimum 6 assessable points; below 6 → "Insufficient evidence — No score", excluded from averages and low counts.
- [ ] Scores two decimals rounded down; low strictly < 7.00; overall averages pooled per call; no rankings; sample-size warnings shown.
- [ ] Prohibited expressions deduct only under the approved penalty rule with reliable (dual-channel) agent attribution; mixed-channel speakers stay unresolved.
- [ ] SLA % = (incoming − missed) ÷ incoming × 100 from PBX data only; missed and abandoned separate; "Not available" without PBX data.

Administration (each screen against the live backend)

- [ ] Queues, agents, AI configuration, dictionary, PBX, notifications, report settings, users, security policy, storage, backups, general/branding: save → new version / audit entry; validation errors map to fields (422); destructive changes need `confirm` (409 otherwise).
- [ ] PBX test and sync, email tests, backups, verification and restores report real statuses only when actually performed.
- [ ] No permanent deletion is reachable; recovery-area items are hidden until restored.
- [ ] Audit log filters/export work server-side; export is audited.
- [ ] Default language/theme apply for users without a personal choice; Arabic RTL and English, Light/Dark/System checked on desktop and mobile.

## 9. Incompatibilities with the Local ORD-0035 demo architecture

| Item                   | Demo architecture                             | Full frontend                                                  | Action                                                                     |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Sign-in                | Launch-code session only                      | Same UI; production password + TOTP needed                     | Add a login screen and backend auth; keep launch code for demo builds only |
| API surface            | 17 demo routes                                | 111 provisional routes (`docs/api-adapter.md`)                 | Backend implements or the adapters are trimmed per area                    |
| Session payload        | `mode, display_name, permissions, expires_at` | adds optional `user_id`                                        | Backend adds it (null tolerated)                                           |
| Permissions            | 8 demo permissions                            | 22 permissions                                                 | Backend role model must issue them                                         |
| Audit                  | Agent history only                            | Append-only `GET /admin/audit` with `result`, `correlation_id` | New backend store                                                          |
| Branding               | `GET /branding` static                        | Served from versioned branding settings                        | Backend stores settings and serves `/brand/` assets                        |
| Default language/theme | Browser preference only                       | Organization default from `GET /settings/application`          | Must be readable by every signed-in user                                   |
| Mock store             | `taqeef.mock.db.v3`                           | `taqeef.mock.db.v5` (mock mode only)                           | None for live mode                                                         |

No dependency, build-tool or CSP incompatibility: the stack is unchanged.

## 10. Remaining backend dependencies

See `docs/backend-operations.md` (per feature) and `docs/api-adapter.md` (provisional
contracts — not final). The main ones: authentication and MFA, server-side permission
enforcement, Yeastar ingestion and PBX statistics, transcription/evaluation/classification
pipeline and job queue, Microsoft 365 sending, storage moves and retention, encrypted backups
with verification and restore, system metrics and sanitized error records, append-only audit
storage, versioned settings and branding storage.
