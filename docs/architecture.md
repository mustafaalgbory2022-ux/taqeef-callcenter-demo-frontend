# Architecture

```
src/
  app/            App, AppShell (layout, language/theme controls), preferences, design-preview (Phase 0)
  api/
    contract/     Zod schemas + derived types (calls, transcripts, scorecards, evaluations), scoring
    endpoints.ts  single endpoint map (provisional)
    http.ts       fetch wrapper: base URL, Zod validation, FastAPI error mapping
    client.ts     ApiClient interface + implementation (the only data-access surface)
  components/ui/  shared primitives: Card, StatTile, ScoreMeter, BandIcon, DataSourceBadge
  config/         env.ts (validated VITE_* vars), brand.config.ts (logo slot)
  i18n/           en.json, ar.json (i18next-compatible), formatting helpers
  styles/         tokens/primitives.css → tokens/semantic.css → brand.css → base.css
  features/       feature modules (Phase 3+)
  fixtures/       synthetic demo data (Phase 2)
tests/e2e/        Playwright specs
```

## Key decisions

- **One data path.** Mock mode is implemented with MSW at the network layer, so `ApiClient`
  and every hook run identically against synthetic data and the real FastAPI backend.
- **Contract-first.** Zod schemas validate every response; contract drift fails loudly.
- **Tokens, not themes-in-components.** Components reference semantic tokens only; themes and
  branding change values, not code.
- **Logical CSS everywhere** so RTL needs no separate stylesheet.
- **Score model.** 0–10 per criterion; overall = weighted mean (`computeOverallScore`);
  scorecards are versioned and immutable once used; re-scoring creates a new evaluation that
  references the one it supersedes, enabling historical comparison.
