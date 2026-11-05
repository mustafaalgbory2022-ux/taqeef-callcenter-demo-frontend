import { apiConfig } from '@/shared/api/config';

/**
 * Remove the one-time launch code from the address bar and return it. The code arrives in
 * the URL fragment (`/launch#c=<code>`, demo API contract 1.1) so it never reaches a request,
 * a log or a Referer. Must run BEFORE the router is created so later navigations never put it
 * back. The `/launch` entry path is replaced with the app root.
 */
export function takeLaunchCodeFromUrl(): string | null {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  const code = params.get(apiConfig.launchFragmentKey);
  if (!code) return null;
  params.delete(apiConfig.launchFragmentKey);
  const rest = params.toString();
  url.hash = rest;
  if (url.pathname === '/launch') url.pathname = '/';
  window.history.replaceState(window.history.state, '', url.toString());
  return code;
}
