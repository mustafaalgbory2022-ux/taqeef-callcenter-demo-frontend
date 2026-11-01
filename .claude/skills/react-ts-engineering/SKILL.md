---
name: react-ts-engineering
description: React + TypeScript engineering conventions for the Taqeef demo frontend — component structure, typing, state and data fetching, file layout, and performance budget. Use when creating or modifying any .ts/.tsx file, adding a feature module, hook or dependency.
---

# React + TypeScript engineering

## Structure

- Feature code lives in `src/features/<feature>/` (components, hooks, local styles, tests).
  Shared UI primitives in `src/components/ui/`. App wiring in `src/app/`.
- One component per file; file name = component name. Co-locate `*.module.css` and `*.test.tsx`.
- Import via the `@/` alias. No deep relative paths (`../../..`).

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` are on — do not loosen.
- No `any`. Use `unknown` + narrowing. No non-null `!` unless provably safe and commented.
- Domain types live once in `src/shared/types/domain.ts`. Wire types are inferred from the
  decoders in `src/shared/api/wire/` (`Decoded<typeof decoder>`). Never duplicate them.
- `import type` for type-only imports (lint-enforced).

## React

- Function components and hooks only. Keep components presentational; data access goes
  through `ApiClient` via `useApiQuery` / `useApiMutation` in the feature's `hooks/`.
- Confirmed stack: React 19.3.0, React Router 8.4.0, TypeScript 6.0.3, Vite 8.3.2, Node 24.
  No other runtime dependencies without explicit reconciliation with ORD-0035.
- Derive state instead of syncing it with effects. Effects are for external systems only.
- Lists need stable keys from data ids, never array indexes.
- Every user-visible string comes from `src/i18n/*.json`.

## Performance (lightweight demo)

- Initial JS budget ≈ 150 KB gzip. Lazy-load routes (`React.lazy`) from Phase 1.
- No heavy UI kits or chart libraries; charts are small SVG components.
- Avoid unnecessary re-renders of the transcript list (memoize rows, virtualize only if >500).

## Dependencies

- Pin exact versions. Before adding: check license (MIT/Apache/BSD/ISC preferred), maintainer,
  last release, size, and that it is in the approved stack. Record it in `docs/integration.md`.

## Sources

react.dev · reactrouter.com · typescriptlang.org/docs · vite.dev
