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
- API types are **derived from Zod schemas** (`z.infer`) in `src/api/contract/`. Never
  hand-write a parallel interface for server data.
- `import type` for type-only imports (lint-enforced).

## React

- Function components and hooks only. Keep components presentational; data access goes
  through `ApiClient` via TanStack Query hooks in the feature (`useCalls`, `useEvaluations`…).
- **Version neutrality:** until ORD-0035's React version is confirmed, avoid React-19-only
  APIs (`use()`, Actions/`useActionState`, `useOptimistic`, ref-as-prop, `<form action>`).
  Code must also run on React 18.
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

react.dev · typescriptlang.org/docs · vite.dev · tanstack.com/query · zod.dev
