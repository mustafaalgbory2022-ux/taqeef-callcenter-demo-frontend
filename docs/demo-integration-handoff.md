# Five-call demo frontend — integration handoff for Local Claude

Status: aligned with **demo API contract v0.2** (authoritative) as of Stream 7. Nothing here
creates or freezes an endpoint or schema; every route stays PROPOSED until M4 / v0.3.

## 1. Where it is

- Repository: `mustafaalgbory2022-ux/taqeef-callcenter-demo-frontend`
- Branch: `demo/ord-0035-cloud-stream-1` (dedicated demo branch; never merged into `main`)
- Commit: the commit that last changed this file —
  `git log -1 --format=%H -- docs/demo-integration-handoff.md`; the exact hash is in the
  Stream 7 report. Previous checkpoint: `e1e44abf`.
- Untouched: `main`, the preserved original demo branch, `feature/taqeef-full-frontend`.

## 2. How to run

Node 24. `npm ci`, then `npm run dev` (mock), `VITE_API_MODE=live npm run build` (live),
`npm run check`, `npm run test:e2e`. The mock backend and synthetic data are excluded from live
builds (`src/test/liveBundle.test.ts`).

## 3. Implemented in Stream 6 (CONFIRMED rules from change list v0.2)

| #   | Rule                                                                                     | Frontend behaviour                                                                                                                                                            | Files                                                                                   |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Launch code in `#c=`                                                                     | Read from the fragment only (a `?launch_code=` is ignored), `POST /api/session/exchange {"code"}`, fragment removed with `history.replaceState`; `/launch` is replaced by `/` | `src/app/session/launchCode.ts`, `src/shared/api/config.ts`, `src/shared/api/client.ts` |
| 2   | CSRF `X-Taqeef-CSRF` on every `/api` request, GET included                               | Token from the exchange response, held in ApiClient memory only; no cookie read; exchange sent without it; `<audio>` does not send it                                         | `src/shared/api/client.ts`, `src/shared/api/transport.ts`                               |
| —   | Session end (contract 1.6, PROPOSED)                                                     | Any 401 drops token and cached data and shows "Session ended — reopen the demo from the launcher"; no silent re-exchange; a reload needs a new code                           | `src/app/session/SessionGate.tsx`, `LaunchScreen.tsx`                                   |
| 3   | Explicit `not_assessable` run outcome                                                    | Decoded and presented as-is, never inferred from points; failed evaluations have no run (failure is shown from the call status)                                               | `src/shared/api/wire/evaluations.ts`, `src/features/evaluations/model/outcome.ts`       |
| 4   | Criterion `met`/`partially_met`/`not_met`/`not_assessable` + `reason_code` + `na_reason` | Consistency enforced in the decoder; reason labels in EN/AR; AI-declared "insufficient evidence" shown as such                                                                | `wire/evaluations.ts`, `ResultValue.tsx`, `locales/{en,ar}.json`                        |
| 5   | `transcript_revision_id` on transcripts and runs                                         | Revision id (lowercase UUIDv7) and `seg-NNNN` ids validated; transcript fetched by revision                                                                                   | `src/shared/api/wire/ids.ts`, `wire/calls.ts`, `endpoints.ts`                           |
| 6   | Evidence = `segment_id` only                                                             | Time and text come only from the run's own revision; a different revision is reported "unavailable", never resolved; `quote`/`start_ms` removed from wire types               | `src/features/calls/model/transcript.ts`, `CriterionResults.tsx`, `CallDetailPage.tsx`  |
| 7   | `unresolved` → `unknown`                                                                 | Speaker enum renamed in wire, domain, mock and UI                                                                                                                             | `wire/calls.ts`, `wire/evaluations.ts`, `domain.ts`                                     |
| 9   | Audio from `GET /api/calls/{call_id}/audio`                                              | `audio_url` removed; URL built from the call id; `cache: 'no-store'` on API fetches; no download control                                                                      | `client.ts` (`audioSrc`), `endpoints.ts`, `CallDetailPage.tsx`                          |
| 10  | Upload `display_name`, optional `channel_map`, agent from a list                         | WAV only, ≤ 100 MB, 1–200 characters, client `request_id`; response `202 {call_id, status, job_id}`                                                                           | `client.ts`, `wire/calls.ts`, `src/features/calls/model/upload.ts`, `UploadForm.tsx`    |

## 4. Implemented in Stream 7 (contract v0.2)

| v0.2 item     | Frontend behaviour                                                                                                                                                                                                                                                                  | Files                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 7 Revision    | The call page loads the revision of the displayed run (same "latest run" rule as the evaluation panel), labels it and notes when a newer, unscored revision exists                                                                                                                  | `calls/model/transcript.ts` (`revisionToShow`), `CallDetailPage.tsx`                                  |
| 9 Errors      | `{"error": {code, message, correlation_id, fields[{field, reason}]}}` decoded; only identifier-shaped codes, field names and rule codes are kept; server `message` is never kept or shown; UI text is localised, with the correlation id as a reference; 400/403/413/415/429 mapped | `shared/api/errors.ts`, `fieldIssues.ts`, `shared/i18n/errorMessage.ts`                               |
| C Call status | All 12 statuses decoded and labelled (EN/AR); grouped processing / evaluated / failed; pipeline steps uploaded → probing → ready → transcribing → transcribed → evaluating → evaluated; failures show their own text and never a score                                              | `domain.ts` (`CALL_STATUSES`), `calls/model/status.ts`, `CallStatusBadge.tsx`, `ProcessingStatus.tsx` |
| E2 Job states | The seven states are typed (`JOB_STATES`) and labelled (EN/AR); not yet displayed (see §5)                                                                                                                                                                                          | `domain.ts`, `locales/*.json`                                                                         |
| 4 Time        | Every wire timestamp must match `YYYY-MM-DDTHH:MM:SS.sssZ`; anything else is a contract mismatch; local-zone 24-hour conversion only when formatting                                                                                                                                | `wire/common.ts` (`utcTimestamp`), all `wire/*.ts`                                                    |
| 1 Upload      | `display_name` optional (≤ 200); `agent_id` required, chosen from the list and sent by id only                                                                                                                                                                                      | `calls/model/upload.ts`, `UploadForm.tsx`, `client.ts`                                                |
| D Scorecard   | Save = `PUT /api/scorecard/draft` then `POST /api/scorecard/activate`; versions from `GET /api/scorecard/versions`; "current" = newest version (PROVISIONAL: no active flag defined)                                                                                                | `endpoints.ts`, `client.ts`                                                                           |
| 1 Queues      | Queue route, types, agent queue assignment and queue columns removed                                                                                                                                                                                                                | agents feature, `wire/agents.ts`, `wire/calls.ts`                                                     |
| 1 Branding    | Static: no branding route; neutral placeholder in `shared/branding/defaults.ts`; branch-local `CLAUDE.md` and the brand-tokens skill updated                                                                                                                                        | `shared/branding/`, `CLAUDE.md`, `.claude/skills/taqeef-brand-tokens/SKILL.md`                        |
| 10 IDs        | All ids are treated as opaque (non-empty) strings; the UUIDv7 format is not enforced (awaiting confirmation for every id); `seg-NNNN` stays enforced (v0.1 2.2)                                                                                                                     | `wire/ids.ts`                                                                                         |

## 5. Remaining gaps — decisions for Local Claude

| Item                                                                                                 | Status                                                                                                                                                                       | Files affected when decided                                                        |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| E Job-summary polling (2 s)                                                                          | Deferred: the `GET /api/jobs/summary` body is not defined, so nothing is polled from it; call-status polling stays                                                           | `useCallData.ts`, `client.ts`, `ProcessingStatus.tsx`                              |
| B Speaker roles per run, `channel_map_source`                                                        | Deferred: role-method values are known, but the per-run segment-role fields and `channel_map_source` values are not; `channel_layout` and segment `speaker` stay PROVISIONAL | `wire/calls.ts`, `wire/evaluations.ts`, `TranscriptView.tsx`, `CallDetailPage.tsx` |
| UUIDv7 for every id                                                                                  | Contract item 10 says lowercase UUIDv7; mock call/agent ids (`DEMO-001`, `agt-001`) unchanged pending confirmation                                                           | `wire/ids.ts`, mock fixtures, e2e paths                                            |
| Rejection reason enum on `rejected` calls                                                            | Field name not defined; only the status is shown                                                                                                                             | `wire/calls.ts`, `ProcessingStatus.tsx`                                            |
| Selecting an older run to view                                                                       | The page shows the latest run; picking another run for the transcript needs a UI decision                                                                                    | `EvaluationPanel.tsx`, `CallDetailPage.tsx`                                        |
| Re-score `202 {job_id}`, response bodies, agents schema, dashboard payload, word span, digit masking | OPEN / deferred in v0.2                                                                                                                                                      | `client.ts`, `wire/*.ts`                                                           |
| Overall "Not assessable — no score (<main reason>)"                                                  | Main-reason rule not defined                                                                                                                                                 | `EvaluationPanel.tsx`                                                              |

## 6. Mock mode

The simulated backend mirrors the confirmed rules: one-time codes, CSRF on every
non-exempt route (403 otherwise), in-memory session, revision-linked runs, explicit outcomes,
reason codes, WAV-only uploads, the 12-status pipeline, UTC timestamps, the error envelope,
draft/activate scorecards, and a re-transcribed call (DEMO-002) whose run stays on its earlier
revision. Its scoring rule (0 assessable points → not assessable)
is a simulation only; real outcomes come from the API. All data stays synthetic and labelled.

## 7. Acceptance checklist

- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Live build contains no synthetic markers.
- [ ] `/launch#c=<code>` opens the session; the code never appears in a request or the address bar.
- [ ] Every `/api` request except the exchange, health and audio carries `X-Taqeef-CSRF`.
- [ ] A 401 returns to the launch screen with the session-ended notice.
- [ ] Scored, insufficient evidence and not assessable runs each show their own label; none shows a score it did not receive.
- [ ] Evidence highlights the referenced segment of the run's own transcript revision only.
