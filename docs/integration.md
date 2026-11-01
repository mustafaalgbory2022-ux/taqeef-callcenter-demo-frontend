# Integration status

## Confirmed by the Local ORD-0035 project

- Stack: React/react-dom 19.3.0, React Router 8.4.0, TypeScript 6.0.3, Vite 8.3.2,
  @vitejs/plugin-react 6.1.1, Vitest 5.0.3, ESLint 10.12.0, Playwright 1.63.0, Node ≥24.15 <25,
  CSS Modules + custom properties, Light/Dark/System themes, English/Arabic RTL. **Adopted.**
- Built static files served by FastAPI on 127.0.0.1:8000; same-origin `/api`. **Adopted.**
- No separate frontend server, CDN, remote fonts or external scripts. **Adopted.**
- Strict CSP, cookie session, CSRF. **Adopted** (see `docs/handoff.md` §3).
- One-time launch-code exchange labelled "Open local demo session". **Implemented.**
- snake_case wire format behind a typed adapter. **Implemented** (`src/shared/api/wire`).
- Scoring rules (six criteria, whole points, two decimals rounded down, low < 7.00,
  Not Assessable vs Insufficient Evidence, immutable history, latest eligible evaluation,
  pooled aggregation, sample sizes, no ranking, no invented PBX metrics, SLA formula).
  **Implemented.**
- Approved default scorecard (1/1/2/3/2/1 points), configurable criteria/points/partial
  credit/minimum evidence/threshold, minimum 6 of 10 assessable points for the whole
  evaluation, deterministic points-based scoring, penalty only under the active rule with
  reliable agent attribution, mixed-channel speakers unresolved. **Implemented.**

## Open questions

1. Final API routes and payloads (current ones are provisional — `docs/api-adapter.md`).
2. Agent id convention (treated as opaque strings) and timestamp units (ms assumed).
3. Final wording of criterion guidance (approved criteria and points are implemented).
4. The approved prohibited-expression penalty rule, if any (default: flag for review only).
5. How the backend reports channel layout / speaker attribution (`channel_layout` assumed).
6. CSRF cookie/header names and session lifetime/expiry behaviour.
7. SPA fallback availability in FastAPI (else `VITE_ROUTER_MODE=hash`).
8. Official logo files and Light/Dark brand tokens via `GET /api/branding`.
9. Arabic numerals: Western (current default) or Arabic-Indic.
10. Reporting policy for when agent results may be treated as reliable.
11. Vite 8.3.2 → 8.3.5 security upgrade (dev-server advisories) — a recommendation for the
    local project to decide; this repository keeps the confirmed 8.3.2.
