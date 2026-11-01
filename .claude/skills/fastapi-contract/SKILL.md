---
name: fastapi-contract
description: Integration contract between this frontend and the local Taqeef FastAPI backend — typed ApiClient, snake_case wire decoders and mappers, endpoint map, error model, session/launch-code and CSRF handling, mock vs live transport, upload/audio handling and contract alignment. Use when adding or changing API calls, data types, fixtures, mock handlers, or preparing integration with the local system.
---

# FastAPI integration contract

Full reference: `docs/api-adapter.md`. Handoff: `docs/handoff.md`.

## Boundary

```
UI components → feature hooks (useApiQuery / useApiMutation) → ApiClient (shared/api/client.ts)
  → wire decoders + mappers (snake_case ↔ camelCase, shared/api/wire) → Transport
        mock: simulated backend in shared/api/mock (same wire format, synthetic data)
        live: same-origin fetch to /api with session cookie + CSRF header
```

- Components never call `fetch` or know URLs — only `ApiClient` methods.
- Mock lives at the **transport layer**, so the same client code runs in both modes.
  `api.mode` drives the always-visible `DataSourceBadge`; simulated results carry
  `simulated: true` and are labelled.

## Contract rules

- Paths only in `shared/api/endpoints.ts`. Routes are PROVISIONAL until confirmed.
- Every response is decoded (`shared/api/decode.ts`); mismatches throw
  `ApiError('contract_mismatch')`. Extra fields are ignored; missing ones fail loudly.
- Wire: snake_case JSON, ISO-8601 datetimes with offset, times in **ms** (`WIRE_TIME_UNIT`
  in `wire/common.ts` — unconfirmed), scores 0–10 (criterion scores whole points), bilingual
  text `{ar, en}`, ids opaque strings.
- Backend shapes never leak into components: adapt in `wire/*.ts` mappers only.

## Errors

FastAPI `{"detail": "..."}` and 422 `{"detail": [{loc, msg}]}` → `ApiError{code, status,
message, fieldIssues}`. Forms map `fieldIssues` back to fields. UI shows localised messages
via `describeError()`; never raw 5xx text.

## Session and security

- One-time launch code: `?launch_code=` → `POST /session/launch`, removed from the URL;
  label "Open local demo session" (not Login/MFA).
- `credentials: 'same-origin'`; CSRF header on non-GET (names in `shared/api/config.ts`).
- Strict CSP: no inline scripts/styles, no remote origins, no credentials in the repo.

## Uploads & audio

Multipart `file`, `title`, `agent_id`; client validates audio type, ≤ 25 MB and a
synthetic-data confirmation. Audio played via `<audio>`; backend should support Range.

## Sources

fastapi.tiangolo.com (handling errors, OpenAPI, static files) · developer.mozilla.org (CSP,
fetch credentials)
