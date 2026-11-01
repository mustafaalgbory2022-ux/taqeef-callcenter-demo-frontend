---
name: frontend-testing
description: Testing strategy for the Taqeef frontend — Vitest + Testing Library unit/component tests, Playwright end-to-end tests with axe accessibility checks across AR/EN and light/dark, contract tests for the API layer, and the pre-commit check. Use when writing or changing tests, fixing failing tests, or verifying a feature before commit.
---

# Frontend testing

## Layers

| Layer     | Tool                             | Location              | What                                           |
| --------- | -------------------------------- | --------------------- | ---------------------------------------------- |
| Unit      | Vitest                           | `src/**/*.test.ts`    | pure logic: scoring, formatting, mappers       |
| Component | Vitest + Testing Library (jsdom) | `src/**/*.test.tsx`   | behaviour via roles/labels                     |
| Contract  | Vitest                           | `src/api/*.test.ts`   | ApiClient: URLs, Zod validation, error mapping |
| E2E       | Playwright                       | `tests/e2e/*.spec.ts` | user flows, RTL, themes, responsive, axe       |

## Rules

- Query by role/label/text (`getByRole`), not CSS classes or test ids — except stable
  `data-testid` for non-semantic hooks like `data-source`.
- Test behaviour users see, both languages where text matters.
- Every feature PR adds: unit tests for logic, a component test for key interaction, and an
  e2e flow when it introduces a new screen.
- E2E matrix: desktop + mobile projects; EN/AR × light/dark for new screens; assert no
  horizontal overflow and zero axe violations (wcag2a, wcag2aa, wcag22aa).
- Use synthetic fixtures only. No network calls to real services in tests.
- Never skip or weaken a test to get green; fix the cause.

## Commands

- `npm run check` — typecheck + lint + format + unit tests (run before every commit).
- `npm run test:e2e` — builds, serves on :4173, runs Playwright.
- `@playwright/test` is pinned to the container's pre-installed browser build; do not run
  `playwright install`.

## Sources

vitest.dev · testing-library.com/docs/queries/about · playwright.dev · github.com/dequelabs/axe-core-npm
