# Taqeef Call Center AI — Demo Frontend

Standalone management-demo frontend. Later integrated into the local Taqeef Call Center AI
system (FastAPI backend, ORD-0035 frontend). This repo is frontend-only.

## Hard rules

- **Synthetic data only.** No real recordings, customer data, PBX exports, credentials or
  local source code. Fixtures are invented and marked `synthetic: true`.
- **Never touch the Orva repository** or any repo other than this one.
- Work on the assigned feature branch. **Never merge into `main`.**
- **Do not invent company branding.** Brand values go only in `src/styles/brand.css` and
  `src/config/brand.config.ts`; until official assets arrive, the neutral placeholder stays.
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
- Dependency versions are **provisional** until confirmed against ORD-0035
  (see `docs/integration.md`). Pin exact versions; check license + provenance before adding.

## Commands

- `npm run dev` — dev server · `npm run build` — typecheck + production build
- `npm run check` — typecheck, lint, format check, unit tests (run before every commit)
- `npm run test:e2e` — Playwright (desktop + mobile, EN/AR × light/dark, axe)

## Architecture (see docs/architecture.md)

- `src/api/contract/` — Zod schemas = the frontend's data contract. Types derive from schemas.
- `src/api/client.ts` — `ApiClient`, the only data-access surface. Components never `fetch`.
- `src/api/endpoints.ts` — single endpoint map to align with FastAPI.
- `src/styles/tokens/` — primitive → semantic tokens. Components use semantic tokens only.
- `src/i18n/{en,ar}.json` — all user-visible strings. No hard-coded UI text.
- `src/features/<feature>/` — feature modules (added from Phase 3).

## Project skills (.claude/skills)

react-ts-engineering · enterprise-dashboard-design · taqeef-brand-tokens · rtl-accessibility ·
frontend-testing · fastapi-contract. Load the relevant one before working in its area.

## Review agents (.claude/agents)

`a11y-reviewer` and `frontend-qa` — read-only, run sequentially at the end of a phase only.
