import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('opens the local demo session with a one-time launch code', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Call Center AI' })).toBeVisible();
  await expect(page.getByText(/login|sign in|mfa/i)).toHaveCount(0);
  await expect(page.getByTestId('data-source')).toHaveAttribute('data-mode', 'mock');
  await page.getByRole('button', { name: 'Open local demo session' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quality overview' })).toBeVisible();
});

test('a launch code in the URL fragment is exchanged once and removed', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/launch#c=SYN-URLCODE-E2E');
  await expect(page.getByRole('heading', { level: 1, name: 'Quality overview' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  // The fragment never reaches a request, and a query-string code is not accepted.
  expect(requests.some((u) => u.includes('SYN-URLCODE-E2E'))).toBe(false);
});

test('a launch code in the query string is ignored', async ({ page }) => {
  await page.goto('/?launch_code=SYN-QUERY-E2E');
  await expect(page.getByRole('button', { name: 'Open local demo session' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Quality overview' })).toHaveCount(0);
});

test('a reused launch code is rejected and a reload needs a new code', async ({ page }) => {
  await page.goto('/#c=SYN-REUSED-E2E');
  await expect(page.getByRole('heading', { level: 1, name: 'Quality overview' })).toBeVisible();
  // The session lives in memory only: a reload returns to the launch screen.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open local demo session' })).toBeVisible();
  await page.goto('/launch#c=SYN-REUSED-E2E');
  await expect(page.getByText(/invalid, expired or has already been used/)).toBeVisible();
});

test('protected audio plays from the call audio source', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-001' });
  const audio = page.locator('audio');
  await expect(audio).toHaveAttribute('src', /^blob:/); // synthetic audio in mock mode
  await expect(page.getByRole('link', { name: /download/i })).toHaveCount(0);
});
