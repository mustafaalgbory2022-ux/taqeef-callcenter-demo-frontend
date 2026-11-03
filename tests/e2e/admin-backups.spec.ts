import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('runs a simulated backup, verifies it and restores through the wizard', async ({ page }) => {
  await openSession(page, { path: '/admin/backups' });
  await expect(page.getByTestId('migration')).toContainText('Blocked');
  await page.getByRole('button', { name: 'Run manual backup' }).click();
  await expect(
    page.getByRole('status').getByText(/recorded \(simulated — nothing was copied\)/),
  ).toBeVisible();
  const row = page.locator('[data-testid^="backup-BKP-"]').first();
  await expect(row).toContainText('Not verified');

  await row.getByRole('button', { name: /^Restore… — / }).click();
  const wizard = page.getByRole('dialog', { name: /Restore from BKP-/ });
  await wizard.getByRole('radio', { name: /^Full restore/ }).check();
  await expect(wizard.getByText('Verify this backup before a full restore.')).toBeVisible();
  await expect(wizard.getByRole('button', { name: 'Next' })).toBeDisabled();
  await wizard.getByRole('radio', { name: /^Test restore/ }).check();
  await wizard.getByRole('button', { name: 'Next' }).click();
  await wizard.getByRole('button', { name: 'Next' }).click();
  await expect(wizard.getByTestId('restore-impact')).toContainText('isolated area');
  await wizard.getByRole('button', { name: 'Next' }).click();
  await wizard.getByLabel('I confirm this test restore.').check();
  await wizard.getByRole('button', { name: 'Start test restore' }).click();
  await expect(
    page.getByRole('status').getByText(/Restore RST-.* recorded \(simulated\)/),
  ).toBeVisible();

  await row.getByRole('button', { name: /^Verify — / }).click();
  await expect(row).toContainText('Simulated check');
  await row.getByRole('button', { name: /^Restore… — / }).click();
  const full = page.getByRole('dialog', { name: /Restore from BKP-/ });
  await full.getByRole('radio', { name: /^Full restore/ }).check();
  await full.getByRole('button', { name: 'Next' }).click();
  await full.getByRole('button', { name: 'Next' }).click();
  await expect(full.getByTestId('restore-impact')).toContainText('everyone is signed out');
  await full.getByRole('button', { name: 'Next' }).click();
  await full
    .getByLabel('I understand a full restore replaces live data and signs everyone out.')
    .check();
  await expect(full.getByRole('button', { name: 'Start full restore' })).toBeDisabled();
  const id = (await row.locator('td').first().innerText()).trim();
  await full.getByLabel(/Type the backup ID/).fill(id);
  await full.getByRole('button', { name: 'Start full restore' }).click();
  await expect(page.getByRole('region', { name: 'Restore history' })).toContainText('Full restore');
});
