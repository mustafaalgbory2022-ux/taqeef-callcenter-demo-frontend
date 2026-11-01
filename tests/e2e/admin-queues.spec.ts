import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openSession } from './helpers';

test('adds, renumbers with confirmation, assigns agents and disables a queue', async ({ page }) => {
  await openSession(page, { path: '/admin/queues' });
  await page.getByRole('button', { name: 'Add queue' }).click();
  const form = page.getByRole('dialog', { name: 'Add queue' });
  await form.getByLabel(/Queue number/).fill('6001');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Another queue already uses this number.')).toBeVisible();
  await form.getByLabel(/Queue number/).fill('6003');
  await form.getByLabel(/Name \(English\)/).fill('Retention');
  await form.getByLabel(/Name \(Arabic\)/).fill('الاحتفاظ');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('Queue 6003 was added.')).toBeVisible();

  await page.getByRole('button', { name: 'Edit — 6003 Retention' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit queue' });
  await edit.getByLabel(/Queue number/).fill('6004');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(edit.getByText('Confirm the queue number change before saving.')).toBeVisible();
  await edit.getByLabel('I confirm the queue number change.').check();
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('Queue 6004 was updated.')).toBeVisible();

  await page.getByRole('button', { name: 'Agents — 6001 Sales' }).click();
  const agents = page.getByRole('dialog', { name: /Agents in queue 6001/ });
  await agents.getByLabel(/Agent B/).uncheck();
  await expect(agents.getByTestId('assignment-diff')).toContainText('1 to remove');
  await expect(agents.getByRole('button', { name: 'Save' })).toBeDisabled();
  await agents.getByLabel('I confirm removing these agents from the queue.').check();
  await agents.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText(/Assignments for queue 6001/)).toBeVisible();

  await page.getByRole('button', { name: 'Disable — 6004 Retention' }).click();
  const confirm = page.getByRole('dialog', { name: /Disable queue/ });
  await expect(confirm.getByRole('button', { name: 'Disable' })).toBeDisabled();
  await confirm.getByRole('checkbox').check();
  await confirm.getByRole('button', { name: 'Disable' }).click();
  await expect(page.getByRole('status').getByText(/was disabled/)).toBeVisible();

  await page.getByRole('button', { name: 'History — 6004 Retention' }).click();
  const history = page.getByRole('dialog', { name: /Change history · queue 6004/ });
  await expect(history.getByText('Disabled', { exact: true })).toBeVisible();
  await expect(history.getByText('Created', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
