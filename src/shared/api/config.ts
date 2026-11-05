/**
 * Integration settings for the live adapter (developer/integration settings, not
 * administrator settings): the app and API are served from the same loopback origin.
 * Header name and launch fragment key are CONFIRMED by demo API contract 1.1/1.7.
 */
export const apiConfig = {
  baseUrl: '/api',
  /** Sent on every /api request except the exempt routes (contract 1.7, 1.10). */
  csrfHeaderName: 'X-Taqeef-CSRF',
  /** The launch code arrives in the URL fragment `#c=<code>`, never in the query string. */
  launchFragmentKey: 'c',
} as const;

export type ApiMode = 'mock' | 'live';

// The mode is selected at build time through the `@/shared/api/runtime` alias
// (vite.config.ts): mock by default, VITE_API_MODE=live for the local backend.
