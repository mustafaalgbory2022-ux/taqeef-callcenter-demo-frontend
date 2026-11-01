import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

const ALL = 'from=2026-08-01&to=2026-10-31';

test('live center shows queues, agents and masked callers (simulated)', async ({ page }) => {
  await openSession(page, { path: '/live' });
  await expect(page.getByTestId('live-simulated')).toBeVisible();
  await expect(page.getByRole('heading', { name: '6001 · Sales' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '6002 · After-Sales' })).toBeVisible();
  const callers = page
    .getByRole('region', { name: 'Live calls' })
    .locator('tbody tr td:nth-child(2)');
  await expect(callers.first()).toContainText('••••');
});

test('calls list filters by score band and paginates', async ({ page }) => {
  await openSession(page, { path: `/calls?${ALL}&band=no_score` });
  const rows = page.getByRole('region', { name: 'Calls' }).locator('tbody tr');
  await expect(rows.first()).toContainText('No score');
  await page.goto(`/calls?${ALL}`);
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('1–25 of');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('26–50 of');
});

test('supervisor review requires a note for follow-up and is saved', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-001' });
  const review = page.getByRole('region', { name: 'Supervisor review' });
  await review.getByLabel('Review', { exact: true }).selectOption('needs_follow_up');
  await review.getByRole('button', { name: 'Save review' }).click();
  await expect(review.getByText('Describe the follow-up needed.')).toBeVisible();
  await review.getByLabel('Review note').fill('Check the cancelled add-on was refunded.');
  await review.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByRole('status').getByText('Review saved.')).toBeVisible();
  await expect(review).toContainText('Needs follow-up');
});

test('customer insights drill through to filtered calls', async ({ page }) => {
  await openSession(page, { path: `/insights?${ALL}` });
  await expect(page.getByTestId('insights-total')).toBeVisible();
  await page.getByRole('link', { name: 'View calls — Billing' }).click();
  await expect(page).toHaveURL(/\/calls\?.*reason=billing/);
  await expect(
    page.getByRole('region', { name: 'Calls' }).locator('tbody tr').first(),
  ).toContainText('Billing');
});

test('agent comparison lists agents alphabetically and can hide agents', async ({ page }) => {
  await openSession(page, { path: `/agents?${ALL}` });
  const rows = page.getByRole('region', { name: 'Comparison' }).locator('tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText('Agent A');
  await page.getByRole('checkbox', { name: 'Agent A' }).uncheck();
  await expect(rows).toHaveCount(3);
});

test('reports: audio sample, Excel export, history and simulated email', async ({ page }) => {
  await openSession(page, { path: '/reports' });
  await page.getByLabel('Period', { exact: true }).selectOption('monthly');
  await page.getByLabel('Any date in the period').fill('2026-10-15');
  await expect(page.getByRole('region', { name: 'Queue report' }).first()).toContainText(
    '6001 · Sales',
  );

  await page.getByRole('button', { name: 'Draw sample' }).click();
  const sample = page.getByTestId('audio-sample');
  await expect(sample).toContainText('Sample reference');
  await expect(sample.getByRole('link')).toHaveCount(20); // 5 recordings × 4 agents

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export to Excel' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('taqeef-report-2026-10-01-2026-10-31.xlsx');
  const bytes = readFileSync((await file.path()) ?? '');
  expect(bytes.subarray(0, 2).toString()).toBe('PK');

  await page.getByRole('button', { name: 'Save to report history' }).click();
  const history = page.getByRole('region', { name: 'Report history' }).first();
  await expect(history).toContainText('Monthly report 2026-10-01 – 2026-10-31');
  await history.getByRole('button', { name: /Send email/ }).click();
  await expect(
    page.getByRole('status').getByText('Email simulated — nothing was sent.'),
  ).toBeVisible();
  await expect(history).toContainText('Simulated');
});
