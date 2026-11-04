# Five-call demo frontend — integration handoff for Local Claude

Status: ready to integrate against the **provisional** contract. Nothing here creates or
freezes an endpoint or schema; every route and wire field below is a proposal awaiting
Local Claude's decision.

## 1. Where it is

- Repository: `mustafaalgbory2022-ux/taqeef-callcenter-demo-frontend`
- Branch: `demo/ord-0035-cloud-stream-1` (dedicated demo branch; never merged into `main`)
- Commit: the commit that adds this file —
  `git log -1 --format=%H -- docs/demo-integration-handoff.md`. The exact hash is reported
  in the Stream 5 summary. Previous stream tip: `9037849`.
- Untouched by this work: `main`, the preserved original demo branch, and the completed
  full-system frontend branch `feature/taqeef-full-frontend`.

## 2. How to run

Node 24. `npm ci`, then:

| Purpose             | Command                            |
| ------------------- | ---------------------------------- |
| Mock demo (default) | `npm run dev`                      |
| Live build          | `VITE_API_MODE=live npm run build` |
| Pre-commit checks   | `npm run check`                    |
| Browser tests       | `npm run test:e2e`                 |

`VITE_API_MODE` only selects the transport at build time (mock vs `fetch`). In live mode the
mock backend and all synthetic fixtures are excluded from the bundle (enforced by
`src/test/liveBundle.test.ts` and a lint rule). The live client calls `apiConfig.baseUrl`
(`/api`) on the same origin; no remote origins (strict CSP).

## 3. Adapter boundary

All data access goes through `ApiClient` (`src/shared/api/client.ts`). Wire shapes are
decoded and mapped to domain types only in `src/shared/api/wire/*.ts`; routes exist only in
`src/shared/api/endpoints.ts`; names for the session cookie/header and launch parameter only in
`src/shared/api/config.ts`. Components never see wire data. Changing the contract therefore
touches the files in §5, plus mock handlers in `src/shared/api/mock/` that mirror it.

## 4. Contract-gap matrix

### Confirmed requirements (implemented; do not change without a new decision)

| Requirement                                                                                | Frontend location                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Six criteria 1/1/2/3/2/1; overall = awarded ÷ assessable × 10; actual points shown         | `src/features/evaluations/model/`, `src/shared/utils/score.ts`           |
| Below 6 assessable points → "Insufficient evidence — No score"; excluded from averages     | `model/outcome.ts`, `currentEvaluations`                                 |
| 0 assessable points → "Not assessable — No score"; failed → "Failed"; never a fabricated 0 | `model/outcome.ts`, `EvaluationPanel`, `EvaluationHistory`, `CallsTable` |
| Overall metrics pooled per call; sample-size warnings; no rankings                         | `src/features/dashboard/model/`                                          |
| No PBX SLA/missed/abandoned in the demo (not estimated from recordings)                    | dashboard (removed in Stream 4)                                          |
| Mixed-channel speakers stay unresolved                                                     | transcript components, `wire/calls.ts` (`channel_layout`)                |
| AI text plain only, labelled "AI-generated, preliminary, advisory"                         | evaluation components                                                    |
| 24-hour times, EN/AR, RTL, light/dark                                                      | `src/shared/i18n/format.ts` (`hourCycle: 'h23'`)                         |
| Masked phone numbers only; synthetic data labelled; mock vs live visible                   | `DataSourceBadge`, fixtures `synthetic: true`                            |

### Provisional assumptions (in code today, awaiting confirmation)

| Assumption                                                                                                                                                | Where it lives                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Routes under `/api`: session, session/launch, branding, queues, agents (+history), calls (+transcript, rescore), evaluations, scorecards current/versions | `src/shared/api/endpoints.ts`, `config.ts`   |
| Upload is `POST /calls` multipart (`file`, `title`, `agent_id`)                                                                                           | `client.ts` (`uploadCall`)                   |
| Launch code in query parameter `launch_code`, removed from the address bar before use                                                                     | `config.ts`, `src/app/session/launchCode.ts` |
| CSRF cookie `csrf_token`, header `X-CSRF-Token`                                                                                                           | `config.ts`, `transport.ts`                  |
| Durations/offsets in milliseconds (`WIRE_TIME_UNIT = 'ms'`); timestamps are ISO 8601 strings                                                              | `wire/common.ts`, `wire/calls.ts`            |
| IDs are opaque strings, URL-encoded in paths                                                                                                              | `endpoints.ts`                               |
| Evaluation `outcome`: `scored` \| `insufficient_evidence` \| null; "not assessable" inferred from `assessable_points = 0`                                 | `wire/evaluations.ts`, `model/outcome.ts`    |
| Criterion result: `scored` \| `not_assessable` \| `insufficient_evidence`                                                                                 | `wire/evaluations.ts`                        |
| Evaluation run status incl. `failed`; failed runs excluded from current results                                                                           | `wire/evaluations.ts`, `model/`              |
| Call status `uploaded` → `transcribing` → `scoring` → `scored` \| `failed` (polled)                                                                       | `wire/calls.ts`, calls hooks                 |
| Evidence `{segment_id, start_ms, end_ms, quote}`; prohibited hits `{segment_id, start_ms, quote}`                                                         | `wire/evaluations.ts`, `locateEvidence`      |
| Speaker `agent` \| `customer` \| `unresolved`; no transcript revision id                                                                                  | `wire/calls.ts` (transcript)                 |

### Decisions Local Claude must finalize, and the exact files each one affects

| #   | Decision                                                                                   | Files to change                                                                                                                |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Final routes, base path and upload shape                                                   | `src/shared/api/endpoints.ts`, `src/shared/api/config.ts`, `src/shared/api/client.ts`, mock handlers in `src/shared/api/mock/` |
| 2   | Launch-code location (query vs URL fragment) and exchange body                             | `src/shared/api/config.ts`, `src/app/session/launchCode.ts`, `src/shared/api/wire/session.ts`, `tests/e2e/session.spec.ts`     |
| 3   | CSRF cookie/header names and session payload                                               | `src/shared/api/config.ts`, `src/shared/api/transport.ts`, `src/shared/api/wire/session.ts`                                    |
| 4   | Time unit (ms vs s) and timestamp format/time zone                                         | `src/shared/api/wire/common.ts` (one constant), `src/shared/i18n/format.ts` if a zone must be fixed                            |
| 5   | Explicit wire value for "not assessable" overall outcome                                   | `src/shared/api/wire/evaluations.ts`, `src/features/evaluations/model/outcome.ts`, `src/shared/types/domain.ts`                |
| 6   | Criterion state vocabulary (e.g. met / partially met / not met / not assessable)           | `src/shared/api/wire/evaluations.ts`, `src/shared/types/domain.ts`, evaluation components, `locales/{en,ar}.json`              |
| 7   | Transcript revision id on transcripts and on each evaluation (or evidence item)            | `src/shared/api/wire/calls.ts`, `src/shared/api/wire/evaluations.ts`, `src/shared/types/domain.ts`, `locateEvidence`           |
| 8   | Evidence as segment ids only: adapter enriches `start_ms`/`end_ms`/text from that revision | `src/shared/api/wire/evaluations.ts` (mapping), `src/shared/api/client.ts` (transcript lookup)                                 |
| 9   | Error envelope and field-issue format                                                      | `src/shared/api/errors.ts`, `src/shared/api/fieldIssues.ts`                                                                    |
| 10  | Audio delivery (`audio_url` same-origin path, range requests) and call/agent ID formats    | `src/shared/api/wire/calls.ts`, `src/shared/api/endpoints.ts`                                                                  |

Until each decision is made, the current provisional value stays as it is; no speculative
mapping has been added.

## 5. Acceptance checklist for integration

- [ ] `npm run check` and `npm run test:e2e` pass on the integrated branch.
- [ ] Live build shows the live data-source badge and contains no synthetic markers
      (`src/test/liveBundle.test.ts`).
- [ ] Scored, insufficient evidence, not assessable and failed results each display their own
      label against real responses; none shows a score it did not receive.
- [ ] Evidence highlights the referenced segment of the same transcript revision.
- [ ] Session launch code is exchanged once and never left in the address bar or logs.
