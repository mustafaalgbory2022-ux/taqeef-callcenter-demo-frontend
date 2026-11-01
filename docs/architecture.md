# Architecture guide

A feature-based React 19 + TypeScript (strict) application built with Vite. It has
**two runtime dependencies besides React**: `react-router`, and nothing else. Data validation,
caching, i18n and the simulated backend are small in-house modules, so the local offline
build needs no extra packages.

## Layout

```
src/
  app/                       Composition only: providers, router, shell, session gate
    providers/               I18n → Theme → Api → Toast
    session/                 "Open local demo session" (one-time launch code), SessionGate
    shell/                   AppShell (sidebar, top bar), navigation config, preference controls
    router.tsx               Route table; every page is lazy-loaded (own chunk)
  features/                  One folder per business capability
    dashboard/               Overall + individual agent performance
    agents/                  Agent profiles, Yeastar extensions, queues, change history
    calls/                   Upload, audio player, synced transcript, call review
    scorecards/              Editable scorecard, versions, prohibited expressions
    evaluations/             Evidence, re-scoring, history, previous-vs-new comparison
    settings/                Language/theme, reporting rules, demo data, planned admin areas
    queues/                  Queue administration (Phase B)
    ai-admin/                Models, limits, job queue, prompts, evaluation rules (Phase B)
    dictionary/              Iraqi Arabic dictionary, supervised corrections (Phase B)
    pbx-admin/               PBX connectors; vendors/ = replaceable vendor form adapters (Phase B)
    notifications/           Microsoft 365 sender, rules, templates, deliveries (Phase B)
    reports/                 + report configuration and manual weekly generation (Phase B)
  shared/
    api/                     ApiClient, transport, endpoints, wire mappers, errors, query cache
      adapters/              One typed, replaceable adapter per administration area (Phase B)
      wire/                  snake_case wire decoders + mappers (one file per resource)
      mock/                  SIMULATED backend (same wire format), synthetic fixtures
    ui/                      Accessible, reusable components (Button, Card, Dialog, Field…)
    hooks/                   useApiQuery, useApiMutation, combineQueries, useSession…
    types/domain.ts          The single set of domain types (camelCase)
    utils/                   Pure, tested functions (score rounding, time, validation)
    theme/                   Design tokens (primitive → semantic), base CSS, ThemeProvider
    branding/                Runtime brand tokens + logo slot, defaults (neutral placeholder)
    i18n/                    Typed t(), formatters, en.json / ar.json
```

Inside a feature: `pages/` (route components), `components/` (presentation),
`hooks/` (data access + behaviour), `model/` (pure business rules + tests), `index.ts`
(public API).

## Dependency rules

1. `app → features → shared`. `shared` never imports from `features` or `app`.
2. Features import other features only through their `index.ts`, or through a pure
   `model/index.ts` barrel (no React) when a model needs another feature's rules.
3. Current feature graph (acyclic): `dashboard → calls, evaluations, agents, scorecards`;
   `calls → evaluations, agents, scorecards`; `evaluations → scorecards, agents`;
   `agents`, `scorecards`, `settings` → shared only. Phase B: `queues`, `pbx-admin`,
   `notifications` → `agents`; `ai-admin` → `scorecards`; `dictionary` → shared only;
   `reports` → `agents, dashboard, evaluations, scorecards`.
4. Rules used by both a form and the simulated backend live in `shared/utils/*Rules.ts`
   (`aiRules`, `dictionaryRules`, `pbxRules`, `emailRules`, `reportRules`, `arabic`).
5. UI components never call `fetch` and never compute scores or aggregates. Business
   rules live in `model/` or `shared/utils/` and are unit-tested.

## Data flow

```
Page → feature hook (useApiQuery / useApiMutation) → ApiClient (domain types)
     → wire decoder + mapper (snake_case ↔ camelCase, validation)
     → Transport ─┬─ fetch transport  (live: same-origin /api, cookies, CSRF header)
                  └─ mock transport   (simulated backend, synthetic data, labelled)
```

- **Validation:** every response is decoded; unexpected shapes raise
  `ApiError('contract_mismatch')` instead of rendering wrong data.
- **Caching:** `QueryStore` deduplicates requests; mutations invalidate key prefixes
  (`'agents'`, `'calls'`, `'evaluations'`, `'scorecards'`) so dashboards, lists and history
  refresh together. An invalidation during an in-flight request triggers a fresh fetch.
  Lists poll while calls are processing and refresh all views when processing settles.
- **Errors:** one `ApiError` type; `describeError()` gives localised, user-safe messages;
  422 field issues map back onto form fields.

## Business rules (where they live)

| Rule                                                                                                                                                                                               | Module                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Two decimals, always rounded down; low = strictly below threshold (7.00 default)                                                                                                                   | `shared/utils/score.ts`                                                          |
| Deterministic points: overall = awarded ÷ assessable points × 10; minimum 6 assessable points for the whole evaluation, otherwise "Insufficient evidence — No score"; partial credit per criterion | `shared/utils/score.ts` (reference; backend authoritative)                       |
| Prohibited expressions: penalty only under the scorecard's rule AND reliable agent attribution (dual channel), otherwise flagged for review; mixed-channel speakers stay unresolved                | `shared/api/mock/scoring.ts` (simulation of the backend rule)                    |
| Each call counted once via its latest completed evaluation; no-score results are excluded from averages/low counts and never replaced by older scores; history immutable                           | `features/evaluations/model/current.ts`, `features/dashboard/model/aggregate.ts` |
| Criterion meters are normalized (pooled awarded ÷ possible × 10) and always shown with the actual points                                                                                           | `features/dashboard/components/CriteriaPerformance.tsx`                          |
| Pooled per-call averages, never mean of agent means; low-score count uses each evaluation's own version threshold; optional scorecard-version filter (`?version=`) to compare like with like       | `features/dashboard/model/aggregate.ts`                                          |
| Previous-vs-new comparison by criterion id                                                                                                                                                         | `features/evaluations/model/compare.ts`                                          |
| Agent validation (unique extension), alphabetical lists (no ranking)                                                                                                                               | `features/agents/model/agents.ts`                                                |
| Scorecard validation, new immutable version per save                                                                                                                                               | `features/scorecards/model/draft.ts`                                             |
| Sample-size warning always shown; PBX metrics never estimated                                                                                                                                      | `features/dashboard/components/SampleNotice.tsx`, `PbxPanel.tsx`                 |

## Cross-cutting concerns

- **i18n:** all strings in `shared/i18n/locales/{en,ar}.json`; keys are type-checked
  (`MessageKey`); a unit test enforces identical keys in both languages. Bilingual data
  uses `{ en, ar }` and `pick()`. Numbers via `Intl` with Western digits
  (`NUMBERING_SYSTEM`).
- **RTL:** `<html dir>` follows the language; CSS uses logical properties only; ids,
  times and numbers are wrapped in `<bdi>`; mixed-language text carries its own `lang`/`dir`.
- **Themes:** Light / Dark / System via `data-theme` on `<html>`; components use semantic
  tokens only.
- **Branding:** `GET /branding` at runtime → CSS custom properties (hex-validated) + logo URL.
  Build-time defaults are a neutral placeholder; official assets are never redrawn here.
- **Security / CSP:** no inline scripts or styles in HTML, no remote origins, styles set via
  CSSOM only, no `dangerouslySetInnerHTML`. The launch code is removed from the URL _before_
  the router is created (so navigation can never reintroduce it). Runtime logo URLs must be
  same-origin paths or inline images. Scores are range-checked (0–10) when decoded.
- **Accessibility:** native elements first, labelled controls, focus moves to the page
  heading on navigation, native `<dialog>` for modals, meters with text values, never
  colour-only status.

## Maintaining each feature

| Feature          | Change data shape           | Change behaviour                       | Tests                                             |
| ---------------- | --------------------------- | -------------------------------------- | ------------------------------------------------- |
| dashboard        | `shared/types`, wire mapper | `model/aggregate.ts`                   | `aggregate.test.ts`, `dashboard.spec.ts`          |
| agents           | `wire/agents.ts`            | `model/agents.ts`, `AgentFormDialog`   | `agents.test.ts`, `admin.spec.ts`                 |
| calls            | `wire/calls.ts`             | `hooks/useAudioPlayer.ts`, `model/*`   | `calls.test.ts`, `calls.spec.ts`                  |
| scorecards       | `wire/scorecards.ts`        | `model/draft.ts`, editors              | `draft.test.ts`, `admin.spec.ts`                  |
| evaluations      | `wire/evaluations.ts`       | `model/current.ts`, `model/compare.ts` | `evaluations.test.ts`, `calls.spec.ts`            |
| settings         | —                           | `model/adminAreas.ts`                  | `a11y.spec.ts`                                    |
| queues           | `wire/agents.ts`            | `model/queues.ts`                      | `queues.test.ts`, `admin-queues.spec.ts`          |
| ai-admin         | `wire/ai.ts`                | `model/aiConfig.ts`, `utils/aiRules`   | `aiConfig.test.ts`, `admin-ai.spec.ts`            |
| dictionary       | `wire/dictionary.ts`        | `model/dictionary.ts`, `utils/arabic`  | `dictionary.test.ts`, `admin-dictionary`          |
| pbx-admin        | `wire/pbx.ts`               | `vendors/*`, `model/pbx.ts`            | `pbx.test.ts`, `admin-pbx.spec.ts`                |
| notifications    | `wire/notifications.ts`     | `model/notifications.ts`               | `notifications.test.ts`, `admin-notifications`    |
| reports (config) | `wire/reportSettings.ts`    | `model/reportSettings.ts`              | `reportSettings.test.ts`, `admin-report-settings` |

**Administration pattern (Phase B):** settings are API resources read through a feature hook;
forms validate with the shared rule module, map 422 issues back to fields, ask for
confirmation (`ConfirmDialog`) before destructive changes, give toast feedback, and show the
append-only history with `AuditTrail` (`useAdminAudit(prefix, resource)`). Secrets are
write-only inputs. **Adding a PBX vendor:** add a `PbxVendorFormAdapter` in
`features/pbx-admin/vendors/` and register it in `vendors/index.ts`; the backend reports it in
`GET /pbx/vendors`.

**Adding a feature:** create `features/<name>/{pages,components,hooks,model}`, add a lazy
route in `app/router.tsx`, a nav entry in `app/shell/navigation.ts`, strings in both
locale files, endpoints in `shared/api/endpoints.ts` + a wire mapper, and model tests.

## Testing

`npm run check` (typecheck, lint, format, unit) · `npm run test:e2e` (Playwright: desktop +
mobile; session, dashboards, click-through, audio/transcript sync, re-scoring, upload,
agent management incl. 8 agents, scorecard versioning; axe WCAG 2.2 AA in EN/AR ×
light/dark on every page; no horizontal overflow; no console/CSP errors under the strict
CSP served by `vite preview`).
