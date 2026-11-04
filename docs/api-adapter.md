# API adapter (FastAPI integration)

Status: **PROVISIONAL.** Routes, payload field names and units are frontend assumptions,
not a finalized contract. All of them are confined to `src/shared/api/`; components,
models and tests elsewhere use only domain types (`src/shared/types/domain.ts`).

## Provisional assumptions (single place to change each)

| Assumption                      | Current value                                          | Change in                                           |
| ------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Base path                       | same-origin `/api`                                     | `src/shared/api/config.ts`                          |
| Routes                          | table below                                            | `src/shared/api/endpoints.ts`                       |
| Wire casing                     | snake_case JSON                                        | `src/shared/api/wire/*.ts`                          |
| Time unit for offsets/durations | milliseconds                                           | `WIRE_TIME_UNIT` in `src/shared/api/wire/common.ts` |
| Datetimes                       | ISO-8601 with offset                                   | `src/shared/api/wire/*.ts`                          |
| Agent / call / evaluation ids   | opaque strings                                         | — (never parsed)                                    |
| CSRF                            | cookie `csrf_token` → header `X-CSRF-Token` on non-GET | `src/shared/api/config.ts`                          |
| Launch code                     | URL `launch_code` → `POST /session/launch`             | `config.ts`, `endpoints.ts`                         |
| Channel layout field            | `channel_layout: "dual" \| "mixed"` on calls           | `src/shared/api/wire/calls.ts`                      |
| Queue identity                  | `{ id, number: "6001" \| "6002", name }`               | `src/shared/api/wire/agents.ts`                     |
| Caller number                   | `caller_masked` only (masked by the backend)           | `src/shared/api/wire/calls.ts`                      |
| PBX durations                   | seconds (`*_s` fields)                                 | `src/shared/api/wire/operations.ts`                 |
| Evaluation call date            | `call_recorded_at` on evaluations                      | `src/shared/api/wire/evaluations.ts`                |
| Reporting week                  | Saturday–Friday (`WEEK_START_DAY`)                     | `src/shared/utils/dates.ts`                         |

## Endpoints (`src/shared/api/endpoints.ts`)

| Method     | Path                                                                                               | Request (wire)                                      | Response (wire)                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| GET        | `/session`                                                                                         | —                                                   | `Session` · 401 → launch screen                                           |
| POST       | `/session/launch`                                                                                  | `{ launch_code }`                                   | `Session` · 401/422 → "code rejected"                                     |
| GET        | `/branding`                                                                                        | —                                                   | `Branding` (all fields nullable)                                          |
| GET        | `/queues`                                                                                          | —                                                   | `Queue[]`                                                                 |
| GET        | `/agents`                                                                                          | —                                                   | `Agent[]`                                                                 |
| POST       | `/agents`                                                                                          | `{ display_name, extension, status, queue_ids }`    | `Agent`                                                                   |
| PATCH      | `/agents/{id}`                                                                                     | any subset of the above                             | `Agent`                                                                   |
| GET        | `/agents/{id}/history`                                                                             | —                                                   | `AuditEntry[]`                                                            |
| GET        | `/calls?from=&to=&queue_id=&agent_id=&reason=&score_band=&review_status=&search=&page=&page_size=` | —                                                   | `{ items: Call[], total, page, page_size }` (newest first)                |
| GET        | `/calls/{id}`                                                                                      | —                                                   | `Call`                                                                    |
| POST       | `/calls`                                                                                           | multipart: `file`, `title`, `agent_id`              | `Call` (status `uploaded`)                                                |
| GET        | `/calls/{id}/transcript`                                                                           | —                                                   | `Transcript` · 409 while not ready                                        |
| POST       | `/calls/{id}/rescore`                                                                              | —                                                   | `Evaluation` (new, immutable)                                             |
| GET        | `/evaluations?call_id=&agent_id=`                                                                  | —                                                   | `Evaluation[]` (full history)                                             |
| GET        | `/scorecards/current`                                                                              | —                                                   | `ScorecardVersion`                                                        |
| GET        | `/scorecards/versions`                                                                             | —                                                   | `ScorecardVersion[]`                                                      |
| POST       | `/scorecards/versions`                                                                             | draft (below)                                       | `ScorecardVersion` (version n+1)                                          |
| PUT        | `/calls/{id}/review`                                                                               | `{ status, note }`                                  | `Call`                                                                    |
| GET        | `/evaluations?…&from=&to=&queue_id=`                                                               | —                                                   | date/queue filters by call                                                |
| GET        | `/pbx/metrics?from=&to=&queue_id=`                                                                 | —                                                   | `{ simulated, queue_daily[], agent_daily[] }`                             |
| GET        | `/live/status`                                                                                     | —                                                   | `{ generated_at, simulated, queues[], agents[], calls[] }`                |
| GET        | `/insights/classifications?from=&to=&queue_id=&agent_id=`                                          | —                                                   | `InsightRow[]`                                                            |
| POST       | `/reports/audio-sample`                                                                            | `{ agent_ids, from, to, count, min_duration_ms }`   | `{ seed, simulated, agents: [{ agent_id, requested, eligible, calls }] }` |
| GET / POST | `/reports`                                                                                         | `{ title, period, from, to, queue_ids, agent_ids }` | `Report[]` / `Report`                                                     |
| POST       | `/reports/{id}/email`                                                                              | —                                                   | `Report` (email status)                                                   |

## Wire shapes (decoders in `src/shared/api/wire/`)

```jsonc
// Call — channel_layout decides whether speaker attribution is reliable
{ "id": "DEMO-001", "title": "…", "agent_id": "agt-001", "queue_id": "q-billing", "language": "ar|en|mixed",
  "duration_ms": 78000, "recorded_at": "ISO-8601", "status": "uploaded|transcribing|scoring|scored|failed",
  "audio_url": "/api/…", "synthetic": true, "simulated": false, "source": "fixture|upload", "channel_layout": "dual|mixed" }

// Transcript — speaker stays "unresolved" until supported by evidence (e.g. mixed channel)
{ "call_id": "…", "segments": [{ "id": "s1", "start_ms": 500, "end_ms": 6000, "speaker": "agent|customer|unresolved", "language": "ar|en", "text": "…" }] }

// ScorecardVersion (draft = name, low_score_threshold, minimum_assessable_points, criteria,
// prohibited_expressions, prohibited_penalty, change_note)
{ "scorecard_id": "sc-quality", "version": 1, "name": { "en": "…", "ar": "…" },
  "low_score_threshold": 7, "minimum_assessable_points": 6,
  "criteria": [{ "id": "c-greeting", "label": { "en", "ar" }, "description": { "en", "ar" }, "max_points": 1, "allow_partial_credit": true }],
  "prohibited_expressions": [{ "id": "px-1", "phrase": "…", "language": "ar|en" }],
  "prohibited_penalty": { "points": 0, "criterion_id": null },   // 0 = flag for review only
  "created_at": "…", "created_by": "…", "change_note": "…" }

// Evaluation — actual points; overall_score only when outcome = "scored"
{ "id": "…", "call_id": "…", "agent_id": "…", "scorecard_id": "…", "scorecard_version": 1,
  "status": "completed|failed", "outcome": "scored|insufficient_evidence|null",   // null only when failed
  "awarded_points": 9, "assessable_points": 10, "possible_points": 10, "minimum_assessable_points": 6,
  "overall_score": 9.0,                                            // null when insufficient_evidence
  "criteria": [{ "criterion_id": "c-resolution", "result": "scored|not_assessable|insufficient_evidence",
                 "awarded_points": 3, "possible_points": 3, "penalty_points": 0, "rationale": "…",
                 "evidence": [{ "segment_id": "s5", "start_ms": 29000, "end_ms": 42000, "quote": "…" }] }],
  "prohibited_hits": [{ "expression_id": "px-1", "phrase": "…", "segment_id": "s5", "start_ms": 27000, "quote": "…",
                        "speaker": "agent|customer|unresolved", "disposition": "penalty_applied|flagged_for_review", "penalty_points": 0 }],
  "trigger": "initial|rescore", "supersedes_id": "…|null", "created_at": "ISO-8601", "simulated": false }
```

Session, Agent, AuditEntry, Queue and Branding shapes are unchanged from the previous
revision (see `src/shared/api/wire/{session,agents,branding}.ts`).

## Scoring contract the frontend expects (backend is authoritative)

- `awarded_points` per criterion are actual points (whole numbers; all-or-nothing when
  `allow_partial_credit` is false), after any applied penalty (`penalty_points`).
- `assessable_points` = Σ `possible_points` of criteria with `result = "scored"`.
- If `assessable_points < minimum_assessable_points` → `outcome = "insufficient_evidence"`,
  `overall_score = null`. Otherwise `overall_score = awarded_points / assessable_points × 10`
  (sent unrounded; the UI floors to two decimals).
- Prohibited expressions: `penalty_applied` only when the scorecard version has
  `prohibited_penalty.points > 0`, the hit is reliably attributed to the agent
  (`channel_layout = "dual"` and agent speaker), and the target criterion was scored and still
  has points to deduct; otherwise `flagged_for_review` with `penalty_points = 0`. The hits'
  `penalty_points` sum equals the target criterion's `penalty_points`. A penalty may only
  target a criterion that allows partial credit.
- Failed evaluations: `status = "failed"`, `outcome = null`, `overall_score = null` — shown as
  "Failed", never as insufficient evidence.
- The decoder rejects inconsistent data (`contract_mismatch`): scores outside 0–10, a scored
  criterion without points, awarded > possible, or `overall_score` present iff not `scored`.

## Errors (`src/shared/api/errors.ts`)

| Backend                                                       | Frontend                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `{"detail": "text"}`                                          | `ApiError(code by status, message = text)`                                                             |
| 422 `{"detail": [{"loc": ["body","extension"], "msg": "…"}]}` | `validation_error`; first field after `body` mapped to the form; unmapped issues shown as a form error |
| 401 / 403 / 404 / 409 / 5xx                                   | `unauthorized` / `forbidden` / `not_found` / `conflict` / `server_error`                               |
| network failure / decoder failure                             | `network_error` / `contract_mismatch`                                                                  |

## Mock vs live

The simulated backend (`src/shared/api/mock/`) implements the same transport and wire
format, always labelled as simulated. The mode is chosen at build time: `@/shared/api/runtime`
resolves to `runtime/live.ts` (fetch transport only) when `VITE_API_MODE=live`, so mock code
and synthetic data are not part of the live bundle (guarded by `src/test/liveBundle.test.ts`). The real backend performs transcription, scoring,
re-scoring and persistence.

## Aligning with the confirmed contract

1. Update `endpoints.ts`; 2. adjust decoders/mappers in `wire/*.ts` (names, units);
2. run `npm run check`; 4. run the e2e suite against `VITE_API_MODE=live`.

## Phase B administration adapters (PROVISIONAL)

Each area is a separate typed adapter on `ApiClient` (`api.audit`, `api.queueAdmin`, `api.ai`,
`api.dictionary`, `api.pbx`, `api.notifications`, `api.reportSettings`), defined in
`src/shared/api/adapters/` with decoders in `src/shared/api/wire/{admin,ai,dictionary,pbx,notifications,reportSettings}.ts`.
Any adapter can be replaced on its own. Conventions shared by all of them:

- **Validation:** 422 `{"detail":[{"loc":["body","<field>"],"msg":"…"}]}`; the field names the
  forms map are listed in each feature's `*_SERVER_FIELD` table.
- **Confirmation:** destructive or data-scope changes carry `confirm: true`; without it the
  server answers 409 (queue renumber/disable, agent removal, PBX start date/queue removal,
  ingestion on/off).
- **Secrets are write-only:** `secret` / `client_secret` are sent only when replaced; responses
  expose `credential_set` and `credential_updated_at`, never the value; audits never log it.
- **Versions are immutable:** AI configuration, dictionary entries, templates and report
  settings return a new `version` on every save; 409 when nothing changed.
- **Simulated flags:** responses carry `simulated` (mock) — live responses must send `false`.

| Method             | Path                                                                               | Request (wire)                                                                                                                                                                                                                                                                                | Response (wire)                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET                | `/admin/audit?resource=&resource_id=`                                              | —                                                                                                                                                                                                                                                                                             | `AdminAudit[]` (`resource, resource_id, action, actor, at, summary, changes[], simulated`) newest first |
| POST               | `/queues`                                                                          | `{ number, name: {en, ar}, description }`                                                                                                                                                                                                                                                     | `Queue` (+ `status, description, synthetic, created_at, updated_at`)                                    |
| PATCH              | `/queues/{id}`                                                                     | subset + `status`, `confirm`                                                                                                                                                                                                                                                                  | `Queue` · 409 without `confirm` when renumbering/disabling                                              |
| PUT                | `/queues/{id}/agents`                                                              | `{ agent_ids, confirm }`                                                                                                                                                                                                                                                                      | `Queue` · 409 when removing without `confirm`; 422 adding to a disabled queue                           |
| GET                | `/ai/models`                                                                       | —                                                                                                                                                                                                                                                                                             | `[{ id, kind, name, version, size_gb, min_vram_gb, languages, status, synthetic }]`                     |
| GET                | `/ai/status`                                                                       | —                                                                                                                                                                                                                                                                                             | `{ generated_at, simulated, config_version, services: [{ kind, state, model_id, message }] }`           |
| GET                | `/ai/config/current`, `/ai/config/versions`                                        | —                                                                                                                                                                                                                                                                                             | `AiConfig` / `AiConfig[]` (newest first)                                                                |
| POST               | `/ai/config/versions`                                                              | draft: models, `language`, `diarization`, `apply_dictionary`, `temperature`, `min_classification_confidence`, `low_confidence_action`, `require_evidence_quotes`, `scorecard_binding`, `pinned_scorecard_version`, `limits{…}`, `prompts{evaluation, classification, summary}`, `change_note` | `AiConfig` (version n+1); prompt issues reported as `prompt_<kind>`                                     |
| GET                | `/ai/jobs`                                                                         | —                                                                                                                                                                                                                                                                                             | `{ paused, simulated, jobs: [{ id, call_id, stage, state, attempts, created_at, updated_at, error }] }` |
| POST               | `/ai/jobs/pause`, `/ai/jobs/resume`, `/ai/jobs/{id}/retry`, `/ai/jobs/{id}/cancel` | —                                                                                                                                                                                                                                                                                             | job queue · 409 when not allowed (retry limit, state)                                                   |
| GET                | `/dictionary/entries?search=&kind=&status=`                                        | —                                                                                                                                                                                                                                                                                             | `DictionaryEntry[]` (search matches the normalized form)                                                |
| POST / PATCH       | `/dictionary/entries`, `/dictionary/entries/{id}`                                  | `{ kind, term, variants, standard, meaning_en, notes, change_note }` or `{ status, change_note }`                                                                                                                                                                                             | `DictionaryEntry` (version n+1)                                                                         |
| GET                | `/dictionary/entries/{id}/versions`                                                | —                                                                                                                                                                                                                                                                                             | immutable snapshots, newest first                                                                       |
| GET / POST         | `/dictionary/corrections?status=`                                                  | `{ call_id, segment_id, heard, proposed, kind }`                                                                                                                                                                                                                                              | `Correction[]` / `Correction`                                                                           |
| POST               | `/dictionary/corrections/{id}/review`                                              | `{ decision, note, add_to_dictionary }`                                                                                                                                                                                                                                                       | `Correction` · 403 own proposal · 409 already reviewed                                                  |
| GET                | `/pbx/vendors`, `/pbx/connectors`                                                  | —                                                                                                                                                                                                                                                                                             | vendor adapters / connectors (`settings` is a flat vendor-specific map)                                 |
| PUT                | `/pbx/connectors/{id}`                                                             | `{ name, settings, queue_ids, ingestion_start_date, poll_interval_minutes, secret?, confirm }`                                                                                                                                                                                                | `PbxConnector`                                                                                          |
| POST               | `/pbx/connectors/{id}/test`                                                        | —                                                                                                                                                                                                                                                                                             | `{ ok, simulated, checked_at, steps: [{ step, result: passed                                            | failed                                                                               | skipped, message }] }` |
| PUT                | `/pbx/connectors/{id}/enabled`                                                     | `{ enabled, confirm }`                                                                                                                                                                                                                                                                        | `PbxConnector` · 409 when not configured                                                                |
| GET / POST         | `/pbx/connectors/{id}/syncs`                                                       | `{ from, to }`                                                                                                                                                                                                                                                                                | `SyncRun[]` / `SyncRun` (range ≥ start date, ≤ today, ≤ 92 days)                                        |
| GET / PUT          | `/notifications/sender`                                                            | `{ sender_address, display_name, tenant_id, client_id, reply_to, client_secret? }`                                                                                                                                                                                                            | `EmailSender`                                                                                           |
| POST               | `/notifications/sender/test-connection`, `/notifications/sender/test-email`        | — / `{ to }`                                                                                                                                                                                                                                                                                  | test result / `Delivery` · 409 when not configured                                                      |
| GET / POST / PATCH | `/notifications/rules`, `/notifications/rules/{id}`                                | `{ name, trigger, enabled, threshold_mode, custom_threshold, queue_ids, recipients, delivery, template_id }`                                                                                                                                                                                  | `NotificationRule`                                                                                      |
| POST               | `/notifications/rules/{id}/test`                                                   | —                                                                                                                                                                                                                                                                                             | `Delivery` · 409 when no call matches                                                                   |
| GET / PUT          | `/notifications/templates`, `/notifications/templates/{id}`                        | `{ name, language, subject, body, change_note }`                                                                                                                                                                                                                                              | `EmailTemplate` (version n+1)                                                                           |
| GET / PUT          | `/notifications/report-email`                                                      | `{ recipients, cc, include_queue_report, include_agent_report, include_audio_sample, attach_excel, language, template_id }`                                                                                                                                                                   | `ReportEmailOptions`                                                                                    |
| GET                | `/notifications/deliveries?kind=`                                                  | —                                                                                                                                                                                                                                                                                             | `Delivery[]` (`status: simulated                                                                        | sent                                                                                 | failed`)               |
| GET / PUT          | `/reports/settings`                                                                | `{ calls_per_agent, min_duration_s, default_queue_ids, agent_selection, default_agent_ids, delivery, automatic_scheduling, change_note }`                                                                                                                                                     | `ReportSettings` (`answered_only: true`, `scheduling_authorized`) · 403 when scheduling is requested    |
| POST               | `/reports/generate`                                                                | `{ period: weekly                                                                                                                                                                                                                                                                             | custom, from, to, agent_ids, queue_ids, deliver }`                                                      | `{ report, sample, delivery, settings_version }` (weekly = one Saturday–Friday week) |

Additional assumptions: template placeholders (`{call_id}`, `{agent}`, `{result}`, …) and prompt
placeholders (`{transcript}`, `{criteria}`, `{scorecard_version}`, `{reasons}`) are listed in
`src/shared/utils/{emailRules,aiRules}.ts`; limits and ranges live in `src/shared/utils/*Rules.ts`.

## Phase C security and system adapters (PROVISIONAL)

Adapters: `api.users`, `api.auth`, `api.storage`, `api.backups`, `api.system`, `api.general`
(plus the extended `api.audit`), in `src/shared/api/adapters/`; decoders in
`src/shared/api/wire/{users,storage,backups,system,general,admin}.ts`. The Phase B conventions
apply (422 field issues, `confirm: true` for sensitive changes, write-only secrets, immutable
versions, `simulated` flags). Additional rules:

- **Session** gains `user_id` (optional; `null` for older backends).
- **Audit entries** gain `result: success|failure|denied` and `correlation_id` (both optional on
  the wire). Denied sensitive actions are audited.
- **Never on the wire:** passwords, TOTP secrets, one-time codes, recovery codes (except once,
  when the backend actually generates them), secret values. `mfa_required` and
  `encryption_required` must be `true`; `automatic_permanent_deletion` must be `false` — the
  decoders reject anything else.
- **Messages are sanitized** server-side and again on decode (`shared/utils/redact.ts`).

| Method     | Path                                                                           | Request (wire)                                                                                                                                                                      | Response (wire)                                                                                                  |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GET        | `/admin/audit?resource=&resource_id=&action=&result=&actor=&search=&from=&to=` | —                                                                                                                                                                                   | `AdminAudit[]`                                                                                                   |
| POST       | `/admin/audit/export`                                                          | same filters                                                                                                                                                                        | `{ exported_at, count, entries, simulated }` (export is audited)                                                 |
| GET / POST | `/users`                                                                       | `{ username, display_name, email, role: admin\|viewer }`                                                                                                                            | `User[]` / `User` (`email_status`, `mfa_state`, `locked`, `recovery_codes_remaining`, `must_change_password`, …) |
| PATCH      | `/users/{id}`                                                                  | subset + `confirm`                                                                                                                                                                  | `User` · 409 for role/email change without `confirm`, own role, last admin                                       |
| PUT        | `/users/{id}/status`                                                           | `{ status, confirm }`                                                                                                                                                               | `User` · 409 own account / last admin                                                                            |
| POST       | `/users/{id}/password-reset`                                                   | `{ confirm }`                                                                                                                                                                       | `User` · 409 unverified email                                                                                    |
| POST       | `/users/{id}/mfa-reset`                                                        | `{ reason, confirm }`                                                                                                                                                               | `User` · 403 own account (another administrator required)                                                        |
| POST       | `/users/{id}/unlock`, `/users/{id}/email-verification`                         | —                                                                                                                                                                                   | `User`                                                                                                           |
| GET        | `/auth/roles`                                                                  | —                                                                                                                                                                                   | `[{ id, permissions[] }]`                                                                                        |
| GET        | `/auth/sessions` · POST `/auth/sessions/{id}/revoke`                           | `{ confirm }`                                                                                                                                                                       | `Session[]` (`kind: demo_launch_code\|password_mfa`, `ip_masked`, `current`) · 409 current session               |
| GET / PUT  | `/auth/policy`                                                                 | `{ min_password_length, require_mixed_characters, password_history, lockout_threshold, lockout_minutes, session_idle_minutes, session_max_hours, mfa_required: true, change_note }` | `SecurityPolicy` (version n+1)                                                                                   |
| GET        | `/account/mfa`                                                                 | —                                                                                                                                                                                   | `{ state, enrolled_at, recovery_codes_remaining, simulated }`                                                    |
| POST       | `/account/mfa/enrollment` · `/account/mfa/enrollment/verify`                   | — · `{ enrollment_id, code }`                                                                                                                                                       | `{ enrollment_id, issuer, account_label, secret_available, expires_at }` · `AccountMfa`                          |
| POST       | `/account/mfa/recovery-codes`                                                  | `{ confirm }`                                                                                                                                                                       | `{ generated, codes[], simulated, message }`                                                                     |
| POST       | `/account/password`                                                            | `{ current_password, new_password }`                                                                                                                                                | `{ message }`                                                                                                    |
| GET        | `/storage/overview`                                                            | —                                                                                                                                                                                   | `{ volumes[], categories[], warning_pct, critical_pct, simulated }`                                              |
| GET / PUT  | `/storage/settings`                                                            | `{ locations{category: volume_id}, retention[{category, mode: keep\|recover_after, days}], change_note, confirm }`                                                                  | `StorageSettings` · 409 location move / expiry without `confirm`                                                 |
| GET / POST | `/storage/recovery`                                                            | `{ item_type: recording\|transcript\|report, item_id, reason, confirm }`                                                                                                            | `RecoveryItem[]` / `RecoveryItem`                                                                                |
| POST       | `/storage/recovery/{id}/restore`                                               | `{ confirm }`                                                                                                                                                                       | `RecoveryItem`                                                                                                   |
| GET / PUT  | `/backups/settings`                                                            | `{ target_volume_id, components[], retention_count, schedule, schedule_time, encryption_required: true, change_note }`                                                              | `BackupSettings`                                                                                                 |
| GET / POST | `/backups`                                                                     | `{ note }`                                                                                                                                                                          | `BackupRun[]` / `BackupRun` (`status`, `components[]`, `verification`)                                           |
| POST       | `/backups/{id}/verify`                                                         | —                                                                                                                                                                                   | `BackupRun`                                                                                                      |
| POST       | `/backups/{id}/restore`                                                        | `{ mode: test\|full, components[], confirm_text, confirm }`                                                                                                                         | `RestoreRun` · 409 unverified full restore · 422 wrong `confirm_text`                                            |
| GET        | `/backups/restores`, `/backups/migration-readiness`                            | —                                                                                                                                                                                   | `RestoreRun[]` / `{ overall, checks[{id, status, detail}] }`                                                     |
| GET        | `/system/health`                                                               | —                                                                                                                                                                                   | `{ overall, services[], resources{cpu_pct, ram_*, gpus[], disks[]}, workers[], queue, pbx, email }`              |
| GET        | `/system/errors?severity=&service=&search=&include_acknowledged=`              | —                                                                                                                                                                                   | `SystemError[]` (`code`, sanitized `message`, `correlation_id`, `count`)                                         |
| POST       | `/system/errors/{id}/acknowledge`                                              | —                                                                                                                                                                                   | `SystemError` (audited)                                                                                          |
| GET / PUT  | `/settings/application` (+ `/versions`)                                        | `{ default_language, default_theme, timezone, support_contact, login_notice{en, ar}, change_note }`                                                                                 | `AppSettings`                                                                                                    |
| GET / PUT  | `/settings/branding` (+ `/versions`)                                           | `{ product_name, organization_name, logo_light_path, logo_dark_path, light_primary, dark_primary, approval_reference, change_note }`                                                | `BrandingSettings`; `GET /branding` serves the latest                                                            |

## Phase D notes (integration)

Nothing in this document is a final contract; it records what the frontend currently sends and
expects so the backend team can confirm or change it in one place (`src/shared/api/`).

- `GET /settings/application` must be readable by **every** signed-in user (not only
  administrators): the app applies `default_language` / `default_theme` for users without a
  personal choice (`src/app/session/OrganizationDefaults.tsx`). A 403 simply keeps the
  built-in defaults (English, system theme).
- `GET /branding` must be readable by every signed-in user and return same-origin logo paths;
  the frontend rejects remote, protocol-relative, backslash or encoded-separator URLs.
- Permissions in `Session.permissions` drive UI gating only; each route must return 403 when the
  permission is missing. The frontend shows `errors.forbidden` for 403.
- A production sign-in contract (password, TOTP challenge, enrollment, reset) is **not** defined
  here; it must be agreed with the backend before a login screen is added.
