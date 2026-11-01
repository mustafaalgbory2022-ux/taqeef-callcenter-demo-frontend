import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('configures the Yeastar connector, confirms ingestion changes and synchronizes', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/pbx' });
  await expect(page.getByTestId('pbx-status')).toContainText('Not configured');
  await expect(page.getByRole('button', { name: 'Enable ingestion' })).toBeDisabled();

  const form = page.getByRole('form', { name: 'Connection settings' });
  await form.getByLabel(/PBX host/).fill('https://pbx.local/api');
  await form.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    form.getByText('Enter a host name or IPv4 address without http:// or a path.'),
  ).toBeVisible();
  await expect(form.getByText('Enter the API client secret.')).toBeVisible();
  await form.getByLabel(/PBX host/).fill('pbx.local');
  await form.getByLabel(/API client ID/).fill('taqeef01');
  await form.getByLabel(/API client secret/).fill('synthetic-secret');
  await form.getByLabel(/Ingestion start date/).fill('2026-07-01');
  await form.getByRole('button', { name: 'Save settings' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm ingestion changes' });
  await expect(confirm).toContainText('backfill');
  await confirm.getByRole('checkbox').check();
  await confirm.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status').getByText('PBX settings saved.')).toBeVisible();
  await expect(page.getByTestId('credential-state')).toContainText('Credential stored');
  await expect(form.getByLabel(/API client secret/)).toHaveValue('');

  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByTestId('pbx-test-result')).toContainText(
    'no network connection to a PBX was attempted',
  );

  await page.getByRole('button', { name: 'Enable ingestion' }).click();
  await page
    .getByRole('dialog', { name: 'Enable PBX ingestion?' })
    .getByRole('button', { name: 'Enable ingestion' })
    .click();
  await expect(page.getByRole('status').getByText('Ingestion enabled.')).toBeVisible();
  await page.getByRole('button', { name: 'Synchronize now' }).click();
  await expect(page.getByRole('status').getByText(/Synchronization recorded/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Synchronization history' })).toContainText(
    'Simulated',
  );
});
