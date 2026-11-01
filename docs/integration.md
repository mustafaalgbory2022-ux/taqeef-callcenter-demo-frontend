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

## Open questions

1. Final API routes and payloads (current ones are provisional — `docs/api-adapter.md`).
2. Agent id convention (treated as opaque strings) and timestamp units (ms assumed).
3. The six approved criteria (labels, guidance, weights) — placeholders are used.
4. Rule for whether "Insufficient evidence" on some criteria makes an evaluation
   ineligible (currently: excluded per criterion; evaluation eligible if any criterion scored).
5. Whether prohibited expressions should affect scores (currently: reported only).
6. CSRF cookie/header names and session lifetime/expiry behaviour.
7. SPA fallback availability in FastAPI (else `VITE_ROUTER_MODE=hash`).
8. Official logo files and Light/Dark brand tokens via `GET /api/branding`.
9. Arabic numerals: Western (current default) or Arabic-Indic.
10. Reporting policy for when agent results may be treated as reliable.
11. Vite 8.3.2 → 8.3.5 security upgrade (dev server advisories) for both projects.
