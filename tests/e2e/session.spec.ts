import { expect, test } from '@playwright/test';

test('opens the local demo session with a one-time launch code', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Call Center AI' })).toBeVisible();
  await expect(page.getByText(/login|sign in|mfa/i)).toHaveCount(0);
  await expect(page.getByTestId('data-source')).toHaveAttribute('data-mode', 'mock');
  await page.getByRole('button', { name: 'Open local demo session' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Executive dashboard' })).toBeVisible();
});

test('a launch code in the URL is exchanged once and removed from the address bar', async ({
  page,
}) => {
  await page.goto('/calls?launch_code=SYN-URLCODE-E2E');
  await expect(page.getByRole('heading', { level: 1, name: 'Calls' })).toBeVisible();
  await expect(page).toHaveURL(/\/calls$/);
});

test('a reused launch code is rejected', async ({ page }) => {
  await page.goto('/?launch_code=SYN-REUSED-E2E');
  await expect(page.getByRole('heading', { level: 1, name: 'Executive dashboard' })).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem('taqeef.mock.session'));
  await page.goto('/?launch_code=SYN-REUSED-E2E');
  await expect(page.getByText(/invalid, expired or has already been used/)).toBeVisible();
});
