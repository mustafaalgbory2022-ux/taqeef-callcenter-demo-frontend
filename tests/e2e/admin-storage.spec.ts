import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('shows capacity, confirms retention changes and moves an item to recovery and back', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/storage' });
  await expect(page.getByTestId('volumes').getByRole('meter')).toHaveCount(4);
  await expect(page.getByText(/One or more volumes are running out of space/)).toBeVisible();

  const form = page.getByRole('form', { name: 'Locations and retention' });
  await form.getByLabel('Retention for Logs and audit history').selectOption('recover_after');
  await form.getByLabel('Days for Logs and audit history').fill('30');
  await form.getByLabel(/Change note/).fill('Expire old logs');
  await form.getByRole('button', { name: 'Save as v2' }).click();
  await expect(form.getByText('Enter 90 to 3650 days.')).toBeVisible();
  await form.getByLabel('Days for Logs and audit history').fill('400');
  await form.getByRole('button', { name: 'Save as v2' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm high-risk storage changes' });
  await expect(confirm).toContainText('older than 400 days');
  await confirm.getByRole('checkbox').check();
  await confirm.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByRole('status').getByText('Storage settings saved as v2.')).toBeVisible();

  const move = page.getByRole('form', { name: 'Move an item to recovery' });
  await move.getByLabel(/^Item ID/).fill('DEMO-002');
  await move.getByLabel(/^Reason/).fill('Synthetic removal request #7');
  await move.getByRole('button', { name: 'Move to recovery' }).click();
  const dialog = page.getByRole('dialog', { name: 'Move DEMO-002 to recovery?' });
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Move to recovery' }).click();
  await expect(page.getByRole('status').getByText('DEMO-002 was moved to recovery.')).toBeVisible();

  await page.getByRole('button', { name: 'Restore — DEMO-002' }).click();
  await page
    .getByRole('dialog', { name: 'Restore DEMO-002?' })
    .getByRole('button', { name: 'Restore' })
    .click();
  await expect(page.getByRole('status').getByText('DEMO-002 was restored.')).toBeVisible();
});
