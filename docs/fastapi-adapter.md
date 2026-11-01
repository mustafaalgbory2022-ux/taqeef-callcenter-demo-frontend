# FastAPI adapter (provisional)

Status: **draft** — to be aligned with the local Taqeef backend / ORD-0035 contract.
Base URL: `VITE_API_BASE_URL` (default `/api`; Vite dev server proxies `/api` to
`VITE_DEV_PROXY_TARGET`, default `http://127.0.0.1:8000`).

| Method | Path                        | Request                                 | Response schema               |
| ------ | --------------------------- | --------------------------------------- | ----------------------------- |
| GET    | `/calls`                    | —                                       | `Call[]`                      |
| GET    | `/calls/{id}`               | —                                       | `Call`                        |
| POST   | `/calls`                    | multipart: `file`, `title`              | `Call`                        |
| GET    | `/calls/{id}/transcript`    | —                                       | `Transcript`                  |
| GET    | `/calls/{id}/evaluations`   | —                                       | `Evaluation[]` (newest first) |
| POST   | `/calls/{id}/evaluations`   | `RescoreRequest` JSON                   | `Evaluation`                  |
| GET    | `/scorecards`               | —                                       | `Scorecard[]`                 |
| GET    | `/scorecards/{id}`          | —                                       | `Scorecard` (latest version)  |
| POST   | `/scorecards/{id}/versions` | scorecard without `version`/`createdAt` | `Scorecard`                   |

Schemas: `src/api/contract/`. Conventions: camelCase JSON, ISO-8601 datetimes with offset,
times in milliseconds, scores 0–10, bilingual labels `{ar, en}`.

## Errors

| Backend                       | Frontend `ApiError`                              |
| ----------------------------- | ------------------------------------------------ |
| `{"status","code","message"}` | passed through                                   |
| `{"detail": "text"}`          | `code: http_<status>`, `message: text`           |
| 422 `{"detail": [...]}`       | `code: validation_error`, `details: [...]`       |
| network failure               | `status: 0, code: network_error`                 |
| schema mismatch               | `code: contract_mismatch`, `details: ZodIssue[]` |

## Agents (planned — see docs/requirements/agents.md)

| Method | Path                                    | Request                          | Response schema                              |
| ------ | --------------------------------------- | -------------------------------- | -------------------------------------------- |
| GET    | `/agents?includeInactive=`              | —                                | `Agent[]`                                    |
| GET    | `/agents/{id}`                          | —                                | `Agent`                                      |
| POST   | `/agents`                               | `Agent` without id/timestamps    | `Agent`                                      |
| PATCH  | `/agents/{id}`                          | partial `Agent` (incl. `status`) | `Agent`                                      |
| GET    | `/queues`                               | —                                | `Queue[]`                                    |
| GET    | `/calls?agentId=`                       | —                                | `Call[]` (agent filter on existing endpoint) |
| GET    | `/pbx/agent-metrics?agentId=&from=&to=` | —                                | `PbxAgentMetrics[]` or 404 = not available   |

Planned change: `Call.agentAlias` → `Call.agentId`. Quality aggregates are computed in the
frontend from calls + current evaluations (pooled by call); an optional server
`/dashboard/summary?agentId=` may replace this later without UI changes.

## Open alignment items

See `docs/integration.md`.
