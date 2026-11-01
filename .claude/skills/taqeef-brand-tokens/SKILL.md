---
name: taqeef-brand-tokens
description: Design-token architecture and branding rules for the Taqeef frontend — primitive vs semantic tokens, light/dark themes, the replaceable logo slot and how to apply official brand values. Use when touching colours, typography, spacing, themes, logos or any CSS variable.
---

# Taqeef brand & design tokens

## Rule zero

The official Taqeef logo and branding exist in the local project. **Do not invent or
approximate them.** Until approved assets are supplied, keep the neutral placeholder.

## Token layers

1. `src/styles/tokens/primitives.css` — raw values (`--p-neutral-*`, `--p-accent-*`, status,
   spacing, radii, type scale, motion). Never referenced by components.
2. `src/styles/tokens/semantic.css` — role tokens (`--color-surface`, `--color-text-muted`,
   `--color-accent`, `--color-score-*`, `--color-mock`…), redefined under
   `:root[data-theme='dark']`. **Components use only these.**
3. `src/styles/brand.css` — the brand slot. Optional `--brand-*` overrides that semantic
   tokens consume with fallbacks. Official values go here and nowhere else.

## Themes

`data-theme="light|dark"` on `<html>`, resolved from the user's preference (light / dark /
system) in `src/app/preferences.ts`. Dark mode is designed, not inverted: each role has its
own dark value. Verify contrast in both themes.

## Logo slot

`src/config/brand.config.ts` → `logoSrc`, `logoAlt` (AR/EN), names (AR/EN), `isPlaceholder`.
Replace `public/brand/logo-placeholder.svg` by adding the official SVG and updating
`logoSrc`. Keep it ≤ 32px high in the header; provide a monochrome variant for dark if needed.

## Applying official branding (checklist)

1. Receive approved colour values, font names/licences and logo files from the local project.
2. Set `--brand-*` in `brand.css` (light + dark variants), and `--font-sans` if a brand font.
3. Self-host fonts (no external CDN). Confirm Arabic glyph coverage.
4. Run contrast checks: text ≥ 4.5:1, UI/graphics ≥ 3:1, both themes (`npm run test:e2e`).
5. Set `isPlaceholder: false`.

## Status / score colours

Validated with the dataviz palette checker. Red/amber are not separable for deuteranopia, so
score bands always carry a label + distinct icon shape.
