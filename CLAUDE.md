# Taqeef Call Center AI — Demo Frontend

Standalone management-demo frontend. Later integrated into the local Taqeef Call Center AI
system (FastAPI backend, ORD-0035 frontend). This repo is frontend-only.

## Hard rules

- **Synthetic data only.** No real recordings, customer data, PBX exports, credentials or
  local source code. Fixtures are invented and marked `synthetic: true`.
- **Never touch the Orva repository** or any repo other than this one.
- Work on the assigned feature branch. **Never merge into `main`.**
- **Do not invent company branding.** Official branding arrives at runtime (`GET /api/branding`);
  build-time defaults in `src/shared/branding/` stay a neutral placeholder. Never redraw logos.
- No new plugins, MCP servers, hooks or external services. No runtime CDN calls.
- **Everything is managed in the GUI** (see `docs/requirements/gui-administration.md`): no admin
  task may require CLI, DB, config-file or code changes. Admin settings are API resources, not
  `VITE_*` variables. Every management action has validation, permission checks, feedback and
  audit history.
- Demo scope only: overall and agent dashboards, basic agent management, call upload and review,
  editable scorecard, re-scoring and comparison, theme and language. Other admin areas are future.
- Agents are data, not code (see `docs/requirements/agents.md`). Overall metrics are pooled
  per call, never an average of agent averages. Sample-size warnings stay on until an approved
  reporting policy exists; no rankings. PBX figures (missed/abandoned/SLA) come only from PBX
  data, never estimated. SLA % = (Total incoming − Missed) / Total incoming × 100.
- All sample data is clearly labelled synthetic.
- Mock behaviour must always be distinguishable from the live API (`DataSourceBadge`).
- Stack is pinned to the confirmed ORD-0035 versions (`docs/handoff.md` §2). Do not add runtime
  dependencies without explicit reconciliation; pin exact versions; check license + provenance.
- Respect the strict CSP: no inline scripts/styles in HTML, no remote origins, no
  `dangerouslySetInnerHTML`. Use Node 24 (`/opt/node24/bin` in the cloud container).

## Commands

- `npm run dev` — dev server · `npm run build` — typecheck + production build
- `npm run check` — typecheck, lint, format check, unit tests (run before every commit)
- `npm run test:e2e` — Playwright (desktop + mobile, EN/AR × light/dark, axe)

## Architecture (see docs/architecture.md)

- `src/app/` composition · `src/features/<feature>/{pages,components,hooks,model}` ·
  `src/shared/{api,ui,hooks,types,utils,theme,branding,i18n}`.
- `app → features → shared`; cross-feature imports only via a feature's `index.ts` (or its
  pure `model/index.ts`). No scoring/aggregation logic in components.
- `src/shared/api/client.ts` — `ApiClient`, the only data-access surface. Wire format is
  snake_case, decoded in `shared/api/wire/`; endpoints only in `shared/api/endpoints.ts`.
- `src/shared/api/mock/` — simulated backend with synthetic fixtures (always labelled).
- `src/shared/types/domain.ts` — the single set of domain types.
- `src/shared/i18n/locales/{en,ar}.json` — all user-visible strings (typed keys).
- `src/shared/theme/tokens/` — primitive → semantic tokens. Components use semantic tokens only.

## Project skills (.claude/skills)

react-ts-engineering · enterprise-dashboard-design · taqeef-brand-tokens · rtl-accessibility ·
frontend-testing · fastapi-contract. Load the relevant one before working in its area.

## Review agents (.claude/agents)

`a11y-reviewer` and `frontend-qa` — read-only, run sequentially at the end of a phase only.
