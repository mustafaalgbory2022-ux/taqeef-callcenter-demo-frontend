# taqeef-callcenter-demo-frontend

Standalone management-demo frontend for **Taqeef Call Center AI**: overall and per-agent
quality dashboards, agent management, call upload and review (audio + timestamped
transcript), an editable 10-point scorecard with versions and prohibited expressions,
re-scoring with previous-versus-new comparison, and Arabic/English with Light/Dark/System
themes. **All data is synthetic**; in mock mode the backend is simulated in the browser
and clearly labelled.

Requires Node 24 (≥24.15 <25).

```bash
npm ci
npm run dev            # http://127.0.0.1:5173 — mock mode, "Open local demo session"
npm run check          # typecheck + lint + format + unit tests
npm run build          # static files in dist/ (served by FastAPI in the local system)
npm run test:e2e       # Playwright + axe: desktop/mobile, EN/AR, light/dark, strict CSP
```

Live mode against a local FastAPI: `VITE_API_MODE=live npm run build` (same-origin `/api`).

| Document                                     | Contents                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | Structure, module boundaries, business-rule locations, how to maintain each feature                  |
| [docs/api-adapter.md](docs/api-adapter.md)   | Provisional endpoints, snake_case wire shapes, errors, session/CSRF                                  |
| [docs/handoff.md](docs/handoff.md)           | Integration into Local ORD-0035 `demo/frontend`, dependency reconciliation, FastAPI/CSP requirements |
| [docs/integration.md](docs/integration.md)   | Confirmed decisions and open questions                                                               |
| [docs/requirements/](docs/requirements/)     | Agent dashboards and GUI-administration requirements                                                 |
| [docs/screenshots/](docs/screenshots/)       | Responsive screenshots, both languages and themes                                                    |

Project rules for contributors and Claude: [CLAUDE.md](CLAUDE.md).
