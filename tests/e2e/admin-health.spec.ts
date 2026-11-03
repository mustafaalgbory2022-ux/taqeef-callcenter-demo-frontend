import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('shows simulated health, resources, workers and a sanitized, filterable error log', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/health' });
  await expect(page.getByTestId('services')).toContainText('Transcription worker');
  await expect(page.getByTestId('resources').getByRole('meter').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'AI workers' }).last()).toContainText('wrk-asr-1');

  const log = page.getByRole('region', { name: 'Error log' }).last();
  await expect(log).not.toContainText('SYNTHETIC-NOT-REAL');
  await expect(log).not.toContainText('482913');
  await expect(log).toContainText('client_secret=[redacted]');
  await page.getByLabel('Severity').selectOption('critical');
  await expect(log.getByRole('row')).toHaveCount(2);
  await page.getByLabel('Severity').selectOption('');
  await page.getByRole('button', { name: 'Acknowledge — EVAL_TIMEOUT' }).click();
  await expect(page.getByRole('status').getByText('EVAL_TIMEOUT acknowledged.')).toBeVisible();
  await expect(page.getByTestId('error-err-1')).toHaveCount(0);
  await page.getByLabel('Show acknowledged').check();
  await expect(page.getByTestId('error-err-1')).toContainText(
    'Acknowledged by Synthetic administrator',
  );

  await page.getByRole('button', { name: 'Pause queue' }).click();
  await page
    .getByRole('dialog', { name: 'Pause the processing queue?' })
    .getByRole('button', { name: 'Pause queue' })
    .click();
  await expect(page.getByRole('button', { name: 'Resume queue' })).toBeVisible();
});
