# Five-call demo frontend — integration handoff for Local Claude

Status: aligned with the Local Claude **frontend change list v0.2** and **demo API contract
v0.1** (the only contract document received; v0.2 itself, including its "item C" call-status
list, was not received). Nothing here creates or freezes an endpoint or schema.

## 1. Where it is

- Repository: `mustafaalgbory2022-ux/taqeef-callcenter-demo-frontend`
- Branch: `demo/ord-0035-cloud-stream-1` (dedicated demo branch; never merged into `main`)
- Commit: the commit that last changed this file —
  `git log -1 --format=%H -- docs/demo-integration-handoff.md`; the exact hash is in the
  Stream 6 report. Previous checkpoint: `bb0dd283`.
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

## 4. Not done, or unresolved — decisions for Local Claude

| Item                                                                                                       | Status                                                                                                                                                                       | Files affected when decided                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Call status list (v0.2 "item C", 12 values, incl. `evaluation_failed`, `rejected`)                         | Not received; the five-value provisional list is unchanged                                                                                                                   | `wire/calls.ts`, `domain.ts` (`CallStatus`), `CallStatusBadge.tsx`, `ProcessingStatus.tsx`, mock `processing.ts` |
| Remove `queues` and `branding` routes (item 11)                                                            | Not done: agent queue assignment and runtime branding still call them; needs a UI decision (and conflicts with the repo rule that branding arrives from `GET /api/branding`) | `endpoints.ts`, `client.ts`, `BrandingProvider`, agents feature                                                  |
| Run role resolution replacing `channel_layout` (item 7, contract 2.4)                                      | Shape not defined; `channel_layout` and per-segment `speaker` kept as PROVISIONAL                                                                                            | `wire/calls.ts`, `wire/evaluations.ts`, `TranscriptView.tsx`, `CallDetailPage.tsx`                               |
| Evidence word span                                                                                         | Field names not defined; not decoded                                                                                                                                         | `wire/evaluations.ts`, `model/transcript.ts`                                                                     |
| `display_hundredths`, `points_*_sum`, `unit`, `below_threshold`, `threshold_hundredths` (contract 3.4–3.7) | Not in the change list; the float `overall_score` and points fields are unchanged                                                                                            | `wire/evaluations.ts`, `domain.ts`, `src/shared/i18n/format.ts`                                                  |
| Upload agent field                                                                                         | Contract §7 item 3 is OPEN; `agent_id` is sent from a selection list only (no new schema assumed)                                                                            | `client.ts` (`uploadCall`)                                                                                       |
| Re-score as `202 {job_id}` and job polling                                                                 | PROPOSED routes; the synchronous provisional response is unchanged                                                                                                           | `client.ts`, `useCallData.ts`                                                                                    |
| Error envelope `{"error": {...}}` (contract 5.4)                                                           | PROPOSED; the FastAPI `detail` mapping is unchanged                                                                                                                          | `src/shared/api/errors.ts`, `fieldIssues.ts`                                                                     |
| All other routes and field names                                                                           | PROVISIONAL (contract §5)                                                                                                                                                    | `endpoints.ts`, `wire/*.ts`                                                                                      |
| Overall "Not assessable — no score (<main reason>)"                                                        | Main-reason rule not defined; the outcome is shown without a reason                                                                                                          | `EvaluationPanel.tsx`                                                                                            |

## 5. Mock mode

The simulated backend mirrors the confirmed rules: one-time codes, CSRF on every
non-exempt route (403 otherwise), in-memory session, revision-linked runs, explicit outcomes,
reason codes and WAV-only uploads. Its scoring rule (0 assessable points → not assessable)
is a simulation only; real outcomes come from the API. All data stays synthetic and labelled.

## 6. Acceptance checklist

- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Live build contains no synthetic markers.
- [ ] `/launch#c=<code>` opens the session; the code never appears in a request or the address bar.
- [ ] Every `/api` request except the exchange, health and audio carries `X-Taqeef-CSRF`.
- [ ] A 401 returns to the launch screen with the session-ended notice.
- [ ] Scored, insufficient evidence and not assessable runs each show their own label; none shows a score it did not receive.
- [ ] Evidence highlights the referenced segment of the run's own transcript revision only.
