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

## Task 2 — evidence-to-transcript highlighting (call review)

**Behaviour.** Selecting an evidence quote (criterion evidence or a prohibited-expression hit)
locates it in the transcript using only existing evaluation fields (`segment_id`, `start_ms`,
`end_ms`, `quote`):

- **Located** when the cited segment exists **and** either the quote occurs in that line
  (same normalization as transcript search: case, diacritics, tatweel, alef/taa marbuta) or the
  evidence time falls within the line (±1 s). The line gets a thick outline, the quoted text a
  `<mark>` with underline (never colour only), hidden "Evidence line / Evidence quote" labels,
  and the recording plays from the evidence time. A status bar offers **Play from m:ss**,
  **Go to transcript line** (moves keyboard focus to the line) and **Clear evidence**. If only
  the time agrees, the whole line is marked and the bar says the exact quote is not in the text.
- **Evidence location unavailable** when the cited segment is missing or neither quote nor time
  matches. Nothing is highlighted or played; other lines are never searched for a similar quote.
- Feedback is announced through an always-mounted `role="status"` region. English and Arabic,
  RTL-safe. Transcript search, match navigation, follow playback and line seeking are unchanged.

**API impact: none.** No new routes or fields; no fixtures changed; no evidence fabricated.
Evaluation evidence callbacks now pass the existing evidence fields instead of only the time.

**Files changed**

- `src/features/calls/model/transcript.ts` — `normalizeWithMap` (index-preserving
  normalization; `normalizeForSearch` now built on it), `EvidenceRef`, `EvidenceLocation`,
  `locateEvidence`
- `src/features/calls/components/EvidenceStatus.tsx` (new), `TranscriptView.tsx`,
  `TranscriptView.module.css` — status bar, line and quote marking, scroll-into-view
- `src/features/calls/pages/CallDetailPage.tsx` — selection state, locate, play, clear
- `src/features/evaluations/components/CriterionResults.tsx`, `EvaluationPanel.tsx`,
  `src/features/evaluations/index.ts` — `EvidenceSelection` callback with existing fields
- `src/shared/i18n/locales/{en,ar}.json` — `calls.evidence.*`
- Tests: `src/features/calls/model/calls.test.ts` (locator + mapping),
  `src/features/calls/components/EvidenceStatus.test.tsx` (new; unavailable/located states),
  `tests/e2e/calls.spec.ts` (keyboard flow, mark = quote, play, focus, search coexistence,
  clear; Arabic + axe with the highlight active)

**Tests.** `npm run check` (typecheck, lint, format, **76 unit tests**) passes; `npm run build`
succeeds; `npm run test:e2e` **48 passed, 0 failed** (desktop + mobile).

**Limitations.** All synthetic evidence quotes equal their segment text, so the
"unavailable" and "time-only" paths are covered by unit and component tests rather than a
browser run on demo data. Matching relies on `segment_id`; if the backend later sends evidence
without segment ids, the state will be "unavailable" (by design) until a contract is agreed.

**Handoff for Local Claude.** Pull branch `demo/ord-0035-cloud-stream-1` (do not copy files into
your worktree by hand); the change is limited to the `calls` and `evaluations` features plus
locale strings. No dependency, CSP, route or contract change. Confirm the evidence fields
(`segment_id`, `start_ms`, `end_ms`, `quote`) in the final contract.

## Proposed next tasks (prioritized, client-only unless noted)

1. Keyboard shortcuts for the audio player (space, ←/→ 5 s) with an on-screen hint.
2. Print-friendly call review layout (CSS `@media print`), for management handouts.
3. Needs Local Claude: confirmed transcript/segment fields before any speaker-correction UI.
