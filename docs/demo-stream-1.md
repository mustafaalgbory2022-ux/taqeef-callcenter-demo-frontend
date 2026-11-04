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

## Proposed next tasks (prioritized, client-only unless noted)

1. Keyboard shortcuts for the audio player (space, ←/→ 5 s) with an on-screen hint.
2. Evidence quote highlighting inside the matching transcript line (client-side).
3. Print-friendly call review layout (CSS `@media print`), for management handouts.
4. Needs Local Claude: confirmed transcript/segment fields before any speaker-correction UI.
