---
name: enterprise-dashboard-design
description: Visual and UX rules for the Taqeef management demo — restrained enterprise dashboard design, information hierarchy, KPI tiles, tables, score meters, charts and evidence drill-through. Use when designing or styling any screen, layout, chart, KPI or table. Complements the official Anthropic frontend-design skill when it is enabled, and the built-in dataviz skill for charts.
---

# Enterprise dashboard design

Audience: call-center managers and executives evaluating quality. The UI must feel like a
dependable internal enterprise tool — calm, precise, evidence-driven — not a generic "AI" demo.

## Principles

1. **Evidence over decoration.** Every metric is computed from the underlying calls and
   evaluations, and links to its evidence (call → criterion → transcript timestamp).
   No free-standing or invented numbers. Synthetic data is always labelled.
2. **Hierarchy:** page title → KPI row → primary analysis (2-column) → detail table.
   One primary action per screen.
3. **Restraint:** neutral surfaces, one accent colour, status colours only for state.
   No gradients, glows, glassmorphism, sparkles/robot imagery or "AI magic" language.
4. **Density:** comfortable but information-rich; 14px body, tabular numerals, 4px grid.
5. **Consistency:** reuse `Card`, `StatTile`, `ScoreMeter`, `DataSourceBadge` before
   creating new primitives.

## Patterns

- **Scores:** always `value / 10` (Arabic: `value من 10`) with one decimal, a band label and
  band icon (✓ meets, ◆ near, ▲ below). Never colour alone. Show the target tick on meters.
- **KPI tiles:** label, value, unit, footnote stating the basis ("Based on 5 synthetic calls").
- **Tables:** sticky header on long lists, start-aligned text, tabular numbers, row hover,
  horizontal scroll inside a focusable region on small screens.
- **Transcripts:** mono timestamp column, speaker label, text in its own `lang`/`dir`;
  evidence rows highlighted with an inline-start accent bar and a note.
- **Re-score / history:** side-by-side versions with deltas (`+0.8`, `−1.2`) and the
  scorecard version that produced each.
- **Empty / loading / error** states for every data view (skeletons, not spinners, for tables).
- **Motion:** 120–200 ms, standard easing, opacity/transform only; respect reduced motion.

## Charts

Load the built-in `dataviz` skill before any chart. Small hand-built SVG, one axis, legend
for ≥2 series, table alternative, validated palettes for light and dark.

## Responsive

Desktop-first (1280–1440), fully usable at 360px. Sidebar collapses to a horizontal nav
under 960px. No horizontal page scroll (e2e-enforced).

## Sources

Anthropic `frontend-design` skill (claude-plugins-official, Apache-2.0) · built-in `dataviz`
skill · WAI-ARIA APG patterns (w3.org/WAI/ARIA/apg)
