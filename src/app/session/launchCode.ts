import { apiConfig } from '@/shared/api/config';

/**
 * Remove the one-time launch code from the address bar and return it. Must run BEFORE the
 * router is created, otherwise the router keeps the original query string and later
 * navigations (e.g. changing a filter) would put the code back into the URL.
 */
export function takeLaunchCodeFromUrl(): string | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get(apiConfig.launchCodeParam);
  if (!code) return null;
  url.searchParams.delete(apiConfig.launchCodeParam);
  window.history.replaceState(window.history.state, '', url.toString());
  return code;
}
