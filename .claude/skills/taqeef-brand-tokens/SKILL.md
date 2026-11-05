---
name: taqeef-brand-tokens
description: Design-token architecture and branding rules for the Taqeef frontend — primitive vs semantic tokens, Light/Dark/System themes, runtime brand tokens, the replaceable logo slot and how official branding is applied without code changes. Use when touching colours, typography, spacing, themes, logos or any CSS variable.
---

# Taqeef brand & design tokens

## Rule zero

The official Taqeef logo and Light/Dark branding exist in the local project. **Do not invent,
approximate or redraw them.** Until they are supplied, the neutral placeholder stays.

## Token layers

1. `src/shared/theme/tokens/primitives.css` — raw values. Never referenced by components.
2. `src/shared/theme/tokens/semantic.css` — role tokens (`--color-surface`, `--color-accent`,
   `--color-score-*`, `--color-mock`…), redefined under `:root[data-theme='dark']`.
   **Components use only these.**
3. Brand layer — optional `--brand-*` variables consumed by semantic tokens with fallbacks.
   On the five-call demo branch branding is **static** (demo API contract v0.2: no branding
   route): build-time values in `shared/branding/brand.css` and `shared/branding/defaults.ts`.
   `shared/branding/applyBrandTokens.ts` (only `#rrggbb`, CSSOM, CSP-safe) stays available for
   the full system.

## Themes

`data-theme="light|dark"` on `<html>`, resolved from Light / Dark / System in
`shared/theme/ThemeProvider.tsx`. Dark mode is designed, not inverted. Check contrast in both.

## Logo slot

Static on the demo branch: `shared/branding/defaults.ts` points to
`public/brand/logo-placeholder.svg`. Header height ≤ 32px.

## Applying official branding

1. Demo branch: approved files replace `public/brand/` and the static values, only when
   authorized (never redistributed from here). Full system: as specified in its own docs.
2. Fonts, if any, are self-hosted with licences; confirm Arabic coverage. No remote fonts.
3. Verify contrast (text ≥ 4.5:1, UI ≥ 3:1) with `npm run test:e2e` (axe, both themes).

## Status / score colours

Validated with the dataviz palette checker. Red/amber are not separable for deuteranopia,
so the low-score state always carries text + a distinct icon.
