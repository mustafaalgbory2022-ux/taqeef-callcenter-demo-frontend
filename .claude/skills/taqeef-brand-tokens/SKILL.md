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
   Set at **runtime** from `GET /api/branding` by `shared/branding/applyBrandTokens.ts`
   (only `#rrggbb` accepted; applied via CSSOM, CSP-safe). `shared/branding/brand.css` may
   hold build-time defaults.

## Themes

`data-theme="light|dark"` on `<html>`, resolved from Light / Dark / System in
`shared/theme/ThemeProvider.tsx`. Dark mode is designed, not inverted. Check contrast in both.

## Logo slot

`logo_light_url` / `logo_dark_url` from `GET /api/branding`; defaults in
`shared/branding/defaults.ts` point to `public/brand/logo-placeholder.svg`. Header height ≤ 32px.

## Applying official branding

1. Backend serves approved tokens and logo URLs from `/api/branding` (light + dark).
2. Fonts, if any, are self-hosted with licences; confirm Arabic coverage. No remote fonts.
3. Verify contrast (text ≥ 4.5:1, UI ≥ 3:1) with `npm run test:e2e` (axe, both themes).

## Status / score colours

Validated with the dataviz palette checker. Red/amber are not separable for deuteranopia,
so the low-score state always carries text + a distinct icon.
