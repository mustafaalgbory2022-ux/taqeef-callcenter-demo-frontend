---
name: rtl-accessibility
description: Arabic RTL, bilingual (AR/EN) and accessibility requirements — WCAG 2.2 AA, keyboard navigation, focus management, ARIA patterns, CSS logical properties, bidi text, numerals and responsive behaviour. Use when building or reviewing any UI, text, form, media player, table or layout.
---

# Arabic RTL & accessibility

Target: **WCAG 2.2 AA** in both languages and both themes.

## Direction & language

- `<html lang dir>` is set from the language preference (`ar` → `rtl`).
- Use **CSS logical properties only**: `margin-inline-start`, `padding-inline`, `inset-inline-start`,
  `border-inline-end`, `text-align: start`. Never `left/right` for layout (lint rule).
- Mixed content: wrap content whose language differs from the UI in an element with its own
  `lang` and `dir` (transcripts, names). Use `<bdi>` for user/data-provided strings, ids,
  durations and numbers inside sentences.
- Timestamps, ids and codes are LTR runs (`dir="ltr"` or `<bdi>`).
- Mirror directional icons (`.icon-directional`); never mirror logos, media play icons or
  checkmarks.
- Numerals: Western digits by default (`NUMBERING_SYSTEM` in `src/i18n`) — confirm with the
  local project. Format via `Intl.NumberFormat`, never string concatenation.
- Arabic needs more line-height (`--leading-arabic`) and no letter-spacing / uppercase.

## Keyboard & focus

- Everything operable by keyboard in a logical order; visible `:focus-visible` ring.
- Skip link to `#main`. Move focus to the page heading or `main` on route change.
- Dialogs trap focus and restore it on close; Esc closes.
- Arrow-key semantics follow WAI-ARIA APG (tabs, sliders, menus) and **reverse in RTL** for
  horizontal widgets.
- Scrollable regions are focusable (`tabIndex=0`, `role="region"`, labelled).

## Semantics

- Landmarks: `header`, `nav[aria-label]`, `main`. One `h1` per page; no skipped levels.
- Native elements first (`button`, `select`, `table`, `audio` controls). ARIA only to fill gaps.
- Score meters: `role="meter"` with `aria-valuetext` including the band label.
- Audio player: labelled buttons, keyboard seek (←/→ 5 s, mirrored in RTL), current-time
  announced politely; transcript segments are buttons that seek.
- Status messages (upload progress, re-score done) via `aria-live="polite"`.
- Never convey state by colour alone. Text contrast ≥ 4.5:1, UI ≥ 3:1. Targets ≥ 24×24 px.

## Responsive & motion

- Usable from 360px; no horizontal page scroll; zoom to 200% without loss.
- Respect `prefers-reduced-motion` (global rule in base.css).

## Verification

`npm run test:e2e` runs axe (wcag2a/aa/22aa) for EN/AR × light/dark × desktop/mobile.
Manual: keyboard-only pass, screen-reader spot check (NVDA/VoiceOver) on new widgets.

## Sources

w3.org/TR/WCAG22 · w3.org/WAI/ARIA/apg · w3.org/International/questions/qa-html-dir ·
developer.mozilla.org (CSS logical properties)
