---
name: fastapi-contract
description: Integration contract between this frontend and the local Taqeef FastAPI backend — Zod contract schemas, ApiClient boundary, endpoint map, error model, mock vs live mode, upload/audio handling and OpenAPI alignment. Use when adding or changing API calls, data types, fixtures, mock handlers, or preparing integration with the local system.
---

# FastAPI integration contract

## Boundary

```
UI components → feature hooks (TanStack Query) → ApiClient (src/api/client.ts)
  → createHttp (fetch + Zod validation + error mapping) → VITE_API_BASE_URL
        mock mode:    MSW intercepts in the browser and serves synthetic fixtures
        fastapi mode: real requests to the local FastAPI backend
```

- Components never call `fetch` or know URLs. Only `ApiClient` methods.
- Mock mode lives at the **network layer** (MSW), so the same client code is exercised in
  both modes. `apiClient.mode` drives the always-visible `DataSourceBadge`.

## Contract

- Schemas in `src/api/contract/*.ts` are the source of truth for the frontend. Every response
  is validated; a mismatch throws `ApiError{code:'contract_mismatch'}` with Zod issues.
- Conventions (provisional until ORD-0035 contract arrives): JSON camelCase, ISO-8601
  datetimes with offset, durations/timestamps in **milliseconds**, scores 0–10 numbers,
  bilingual labels as `{ar, en}`.
- If the backend uses snake_case or different shapes, add a mapper inside the adapter —
  never leak backend shapes into components.

## Agents

Planned entities `Agent`, `Queue`, optional `PbxAgentMetrics`; `Call.agentId` references
`Agent.id` (stable id, separate from the Yeastar extension). Synthetic agents use `SYN-1xx`
extensions until real numbers are supplied. See `docs/requirements/agents.md`.

## Endpoints

Single map in `src/api/endpoints.ts`; documented in `docs/fastapi-adapter.md`. Change both
together.

## Errors

FastAPI `{"detail": "..."}` and 422 `{"detail": [ValidationError]}` are mapped to
`ApiError{status, code, message, details}`. Network failures → `code: 'network_error'`.
UI shows localized messages by `code`, never raw server text for 5xx.

## Uploads & audio

- Upload: `multipart/form-data` (`file`, `title`). Validate type (audio/wav, audio/mpeg,
  audio/ogg) and size client-side. Demo only accepts synthetic files.
- Audio: `audioUrl` is played by `<audio>`; backend should support HTTP Range requests.

## OpenAPI alignment

When the local backend's `/openapi.json` is available: generate reference types
(openapi-typescript) into `src/api/generated/` (dev-time only), diff against the Zod schemas,
resolve differences in schemas/mappers, and record decisions in `docs/fastapi-adapter.md`.

## Security

No credentials in the repo or bundle. Auth (if any) is supplied by the host application at
integration time. `.env*` files are git-ignored; only `.env.example` is committed.

## Sources

fastapi.tiangolo.com (handling errors, OpenAPI) · zod.dev · mswjs.io · openapi-ts.dev
