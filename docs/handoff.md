# Handoff package — integrating into Local ORD-0035 `demo/frontend`

For the Local Claude / ORD-0035 team. This repository is a standalone frontend; nothing here
modifies the local application. Integration is a deliberate, reviewed copy — not a merge.

## 1. What to take

| Path                                                                                     | Purpose                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/`                                                                                   | Application source (see `docs/architecture.md`)         |
| `public/brand/logo-placeholder.svg`                                                      | Neutral logo placeholder (replace via runtime branding) |
| `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc.json` | Build and quality configuration                         |
| `tests/e2e/`, `playwright.config.ts`                                                     | End-to-end and accessibility suite                      |
| `docs/`                                                                                  | Architecture, API adapter, requirements, this handoff   |

## 2. Dependency reconciliation

Runtime (required by the built app):

| Package          | Version here | ORD-0035 target | Status   |
| ---------------- | ------------ | --------------- | -------- |
| react, react-dom | 19.3.0       | 19.3.0          | ✅ match |
| react-router     | 8.4.0        | 8.4.0           | ✅ match |

Build (required by `npm run build`):

| Package              | Version here        | ORD-0035 target | Status                                                                                                                                                       |
| -------------------- | ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| typescript           | 6.0.3               | 6.0.3           | ✅ match                                                                                                                                                     |
| vite                 | 8.3.2               | 8.3.2           | ✅ match — ⚠ `npm audit` reports dev-server advisories fixed in 8.3.5 (dev server only; built files unaffected). Recommend upgrading both projects together. |
| @vitejs/plugin-react | 6.1.1               | 6.1.1           | ✅ match                                                                                                                                                     |
| Node                 | 24 (tested 24.22.1) | ≥24.15 <25      | ✅                                                                                                                                                           |

Quality tooling (dev only — **reconcile before adopting**; not needed to build):

| Package                                                                                        | Version                                   | License    | Needed for                      |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------- | ------------------------------- |
| vitest                                                                                         | 5.0.3                                     | MIT        | unit tests (✅ ORD-0035 target) |
| eslint                                                                                         | 10.12.0                                   | MIT        | lint (✅ ORD-0035 target)       |
| @playwright/test, playwright-core                                                              | 1.63.0                                    | Apache-2.0 | e2e (✅ ORD-0035 target)        |
| jsdom                                                                                          | 30.1.3                                    | MIT        | Vitest DOM environment          |
| @testing-library/react / dom / jest-dom / user-event                                           | 16.3.3 / 10.4.2 / 7.0.1 / 14.6.8          | MIT        | component tests                 |
| @axe-core/playwright                                                                           | 4.14.0                                    | MPL-2.0    | accessibility checks            |
| @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | 10.0.1 / 8.72.1 / 7.1.1 / 0.5.7 / 17.14.0 | MIT        | lint rules                      |
| prettier                                                                                       | 3.9.10                                    | MIT        | formatting                      |
| @types/react, @types/react-dom, @types/node                                                    | 19.3.0 / 19.3.0 / 24.19.2                 | MIT        | types                           |

Deliberately **not** used (to avoid unreconciled dependencies): Zod, TanStack Query,
i18next, MSW, UI kits, chart libraries, web fonts. Equivalent small modules live in
`src/shared/`.

## 3. FastAPI serving requirements

1. Serve `dist/` (output of `npm run build`) as static files on 127.0.0.1:8000.
2. Same-origin API under `/api` (no CORS needed).
3. **SPA fallback:** return `index.html` for non-`/api`, non-asset paths (e.g. `/calls/DEMO-001`).
   If that is not possible, build with `VITE_ROUTER_MODE=hash` (URLs become `/#/calls/…`).
4. If served under a sub-path, set Vite `base` accordingly (router uses `BASE_URL`).
5. **CSP:** the build has no inline scripts/styles and no remote origins. Recommended policy
   (exactly what the tests run under):
   `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
   `media-src blob:` is only required by the mock mode (synthetic audio); live mode can drop it
   if audio is served from `/api`.
6. Session cookie (HttpOnly, SameSite=Strict) + readable CSRF cookie; the client sends the
   CSRF header on every non-GET request (names in `src/shared/api/config.ts`).
7. One-time launch: the launcher opens `/?launch_code=<code>`; the frontend exchanges it via
   `POST /api/session/launch` and removes it from the URL. UI label: "Open local demo session".
8. Audio endpoints should support HTTP Range requests (seeking).

## 4. Integration steps

```bash
# In a branch of the local project (never directly on main)
cp -r <this-repo>/{src,public,index.html,vite.config.ts,tsconfig*.json,eslint.config.js,.prettierrc.json} demo/frontend/
cd demo/frontend
npm ci                        # after reconciling package.json (section 2)
npm run check                 # typecheck, lint, format, unit tests
VITE_API_MODE=live npm run build
```

Then align `src/shared/api/endpoints.ts` and `src/shared/api/wire/*.ts` with the confirmed
backend contract (see `docs/api-adapter.md`), start FastAPI, and run the e2e suite against it.

## 5. Acceptance checklist

- [ ] `npm run check` and `npm run build` pass on Node 24 offline.
- [ ] Launch link opens the session; reused codes are rejected.
- [ ] Data-source badge reads "Live backend" in live mode.
- [ ] Overall dashboard pools per call; agent pages show sample-only notices; no rankings.
- [ ] Missed / abandoned / SLA show "Not available" until PBX data exists.
- [ ] Scores show two decimals rounded down; low score strictly < 7.00.
- [ ] Re-score creates a new evaluation; history and comparison update.
- [ ] Official logo and brand tokens supplied through `GET /api/branding`.
- [ ] No CSP violations in the browser console.

## 6. Open items requiring local confirmation

See `docs/integration.md` → _Open questions_.
