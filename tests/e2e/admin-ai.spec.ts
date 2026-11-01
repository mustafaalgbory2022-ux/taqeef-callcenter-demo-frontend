import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('validates and saves AI configuration as a new version', async ({ page }) => {
  await openSession(page, { path: '/admin/ai' });
  await expect(page.getByTestId('ai-status')).toContainText('Ready');
  await expect(page.getByRole('button', { name: 'Save as v2' })).toBeDisabled();

  const summary = page.getByLabel(/Summary prompt/);
  await summary.fill('Summarize the call for {audience}.');
  await expect(page.getByTestId('prompt-check-summary')).toContainText('{transcript}');
  await page.getByLabel('Concurrent jobs').fill('12');
  await page.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByText('Enter a whole number within the allowed range.')).toBeVisible();
  await expect(page.getByText('Add the required placeholders.')).toBeVisible();

  await summary.fill('Summarize in two sentences.\n{transcript}');
  await page.getByLabel('Concurrent jobs').fill('3');
  await page.getByLabel('Transcription model').selectOption('syn-asr-small');
  await page.getByLabel('Scorecard for new evaluations').selectOption('pinned');
  await page.getByLabel('Pinned scorecard version').selectOption('1');
  await expect(page.getByTestId('bound-scorecard')).toContainText('scorecard v1');
  await page.getByLabel(/Change note/).fill('Smaller speech model for the pilot.');
  await page.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByRole('status').getByText('AI configuration saved as v2.')).toBeVisible();
  await expect(page.getByTestId('ai-status')).toContainText('Switching model');
  await expect(page.getByRole('region', { name: 'Configuration versions' }).first()).toContainText(
    'Smaller speech model for the pilot.',
  );
  await expect(page.getByRole('button', { name: 'Save as v3' })).toBeDisabled();
});

test('pauses the queue with confirmation and retries a failed job', async ({ page }) => {
  await openSession(page, { path: '/admin/ai' });
  await page.getByRole('button', { name: 'Retry — C-1028-03' }).click();
  await expect(page.getByRole('status').getByText('Job queued for retry.')).toBeVisible();
  await expect(page.getByTestId('job-job-6')).toContainText('Retry limit reached');
  await page.getByRole('button', { name: 'Pause queue' }).click();
  await page
    .getByRole('dialog', { name: 'Pause the processing queue?' })
    .getByRole('button', { name: 'Pause queue' })
    .click();
  await expect(page.getByRole('button', { name: 'Resume queue' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Queue actions' })).toContainText(
    'Processing queue paused',
  );
});
