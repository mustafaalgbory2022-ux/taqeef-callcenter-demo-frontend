import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('adds, edits, disables and versions dictionary entries', async ({ page }) => {
  await openSession(page, { path: '/admin/dictionary' });
  await page.getByRole('button', { name: 'Add entry' }).click();
  const form = page.getByRole('dialog', { name: 'Add dictionary entry' });
  await form.getByLabel(/^Term/).fill('هسة');
  await form.getByLabel(/^Standard form/).fill('الآن');
  await form.getByLabel(/Change note/).fill('Add');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('An entry with this term already exists.')).toBeVisible();
  await form.getByLabel(/^Term/).fill('بلكي');
  await form.getByLabel(/^Standard form/).fill('ربما');
  await form.getByLabel(/^Variants/).fill('بلكت، يمكن');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('“بلكي” was added (v1).')).toBeVisible();

  await page.getByLabel('Search terms, variants or meanings').fill('بلكت');
  await expect(
    page.getByRole('region', { name: 'Dictionary entries' }).getByRole('row'),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit — بلكي' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit “بلكي”' });
  await edit.getByLabel(/Meaning/).fill('maybe');
  await edit.getByLabel(/Change note/).fill('Add meaning');
  await edit.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByRole('status').getByText('“بلكي” was saved as v2.')).toBeVisible();

  await page.getByRole('button', { name: 'Disable — بلكي' }).click();
  const status = page.getByRole('dialog', { name: 'Disable “بلكي”?' });
  await status.getByRole('button', { name: 'Disable' }).click();
  await expect(status.getByText('This field is required.')).toBeVisible();
  await status.getByLabel(/Reason/).fill('Too ambiguous');
  await status.getByRole('button', { name: 'Disable' }).click();
  await page.getByRole('button', { name: 'Versions — بلكي' }).click();
  const versions = page.getByRole('list', { name: 'Entry versions' });
  await expect(versions.getByRole('listitem')).toHaveCount(3);
});

test('reviews supervised corrections with the four-eyes rule', async ({ page }) => {
  await openSession(page, { path: '/admin/dictionary' });
  await page.getByRole('button', { name: 'Propose correction' }).click();
  const propose = page.getByRole('dialog', { name: 'Propose a transcript correction' });
  await propose.getByLabel(/^Call/).fill('DEMO-404');
  await propose.getByLabel(/Transcript text/).fill('انترنيت');
  await propose.getByLabel(/Correct form/).fill('إنترنت');
  await propose.getByRole('button', { name: 'Submit for review' }).click();
  await expect(propose.getByText('Unknown call.')).toBeVisible();
  await propose.getByLabel(/^Call/).fill('DEMO-002');
  await propose.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('status').getByText(/Correction proposed/)).toBeVisible();
  await expect(page.getByText('Awaiting another reviewer (own proposal)')).toBeVisible();

  await page.getByRole('button', { name: 'Review — رواتر' }).click();
  const review = page.getByRole('dialog', { name: 'Review correction' });
  await review.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('status').getByText('Correction approved.')).toBeVisible();
  await page.getByLabel('Search terms, variants or meanings').fill('رواتر');
  await expect(page.getByRole('region', { name: 'Dictionary entries' })).toContainText('راوتر');
});
