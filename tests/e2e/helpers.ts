import { expect, type Page } from '@playwright/test';

export interface OpenOptions {
  lang?: 'en' | 'ar';
  theme?: 'light' | 'dark';
  path?: string;
}

/**
 * Open a fresh synthetic session through the one-time launch-code URL flow and collect
 * console errors (including CSP violations) for later assertions.
 */
export async function openSession(
  page: Page,
  { lang = 'en', theme = 'light', path = '/' }: OpenOptions = {},
) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    ([l, t]) => {
      localStorage.setItem('taqeef.lang', l);
      localStorage.setItem('taqeef.theme', t);
    },
    [lang, theme] as const,
  );
  const code = `SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}-E2E`;
  // The launch code travels in the URL fragment only (demo API contract 1.1).
  await page.goto(`${path}#c=${code}`);
  await expect(page.locator('#main')).toBeVisible();
  await expect(page).not.toHaveURL(/#c=|launch_code/);
  return errors;
}

/**
 * Navigate inside the open session without reloading the page: the session (and its CSRF
 * token) lives in memory only, so a reload correctly requires a new launch code.
 */
export async function gotoInApp(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}

/** Navigate with the main menu, opening the mobile menu first when it is collapsed. */
export async function clickNav(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name })
    .click();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** A tiny valid WAV file (synthetic silence) for upload tests. */
export function syntheticWav(seconds = 1): Buffer {
  const rate = 8000;
  const samples = rate * seconds;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}
