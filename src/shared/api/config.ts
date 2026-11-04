/**
 * Integration settings for the live adapter. These are developer/integration settings,
 * not administrator settings: production serves the app and API from the same origin.
 * Cookie/header names are PROVISIONAL until the backend confirms them.
 */
export const apiConfig = {
  baseUrl: '/api',
  csrfCookieName: 'csrf_token',
  csrfHeaderName: 'X-CSRF-Token',
  /** URL query parameter carrying the one-time launch code. */
  launchCodeParam: 'launch_code',
} as const;

export type ApiMode = 'mock' | 'live';

// The mode is selected at build time through the `@/shared/api/runtime` alias
// (vite.config.ts): mock by default, VITE_API_MODE=live for FastAPI.
