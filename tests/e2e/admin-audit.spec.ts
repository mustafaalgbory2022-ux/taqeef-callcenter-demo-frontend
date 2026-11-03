import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('searches and filters the audit log and exports with an audit record', async ({ page }) => {
  await openSession(page, { path: '/admin/queues' });
  await page.getByRole('button', { name: 'Disable — 6002 After-Sales' }).click();
  const confirm = page.getByRole('dialog', { name: /Disable queue/ });
  await confirm.getByRole('checkbox').check();
  await confirm.getByRole('button', { name: 'Disable' }).click();
  await expect(page.getByRole('status').getByText(/was disabled/)).toBeVisible();

  await page.goto('/admin/audit');
  const table = page.getByRole('region', { name: 'Audit entries' }).last();
  await page.getByLabel('Object', { exact: true }).selectOption('queue');
  await page.getByLabel('Action', { exact: true }).selectOption('disabled');
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('Queue 6002 disabled');
  await page.getByLabel('From', { exact: true }).fill('2026-12-01');
  await page.getByLabel('To', { exact: true }).fill('2026-11-01');
  await expect(page.getByText('The start date must be on or before the end date.')).toBeVisible();
  await page.getByLabel('From', { exact: true }).fill('');
  await page.getByLabel('To', { exact: true }).fill('');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export to Excel' }).click();
  expect((await download).suggestedFilename()).toMatch(/^taqeef-audit-.*\.xlsx$/);
  await page.getByLabel('Object', { exact: true }).selectOption('audit_log');
  await page.getByLabel('Action', { exact: true }).selectOption('');
  await expect(table).toContainText('Audit log exported');
});
