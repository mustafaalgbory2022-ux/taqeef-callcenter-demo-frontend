# API adapter (FastAPI integration)

Status: **PROVISIONAL** — routes and payloads are placeholders until the local backend
contract is confirmed. Everything below is isolated in `src/shared/api/`; components are
unaffected by changes here.

## Configuration (`src/shared/api/config.ts`)

| Setting     | Value                                                  | Notes                                                                  |
| ----------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Base URL    | `/api`                                                 | Same origin as the static frontend served by FastAPI on 127.0.0.1:8000 |
| Credentials | `same-origin`                                          | Session cookie set by the backend                                      |
| CSRF        | cookie `csrf_token` → header `X-CSRF-Token` on non-GET | Names provisional                                                      |
| Launch code | URL param `launch_code` → `POST /session/launch`       | Removed from URL after exchange                                        |
| Mode        | `VITE_API_MODE=mock` (default) \| `live`               | Build-time developer setting only                                      |

## Endpoints (`src/shared/api/endpoints.ts`)

| Method | Path                              | Request (wire)                                   | Response (wire)                       |
| ------ | --------------------------------- | ------------------------------------------------ | ------------------------------------- |
| GET    | `/session`                        | —                                                | `Session` · 401 → launch screen       |
| POST   | `/session/launch`                 | `{ launch_code }`                                | `Session` · 401/422 → "code rejected" |
| GET    | `/branding`                       | —                                                | `Branding` (all fields nullable)      |
| GET    | `/queues`                         | —                                                | `Queue[]`                             |
| GET    | `/agents`                         | —                                                | `Agent[]`                             |
| POST   | `/agents`                         | `{ display_name, extension, status, queue_ids }` | `Agent`                               |
| PATCH  | `/agents/{id}`                    | any subset of the above                          | `Agent`                               |
| GET    | `/agents/{id}/history`            | —                                                | `AuditEntry[]`                        |
| GET    | `/calls?agent_id=`                | —                                                | `Call[]` (newest first)               |
| GET    | `/calls/{id}`                     | —                                                | `Call`                                |
| POST   | `/calls`                          | multipart: `file`, `title`, `agent_id`           | `Call` (status `uploaded`)            |
| GET    | `/calls/{id}/transcript`          | —                                                | `Transcript` · 409 while not ready    |
| POST   | `/calls/{id}/rescore`             | —                                                | `Evaluation` (new, immutable)         |
| GET    | `/evaluations?call_id=&agent_id=` | —                                                | `Evaluation[]` (all history)          |
| GET    | `/scorecards/current`             | —                                                | `ScorecardVersion`                    |
| GET    | `/scorecards/versions`            | —                                                | `ScorecardVersion[]`                  |
| POST   | `/scorecards/versions`            | draft (below)                                    | `ScorecardVersion` (version n+1)      |

## Wire shapes (snake_case; decoders in `src/shared/api/wire/`)

```jsonc
// Session
{ "mode": "mock|live", "display_name": "…", "permissions": ["agents.manage", "scorecards.manage", "calls.upload", "evaluations.rescore", "settings.manage"], "expires_at": null }
// Agent — id is opaque (convention unconfirmed); extension = Yeastar extension/agent number
{ "id": "agt-001", "display_name": "Agent A", "extension": "SYN-101", "status": "active|inactive", "queue_ids": ["q-billing"], "synthetic": true, "created_at": "ISO-8601", "updated_at": "ISO-8601" }
// AuditEntry
{ "id": "…", "action": "created|updated|disabled|enabled", "actor": "…", "at": "ISO-8601", "changes": [{ "field": "extension", "before": "SYN-101", "after": "SYN-201" }] }
// Call
{ "id": "DEMO-001", "title": "…", "agent_id": "agt-001", "queue_id": "q-billing", "language": "ar|en|mixed", "duration_ms": 78000, "recorded_at": "ISO-8601", "status": "uploaded|transcribing|scoring|scored|failed", "audio_url": "/api/…", "synthetic": true, "simulated": false, "source": "fixture|upload" }
// Transcript
{ "call_id": "…", "segments": [{ "id": "s1", "start_ms": 500, "end_ms": 6000, "speaker": "agent|customer", "language": "ar|en", "text": "…" }] }
// ScorecardVersion (draft = name, low_score_threshold, criteria, prohibited_expressions, change_note)
{ "scorecard_id": "sc-quality", "version": 2, "name": { "en": "…", "ar": "…" }, "low_score_threshold": 7,
  "criteria": [{ "id": "c-greeting", "label": { "en": "…", "ar": "…" }, "description": { "en": "…", "ar": "…" }, "weight": 1 }],
  "prohibited_expressions": [{ "id": "px-1", "phrase": "…", "language": "ar|en" }], "created_at": "…", "created_by": "…", "change_note": "…" }
// Evaluation (criterion score: whole points 0–10 when result = "scored", else null)
{ "id": "…", "call_id": "…", "agent_id": "…", "scorecard_id": "…", "scorecard_version": 2, "status": "completed|failed", "overall_score": 4.714,
  "criteria": [{ "criterion_id": "…", "result": "scored|not_assessable|insufficient_evidence", "score": 4, "rationale": "…", "evidence": [{ "segment_id": "s5", "start_ms": 27000, "end_ms": 38000, "quote": "…" }] }],
  "prohibited_hits": [{ "expression_id": "px-1", "phrase": "…", "segment_id": "s5", "start_ms": 27000, "quote": "…" }],
  "trigger": "initial|rescore", "supersedes_id": "…|null", "created_at": "ISO-8601", "simulated": false }
// Branding (any field may be null → neutral defaults)
{ "product_name": { "en", "ar" }, "organization_name": { "en", "ar" }, "logo_light_url": "…", "logo_dark_url": "…",
  "tokens": { "light": { "primary": "#rrggbb", "primary_hover": "…", "primary_soft": "…", "primary_text": "…" }, "dark": { … } } }
```

- **Overall score** is sent unrounded; the frontend displays it floored to two decimals.
- **Timestamps:** ISO-8601 with offset. **Durations/offsets:** milliseconds — UNCONFIRMED;
  change `WIRE_TIME_UNIT` in `wire/common.ts` if the backend uses seconds.
- Unknown extra fields are ignored (forward compatible); missing/mistyped fields fail loudly.

## Errors (`src/shared/api/errors.ts`)

| Backend                                                       | Frontend                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `{"detail": "text"}`                                          | `ApiError(code by status, message = text)`                               |
| 422 `{"detail": [{"loc": ["body","extension"], "msg": "…"}]}` | `validation_error` + field issues mapped onto form fields                |
| 401 / 403 / 404 / 409 / 5xx                                   | `unauthorized` / `forbidden` / `not_found` / `conflict` / `server_error` |
| network failure                                               | `network_error`                                                          |
| decoder failure                                               | `contract_mismatch`                                                      |

## Mock vs live

The simulated backend (`src/shared/api/mock/`) implements the same `Transport` interface
and wire format, so the same client code runs in both modes. It is always labelled
("Synthetic demo data · simulated backend"; "Simulated" badges on evaluations and
processing). Transcription, scoring and persistence are performed by the real backend.

## Aligning with the confirmed contract

1. Update `endpoints.ts` paths.
2. Adjust decoders/mappers in `wire/*.ts` (field names, units). Domain types stay stable.
3. If the backend publishes OpenAPI, compare `/openapi.json` with `wire/*.ts`.
4. Run `npm run check` and the e2e suite against `VITE_API_MODE=live`.
