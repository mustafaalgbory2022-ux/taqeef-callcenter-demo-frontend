# Cloud Demo Stream 1 — handoff log

Branch `demo/ord-0035-cloud-stream-1`, created from the preserved ORD-0035 demo baseline
`860ffa9`. Demo scope only; Local Claude owns backend/API contracts and integration. Nothing
here is merged anywhere.

## Task 1 — branch setup and transcript search (call review)

**Setup.** Added demo-stream rules to `CLAUDE.md` (scope, Git ownership, ownership split,
60-minute limit, this handoff convention) and a one-line scope note to both review agents.

**Improvement.** The call review page's transcript gets a client-side search:

- Search box in the transcript toolbar; matching lines are outlined (plus hidden "matches
  search" text, never colour only); status "N matching lines" / "Match i of N" / "No matches"
  in a polite live region.
- Previous / Next buttons and Enter / Shift+Enter step through matches with wrap-around and
  scroll the line into view; "Follow playback" is switched off while navigating so playback does
  not pull the view away. Clicking a line still seeks the recording.
- Arabic-aware matching: ignores case, diacritics and tatweel, and unifies alef, alef maqsura
  and taa marbuta forms (e.g. "فاتوره" finds "فاتورة"). Minimum two characters.
- English and Arabic strings, RTL-safe layout (logical properties), axe-clean.

**API impact: none.** Uses only the transcript already returned by the existing
`GET /calls/{id}/transcript`; no new routes, fields or backend behaviour.

**Files changed**

- `src/features/calls/model/transcript.ts` — `normalizeForSearch`, `findTranscriptMatches`,
  `stepMatch` (pure, unit-tested)
- `src/features/calls/components/TranscriptView.tsx`, `TranscriptView.module.css` — search UI
- `src/shared/i18n/locales/{en,ar}.json` — `calls.transcript.*` search strings
- `src/features/calls/model/calls.test.ts`, `tests/e2e/calls.spec.ts` — tests
- `CLAUDE.md`, `.claude/agents/{a11y-reviewer,frontend-qa}.md`, `docs/demo-stream-1.md`

**Tests.** `npm run check` (typecheck, lint, format, **69 unit tests**) passes;
`npm run build` succeeds; `npm run test:e2e` **44 passed, 0 failed** (desktop + mobile, axe on
all demo pages in EN/AR × light/dark, including the call page with the new toolbar).

**Integration notes for Local Claude.** Self-contained frontend change in the `calls` feature;
copy the listed files. No dependency, CSP, route or contract change. Normalization is for
search only and never alters transcript text.

## Task 2 — evidence-to-transcript highlighting (call review)

**Behaviour.** Selecting an evidence quote (criterion evidence or a prohibited-expression hit)
locates it in the transcript using only existing evaluation fields (`segment_id`, `start_ms`,
`end_ms`, `quote`):

- **Located** when the cited segment exists **and** either the quote occurs in that line
  (same normalization as transcript search: case, diacritics, tatweel, alef/taa marbuta) or the
  evidence time falls within the line (±1 s). The line gets a thick outline, the quoted text a
  `<mark>` with underline (never colour only), hidden "Evidence line / Evidence quote" labels,
  and the recording plays from the evidence time. A status bar offers **Play from m:ss**,
  **Go to transcript line** (moves keyboard focus to the line) and **Clear evidence**. If only
  the time agrees, the whole line is marked and the bar says the exact quote is not in the text.
- **Evidence location unavailable** when the cited segment is missing or neither quote nor time
  matches. Nothing is highlighted or played; other lines are never searched for a similar quote.
- Feedback is announced through an always-mounted `role="status"` region. English and Arabic,
  RTL-safe. Transcript search, match navigation, follow playback and line seeking are unchanged.

**API impact: none.** No new routes or fields; no fixtures changed; no evidence fabricated.
Evaluation evidence callbacks now pass the existing evidence fields instead of only the time.

**Files changed**

- `src/features/calls/model/transcript.ts` — `normalizeWithMap` (index-preserving
  normalization; `normalizeForSearch` now built on it), `EvidenceRef`, `EvidenceLocation`,
  `locateEvidence`
- `src/features/calls/components/EvidenceStatus.tsx` (new), `TranscriptView.tsx`,
  `TranscriptView.module.css` — status bar, line and quote marking, scroll-into-view
- `src/features/calls/pages/CallDetailPage.tsx` — selection state, locate, play, clear
- `src/features/evaluations/components/CriterionResults.tsx`, `EvaluationPanel.tsx`,
  `src/features/evaluations/index.ts` — `EvidenceSelection` callback with existing fields
- `src/shared/i18n/locales/{en,ar}.json` — `calls.evidence.*`
- Tests: `src/features/calls/model/calls.test.ts` (locator + mapping),
  `src/features/calls/components/EvidenceStatus.test.tsx` (new; unavailable/located states),
  `tests/e2e/calls.spec.ts` (keyboard flow, mark = quote, play, focus, search coexistence,
  clear; Arabic + axe with the highlight active)

**Tests.** `npm run check` (typecheck, lint, format, **76 unit tests**) passes; `npm run build`
succeeds; `npm run test:e2e` **48 passed, 0 failed** (desktop + mobile).

**Limitations.** All synthetic evidence quotes equal their segment text, so the
"unavailable" and "time-only" paths are covered by unit and component tests rather than a
browser run on demo data. Matching relies on `segment_id`; if the backend later sends evidence
without segment ids, the state will be "unavailable" (by design) until a contract is agreed.

**Handoff for Local Claude.** Pull branch `demo/ord-0035-cloud-stream-1` (do not copy files into
your worktree by hand); the change is limited to the `calls` and `evaluations` features plus
locale strings. No dependency, CSP, route or contract change. Confirm the evidence fields
(`segment_id`, `start_ms`, `end_ms`, `quote`) in the final contract.

## Task 3a — review of `cloud-frontend-interface-v1.md` (Local Claude, 2026-11-04)

Compared against this branch at `132280e`. Labels follow the handoff: only **CONFIRMED** items
are treated as fixed; DESIGNED/PROVISIONAL/UNKNOWN items are recorded, not built against.
Nothing below was implemented in Task 3; each item waits for Local Claude's decision.

### Evidence fields (the specific question)

| Handoff (§6, DESIGNED)                                      | Demo frontend today                                                                                       | Finding                                                                                                                                                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Criterion results carry "evidence segment IDs"              | Evidence objects `{segment_id, start_ms, end_ms, quote}`; prohibited hits `{segment_id, start_ms, quote}` | **Mismatch.** Only segment IDs are promised; `start_ms`, `end_ms` and `quote` are not.                                                                                                                                        |
| Segment IDs `seg-0001…` in an immutable transcript revision | Opaque `s1…` ids, one transcript per call                                                                 | IDs are treated as opaque strings, so the format is fine. **Gap:** an evaluation run must name the transcript revision its segment IDs belong to, otherwise re-transcription could make evidence point at the wrong revision. |
| Evidence quotes keep the original Arabic (§2, CONFIRMED)    | Quote is shown as given; matching uses search normalization only for locating                             | Compatible.                                                                                                                                                                                                                   |

Effect on Task 2 (`locateEvidence`): if only segment IDs arrive, the adapter should build each
evidence item from the referenced segment of **the evaluated revision** (`start_ms`/`end_ms` from
the segment, `quote` = segment text). The locator then marks the whole line or the quote;
an ID that is missing from that revision shows "Evidence location unavailable". No UI change is
needed — only the wire mapper in `src/shared/api/wire/evaluations.ts`, once the contract is final.

### Other differences for Local Claude to decide

| #   | Area               | Handoff                                                                                                 | Demo today                                                                                           | Label                                                                                              |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Time format        | 24-hour (§2)                                                                                            | Arabic dates render 12-hour ("3:30 م"); English is 24-hour                                           | CONFIRMED → **frontend fix ready on approval** (`hourCycle: 'h23'` in `src/shared/i18n/format.ts`) |
| 2   | Dashboard          | No SLA, missed, abandoned (§8)                                                                          | Overview and agent pages show a PBX panel with Incoming/Missed/Abandoned/SLA as "Not available"      | CONFIRMED → remove the panel on approval                                                           |
| 3   | Score outcomes     | Scored / Insufficient evidence / **Not assessable — no score** (§7)                                     | `scored` / `insufficient_evidence` (+ failed); zero assessable points shows as insufficient evidence | CONFIRMED rule; wire value UNKNOWN                                                                 |
| 4   | Criterion result   | `met` / `partially_met` / `not_met` / `not_assessable`; points from app code (§6)                       | `scored` / `not_assessable` / `insufficient_evidence` with awarded points                            | DESIGNED                                                                                           |
| 5   | Per-criterion text | "2 of 3 points" (§7)                                                                                    | "2 / 3 pts"                                                                                          | CONFIRMED wording → string change on approval                                                      |
| 6   | AI label           | "AI-generated, preliminary, advisory" on AI text (§7)                                                   | Rationale shown as plain text without that label                                                     | CONFIRMED → add label on approval                                                                  |
| 7   | Speakers           | `agent` / `customer` / `unknown` + reliability                                                          | `agent` / `customer` / `unresolved`; reliability via `channel_layout: dual\|mixed`                   | DESIGNED                                                                                           |
| 8   | Channel map        | `left_agent` / `right_agent` / `none` on upload                                                         | Not collected on upload                                                                              | DESIGNED                                                                                           |
| 9   | Launch code        | One-time code in the **URL fragment** (§4)                                                              | Read from the query string `?launch_code=` and removed before routing                                | DESIGNED → small change in `src/app/session/launchCode.ts` on approval                             |
| 10  | CSRF               | CSRF header on state-changing requests                                                                  | Sends `X-CSRF-Token` from cookie `csrf_token` (names provisional)                                    | DESIGNED; names UNKNOWN                                                                            |
| 11  | Job states         | queued, probing, transcribing, evaluating, scored, failed, not-assessable                               | uploaded, transcribing, scoring, scored, failed                                                      | DESIGNED                                                                                           |
| 12  | Scorecard          | Rule text, enabled flag, speaker-roles flag, partial-credit levels; enabled total = 10; Save & Activate | Name/description/points/partial-credit boolean; each save creates a version                          | DESIGNED                                                                                           |
| 13  | Privacy            | Spoken digits masked in transcripts (§8)                                                                | Synthetic transcripts already avoid real digits; no masking logic in the UI                          | CONFIRMED → backend masks; UI must not unmask                                                      |
| 14  | API                | Resource groups only; paths/payloads UNKNOWN (§5)                                                       | Provisional adapter (`endpoints.ts`, `wire/*`)                                                       | No change until M4                                                                                 |

Already consistent: stack and no new packages; strict CSP and no external resources; "Open local
demo session" wording; truncated "x.xx / 10"; low score strictly below 7.00; minimum 6 of 10
assessable points; average = mean of per-call scores; no rankings; masked caller numbers; AI text
rendered as plain text; no invisible or bidi control characters in `src/` or `tests/`.

## Task 3b — audio-player keyboard shortcuts (call review)

**Behaviour.**

- **K** play/pause · **J** back 5 s · **L** forward 5 s · **P** move focus to the play button.
- Matched on the physical key (`KeyboardEvent.code`), so they work on Arabic keyboard layouts.
  J/L follow the media timeline, which stays left-to-right in both languages.
- Not triggered with Ctrl, Meta, Alt or Shift (browser and screen-reader shortcuts, and
  Alt+Shift language switching on Windows); not triggered while typing (inputs incl. transcript
  search, textareas, selects, contenteditable) or inside dialogs; holding K does not repeat.
  The seek slider and buttons keep their native keys.
- Feedback: polite live region ("Playing from 0:27", "Paused at 0:27", "Position 0:32");
  `aria-keyshortcuts` on the controls; the play button is described by the shortcut list.
- Instructions: a compact "Keyboard shortcuts" disclosure under the player (English/Arabic).
- Transcript search, evidence highlighting, seeking and follow playback are unchanged.

**API impact: none.**

**Files changed**

- `src/features/calls/model/shortcuts.ts` (new) — key mapping and typing/dialog guard
- `src/features/calls/components/AudioPlayer.tsx`, `AudioPlayer.module.css` — listener,
  announcements, `aria-keyshortcuts`, shortcut guide
- `src/shared/i18n/locales/{en,ar}.json` — `calls.player.*` shortcut strings
- Tests: `src/features/calls/model/shortcuts.test.ts` (new), `tests/e2e/calls.spec.ts`
- `docs/demo-stream-1.md`

**Tests.** `npm run check` (typecheck, lint, format, **79 unit tests**) passes; `npm run build`
succeeds; `npm run test:e2e` **52 passed, 0 failed** (desktop + mobile; axe on all demo pages, EN/AR × light/dark).

**Handoff for Local Claude.** Pull `demo/ord-0035-cloud-stream-1`; do not hand-copy files. The
shortcut change is limited to the `calls` feature and locale strings, with no dependency, CSP,
route or contract change. Please answer findings 1–6 and 9 (frontend-only, ready to implement
on approval) and confirm the evidence shape and transcript revision reference above.

## Task 4 — confirmed frontend mismatches from the handoff review

Implements the frontend-only items from Task 3a (findings 1, 2, 5 and 6, plus the
presentation part of 3). Nothing backend-dependent, no new API fields, no dependency change.

**Completed fixes**

1. **24-hour time** in English and Arabic: `hourCycle: 'h23'` in the shared date-time formatter
   (Arabic previously showed "3:30 م").
2. **PBX metrics removed** from the overview and agent pages (incoming, missed, abandoned, SLA
   panel, its strings and styles). Nothing is derived from recordings. The future-scope text in
   the "planned areas" list still mentions PBX ingestion as a later production area.
3. **Readable points**: "2 of 3 points" / "1 of 1 point", "Penalty applied: 1 point deducted",
   "+1 point" deltas, "deduct 2 points from …" in scorecard history. Arabic avoids
   number-agreement errors by putting the count after a label, e.g. "النقاط: 2 من 3",
   "طُبّق خصم — النقاط المخصومة: 1", "فرق النقاط: +1".
4. **AI label**: every criterion explanation shows a visible text label "AI-generated,
   preliminary, advisory" / "مُولَّد بالذكاء الاصطناعي، أوّلي، استشاري" (icon + bordered
   text, not colour only). Explanations remain plain text. A non-scored criterion without an
   explanation shows "No reason was provided for this result." instead of nothing.
5. **No-score presentation** (from existing fields only, `src/features/evaluations/model/outcome.ts`):

   | Situation (existing data)                                  | Shown as                                                                                           |
   | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
   | `outcome = scored`, score present                          | "x.xx / 10" (truncated)                                                                            |
   | `outcome = insufficient_evidence`, `assessable_points` > 0 | "Insufficient evidence — No score" with "N of M points could be assessed; at least K are required" |
   | `outcome = insufficient_evidence`, `assessable_points` = 0 | "Not assessable — No score" with "No criterion could be assessed"                                  |
   | `status = failed`                                          | "Failed — no result"                                                                               |
   | Criterion `not_assessable`                                 | "Not assessable" badge plus the stated reason (or "No reason was provided")                        |
   | Criterion `insufficient_evidence`                          | "Insufficient evidence" badge                                                                      |

   No score is assigned or estimated. All no-score evaluations stay excluded from averages and
   low-score counts (unchanged). The list view keeps a single "No score" badge.

**Files changed**

- `src/shared/i18n/format.ts`
- `src/features/dashboard/pages/OverviewPage.tsx`, `AgentPerformancePage.tsx`,
  `components/Dashboard.module.css`; deleted `components/PbxPanel.tsx`
- `src/features/evaluations/model/outcome.ts` (new), `components/ResultValue.tsx`,
  `components/EvaluationPanel.tsx`, `components/CriterionResults.tsx`,
  `components/Evaluation.module.css`, `index.ts`
- `src/features/scorecards/components/VersionHistory.tsx`
- `src/shared/i18n/locales/{en,ar}.json`
- Tests: `src/features/evaluations/model/outcome.test.ts` (new),
  `src/features/evaluations/components/ResultValue.test.tsx` (new),
  `src/shared/i18n/translate.test.ts`, `tests/e2e/{dashboard,admin,calls}.spec.ts`

**Tests.** `npm run check` (typecheck, lint, format, **84 unit tests**) passes; `npm run build`
succeeds; `npm run test:e2e` **56 passed, 0 failed** (desktop + mobile; axe on all demo pages, EN/AR × light/dark). Transcript search, evidence highlighting and the
audio shortcuts are covered by the unchanged tests.

**Limitations.**

- "Not assessable — No score" is covered in the browser by the synthetic upload flow (a
  mixed-channel recording with zero assessable points, previously labelled "Insufficient
  evidence"), plus unit and component tests. DEMO-004 still shows "Insufficient evidence — No
  score" (4 of 10 points assessable).
- "Not assessable" is inferred from `assessable_points = 0`. When the contract adds an explicit
  outcome value, the mapping in `outcome.ts` should use it instead.
- Arabic point phrasing is deliberately label-first; a native reviewer should confirm wording.

**Contract questions for Local Claude (unchanged items left as they are)**

1. **Evidence must reference a transcript revision.** Each evaluation run (or each evidence
   item) needs the id of the immutable transcript revision its segment ids belong to; otherwise
   evidence can point at the wrong text after re-transcription.
2. **Evidence may arrive as segment ids only.** After the contract is final, the API adapter
   (`src/shared/api/wire/evaluations.ts`) can enrich each id with `start_ms`, `end_ms` and the
   segment text from that revision. No ids, timestamps, quotes or fields have been invented; the
   current provisional wire shape is unchanged.
3. Exact wire values for "Not assessable — no score" and for criterion states
   (`met` / `partially_met` / `not_met` / `not_assessable`).
4. Launch-code location (query vs fragment), CSRF header/cookie names and all routes remain
   provisional and **unchanged** pending confirmation.

## Task 5 — integration readiness for Local Claude

**Scope.** Audit of the API adapter boundary, outcome presentation and synthetic-data
usability. No endpoints, schemas, backend, database or AI engine were created or changed.
The full integration handoff is in `docs/demo-integration-handoff.md`.

**Defects found and fixed (independently verifiable).**

1. **Live build bundled the mock backend.** `VITE_API_MODE=live` builds still contained the
   simulated backend and synthetic fixtures (`taqeef.mock.db`, "Synthetic administrator",
   `DEMO-001`). The runtime is now selected at build time (`src/shared/api/runtime/`, Vite alias
   in `vite.config.ts`); a lint rule forbids importing the mock outside the runtime, and
   `src/test/liveBundle.test.ts` builds both modes and asserts the live bundle and its source
   maps contain no mock code.
2. **Failed runs were labelled "No score" in the evaluation history.** Failed, not assessable,
   insufficient evidence and scored runs now have distinct labels
   (`EvaluationHistory.tsx`, via `resultPresentation`).
3. **The calls list showed one generic "No score" for both no-score kinds.** A not-assessable
   call now reads "No score — not assessable" (`CallsTable.tsx`, new key
   `calls.table.noScoreNotAssessable` in EN/AR); insufficient evidence keeps its own label.

**Outcome distinctness (confirmed).** Scored → points and score; insufficient evidence
(1–5 assessable points) → "Insufficient evidence — No score"; not assessable (0 assessable
points) → "Not assessable — No score"; failed → "Failed", never a score. No path renders a
0 or an estimated score for a no-score outcome; failed runs are excluded from current results.

**Validation.** `npm run check` (typecheck, lint, format, 87 unit tests incl. the live/mock
bundle test) and `npm run test:e2e` (56 passed: desktop + mobile, EN/AR × light/dark with axe,
transcript search incl. Arabic variants, evidence highlighting, audio shortcuts, upload flow
with the new not-assessable list label).

## Task 6 — confirmed v0.2 frontend changes (Stream 6)

**Inputs.** Local Claude's frontend change list v0.2 and demo API contract v0.1 (the v0.2
contract was not received). Details and the open decisions are in
`docs/demo-integration-handoff.md` §3–§4.

**Implemented.** Launch code in the URL fragment with `POST /api/session/exchange`;
`X-Taqeef-CSRF` on every API request (GET included) with the token held in memory; session end
on any 401 without re-exchange; explicit `not_assessable` run outcome (no failed runs);
criterion results `met`/`partially_met`/`not_met`/`not_assessable` with reason codes and the
AI-declared reason (EN/AR); transcript revision identity (UUIDv7) and `seg-NNNN` segment ids;
evidence as segment references resolved only against the run's own revision (times and text
never from model output); `unknown` speaker; audio from the protected call audio route; upload
with `display_name`, optional `channel_map`, `request_id`, WAV only up to 100 MB.

**Removed behaviour.** Quote-level `<mark>` highlighting inside a line (evidence now has no
quote; the whole referenced line is highlighted). Query-string launch codes. Session survival
across reloads.

**Tests.** 94 unit/component/mock-integration tests (new: session exchange and CSRF on GET,
401 session end, ID format rejection, explicit outcome decoding, mock CSRF enforcement,
revision-linked evidence, reason labels, WAV-only validation) and 60 Playwright tests
(desktop + mobile, EN/AR × light/dark with axe, transcript search, evidence highlighting,
playback shortcuts, fragment launch, query code ignored, reload needs a new code).

## Task 7 — demo API contract v0.2 alignment (Stream 7)

**Implemented** (details in `docs/demo-integration-handoff.md` §4): the call page loads the
transcript revision of the displayed run; structured error envelope without server text; the
12 call statuses and 7 job states; UTC `…sssZ` timestamps enforced; optional `display_name`
with agent by id; scorecard draft/activate/versions routes; queue and branding routes removed
(static branding; branch-local instructions updated); ids treated as opaque.

**Deferred** (handoff §5): job-summary polling and per-run speaker roles (payloads not
defined), UUIDv7 for mock call/agent ids (awaiting confirmation).

**Tests.** 110 unit/component/mock-integration tests and 64 Playwright tests (desktop +
mobile, EN/AR × light/dark with axe, transcript search, evidence, shortcuts, upload pipeline
steps and final status, run-revision display in EN/AR).

## Task 8 — contract v0.2.1 reconciliation (Stream 8)

**Inputs (all four received and read):** `demo-api-contract-v0.2.md`,
`demo-api-contract-v0.2.1.md`, `cloud-frontend-changes-v0.2.md`,
`cloud-alignment-note-v0.2.1.md`.

**Implemented** (handoff §5): agents can only be created or retired, with names unique after
normalization and no reuse; upload requires an active agent, with the three agent rejection
reasons; agent display name on calls; agent names removed from page titles and from mock audit
records; the overview's comparative per-agent table was replaced by links only, while the agent
page keeps that agent's own average ("Based on N calls"); all ids are opaque; session resume via
`GET /api/session` with exactly four CSRF exemptions and same-origin fetch mode; the newest
scorecard version is no longer presented as active.

**Remaining gaps:** handoff §6 (session-resume body, active-version reporting, provisional agent
fields and history route, `display_hundredths`, job polling, speaker roles).

**QA.** `npm run check` passed: typecheck, lint, format and 115 unit/component/mock-integration
tests, including the live-bundle exclusion test. `npm run test:e2e` passed: 66 Playwright tests
(desktop + mobile, EN/AR × light/dark with axe, transcript search, evidence, shortcuts, reload
resume, retire flow, no comparative agent figures, generic agent page title).

## Task 9 — score presentation from display_hundredths (Stream 9)

**Sources:** contract v0.1 3.4, 3.6 and 3.7 (CONFIRMED), the alignment note v0.2.1 §B, and interface v1 §7–8. The
score field shape and semantics are fully documented, so nothing was invented.

**Implemented** (handoff §5a): every evaluation score renders from the backend's integer
`display_hundredths` with integer-only formatting (no float arithmetic, no rounding); low-score flags and counts use the backend's
`below_threshold`; the float `overall_score` is no longer read; averages are the exact mean of
ratios (rational arithmetic, truncated), never a mean of displayed scores; no score for unscored
runs; mock payloads carry the new fields. Also fixed an evidence-while-loading message race.

**Gaps:** handoff §6 (contract 3.5 point-field names and half-point `unit`; normalized
criterion figures; `threshold_hundredths` display).

**QA.** `npm run check`: typecheck, lint, format and 126 unit/component/mock-integration tests
passed (new: hundredths formatting EN/AR, range and integer validation, presence-iff-scored,
`overall_score` ignored, exact mean versus mean of truncated scores, backend low flag kept
after threshold changes, still-loading evidence). `npm run test:e2e`: 68 passed (new: score
rendered from `data-hundredths` on call detail and the calls list).

## Task 10 — scoring-data alignment and aggregation checks (Stream 10)

**Sources:** contract v0.1 3.2, 3.5, 3.7 and 4.6 (CONFIRMED).

**Implemented** (handoff §5b): unit-based point fields (`points_awarded_sum`,
`points_possible_sum`, `unit`, criterion `units_awarded` / `units_possible`) with half-point
display; integrity checks including `display_hundredths = floor(1000·A/P)`; one run per call
with the selected version applied first; KPI threshold labels from the runs' own thresholds;
criterion figures labelled as a provisional browser visualization with no threshold applied.
`display_hundredths` remains the only source for evaluation scores and `below_threshold` the
only source for low flags.

**Behaviour change:** filtering the dashboard by a scorecard version now counts each call's run
on THAT version (for example DEMO-003's v1 run when its newest run is v2), instead of dropping
calls whose newest run is on another version.

**Open:** Active version not reported; "latest Scored run" fallback ambiguity (handoff §6).

**QA.** `npm run check`: 131 unit/component/mock-integration tests passed (new: half-point
units and display, missing/inconsistent point fields, `display_hundredths` integrity, exact
mean across units, multiple runs without double counting, version-first population, run
thresholds versus the current scorecard). `npm run test:e2e`: 68 passed.

## Task 11 — contract v0.3 r2 alignment, first checkpoint (Stream 11)

**Inputs (both read in full):** `demo-api-contract-v0.3.md` (r2, owner-authorized Cloud handoff;
routes not frozen) and the updated `cloud-alignment-note` (adds §A5, §C2, §C3).

**Implemented** (handoff §5c): server-computed dashboard with the §11.2 single/mixed threshold
rules (browser aggregation removed), active scorecard version from `status`, evidence
excerpts with separate "Excerpt truncated" indicator, explanation truncation indicator,
three-part error codes, v0.3 agent and upload refusal reasons, v0.3 session-ended wording.
Fixed a mobile RTL overflow found by the browser suite.

**Not yet done:** the wider v0.3 payload renames (agents, calls, runs, hits, transcripts, lists,
jobs, scorecard draft); exact list in handoff §6.

**QA.** `npm run check`: 124 unit/component/mock-integration tests passed (new: dashboard
decoding and threshold-mode consistency, mock server aggregation by scope/version/agent,
single active version after activation, excerpt indicators EN/AR, three-part error codes).
`npm run test:e2e`: 68 passed (new: no horizontal overflow after evidence selection, mobile AR).

## Task 12 — contract v0.3 r4: agents, lists and session (Stream 12)

**Inputs (all three read):** `README-handoff.md`, `demo-api-contract-v0.3.md` (r4: edit routes
#39–#41, `?view=edit` removed, `edit_value_masked` write refusal) and the updated
`cloud-alignment-note.md`.

**Completed** (handoff §5d): v0.3 agent object and lifecycle (create/retire only; extension and
history removed); create/retire bodies and all refusal reasons; masked-value write guard;
active-only upload choices with retired agents kept in history views; `{items, truncated}` list
shape everywhere; session reviewed against §3 (no change needed).

**Deferred** (handoff §6): call object and hide/restore (started, then reverted to keep the
checkpoint tested), edit routes #39–#41, runs, hits, transcripts, jobs, scorecard draft.

**QA.** `npm run check`: 126 unit/component/mock-integration tests passed (new: v0.3 agent
decoding, retire body, list shape incl. bare-array rejection, simulated name rules incl. Arabic
spelling variants and `edit_value_masked`). `npm run test:e2e`: 70 passed (new: retired agent
leaves upload choices but stays in call list, filter and agent page; masked-token refusal).

## Task 13 — call adapter and hide/restore, contract v0.3 r4 (Stream 13)

**Completed** (handoff §5e): v0.3 call object everywhere (list, detail, upload handling, mock
fixtures); obsolete call fields removed; agent identity from the call itself; rejection reasons;
channel-based speaker notice; soft delete and restore with request ids; hidden calls excluded by
default (lists and simulated dashboard); simulated replay protection.

**Ambiguities documented, not invented** (handoff §5e): repeated hide or restore with a new
request id, hidden-call detail reads, a list toggle for hidden calls, `latest_job` display.

**QA.** `npm run check`: 130 unit/component/mock-integration tests passed (new: v0.3 call
decoding and consistency, absence of obsolete fields, hide/restore bodies with fresh request ids,
soft delete keeps runs and transcripts, dashboard exclusion, replay without a repeated side
effect, request-id conflict, CSRF on DELETE, missing request id). `npm run test:e2e`: 74 passed
(new: hide → excluded from the list → restore; Arabic wording).

## Task 14 — runs, transcripts and hits, contract v0.3 r4 (Stream 14)

**Completed** (handoff §5f): separate run history and run detail routes; v0.3 run, criterion,
evidence, hit, review-flag and segment-role fields; v0.3 segments and revision list; speaker
roles from the selected run on its own revision; hits shown by location without excerpts;
mock serializers to the v0.3 shapes.

**Gaps** (handoff §5f): phrase text lookup, word-span highlighting, undecoded run metadata,
review-flag actions, compare route, re-score job response.

**QA.** `npm run check`: 134 unit/component/mock-integration tests passed (new: run summary and
detail decoding incl. roles, hits, flags and counts; revision-mismatch, level-id, 0-of-0 and
override rules; separate routes; mock history order, per-run roles, hits without excerpts).
`npm run test:e2e`: 76 passed (new: speaker roles from the run, Preliminary label and counts).

## Proposed next tasks (prioritized, client-only unless noted)

1. On approval: launch code in the URL fragment (Task 3a finding 9).
2. Print-friendly call review layout (CSS `@media print`), for management handouts.
3. Needs Local Claude: confirmed transcript/segment fields before any speaker-correction UI.
