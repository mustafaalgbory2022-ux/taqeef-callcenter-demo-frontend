import { expect, test } from '@playwright/test';
import { clickNav, openSession, syntheticWav } from './helpers';

test('evidence and transcript lines seek the synthetic recording', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-003' });
  await expect(page.getByTestId('criterion-c-language')).toContainText('0 / 2 pts');
  await page.getByTestId('criterion-c-language').getByRole('button').first().click();
  await expect(page.locator('[data-segment-id="s5"]')).toHaveAttribute('aria-current', 'true');
  const time = await page.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime);
  expect(time).toBeGreaterThanOrEqual(27);
  await page.locator('[data-segment-id="s7"]').click();
  await expect(page.locator('[data-segment-id="s7"]')).toHaveAttribute('aria-current', 'true');
});

test('below 6 assessable points the evaluation has no score', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-004' });
  await expect(page.getByTestId('overall-score')).toContainText('Insufficient evidence — No score');
  await expect(page.getByTestId('overall-score')).toContainText('4 of 10 points could be assessed');
  await expect(page.getByTestId('criterion-c-closing')).toContainText('Insufficient evidence');
  await expect(page.getByTestId('criterion-c-greeting')).toContainText('1 / 1 pts');
});

test('prohibited expressions are flagged for review without an approved penalty rule', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-003' });
  const hits = page.getByRole('region', { name: 'Prohibited expressions' });
  await expect(hits).toContainText('مو شغلي');
  await expect(hits).toContainText('Flagged for review');
  await expect(hits).not.toContainText('Penalty applied');
});

test('re-scoring adds an immutable evaluation and a comparison', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-005' });
  await expect(page.getByText('Only one evaluation so far')).toBeVisible();
  await page.getByRole('button', { name: 'Re-score with latest scorecard' }).click();
  await expect(page.getByRole('status').getByText(/Re-scored with scorecard v2/)).toBeVisible();
  await expect(page.getByText('2 immutable evaluations')).toBeVisible();
  await expect(page.getByText('Scorecard changed from v1 to v2.')).toBeVisible();
  // v2 detects the prohibited expression "ما أدري" that v1 did not list.
  await expect(page.getByRole('region', { name: 'Prohibited expressions' })).toContainText(
    'ما أدري',
  );
  await expect(page.getByRole('region', { name: 'Prohibited expressions' })).toContainText(
    'Flagged for review',
  );
});

test('uploads a synthetic file and shows simulated processing', async ({ page }) => {
  await openSession(page, { path: '/calls/upload' });
  await page.getByRole('button', { name: 'Upload and process' }).click();
  await expect(page.getByText('Choose an audio file.')).toBeVisible();
  await expect(page.getByText('Confirm that the recording is synthetic.')).toBeVisible();

  await page
    .getByLabel('Audio file')
    .setInputFiles({ name: 'synthetic.wav', mimeType: 'audio/wav', buffer: syntheticWav() });
  await page.getByLabel('Title').fill('Synthetic upload test');
  await page
    .getByRole('combobox', { name: 'Agent', exact: true })
    .selectOption({ label: 'Agent B · SYN-102' });
  await page.getByLabel(/I confirm this recording is synthetic/).check();
  await page.getByRole('button', { name: 'Upload and process' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Synthetic upload test' }),
  ).toBeVisible();
  await expect(page.getByText('Simulated in the browser')).toBeVisible();

  // The calls list must update by itself when processing finishes (no reload).
  await clickNav(page, 'Calls');
  const row = page.getByRole('row', { name: /Synthetic upload test/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('Scored')).toBeVisible({ timeout: 15_000 });
  await row.getByRole('link').first().click();
  await expect(page.getByTestId('overall-score')).toBeVisible({ timeout: 15_000 });
  // Uploads are a single mixed channel: speakers unresolved, too little assessable.
  await expect(page.getByTestId('mixed-channel')).toBeVisible();
  await expect(page.getByTestId('overall-score')).toContainText('Insufficient evidence — No score');
  await expect(page.locator('[data-segment-id="s1"]')).toContainText('Speaker unresolved');
});
