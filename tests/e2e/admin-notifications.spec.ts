import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('configures the Microsoft 365 sender and records simulated deliveries', async ({ page }) => {
  await openSession(page, { path: '/admin/notifications' });
  await expect(page.getByTestId('sender-state')).toContainText('Not configured');
  const form = page.getByRole('form', { name: 'Microsoft 365 sender' });
  await form.getByLabel(/Sender mailbox/).fill('callcenter.ai@example.invalid');
  await form.getByLabel(/Directory \(tenant\) ID/).fill('not-a-guid');
  await form.getByRole('button', { name: 'Save sender' }).click();
  await expect(form.getByText(/Enter the ID as a GUID/).first()).toBeVisible();
  await form.getByLabel(/Directory \(tenant\) ID/).fill('00000000-0000-4000-8000-000000000001');
  await form.getByLabel(/Application \(client\) ID/).fill('00000000-0000-4000-8000-000000000002');
  await form.getByLabel(/Client secret/).fill('synthetic-secret');
  await form.getByRole('button', { name: 'Save sender' }).click();
  await expect(page.getByRole('status').getByText('Sender settings saved.')).toBeVisible();
  await expect(page.getByTestId('sender-state')).toContainText('Configured');

  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByTestId('sender-test-result')).toContainText(
    'Microsoft 365 was not contacted',
  );
  await page.getByLabel('Send a test email to').fill('qa@example.invalid');
  await page.getByRole('button', { name: 'Send test email' }).click();
  await expect(page.getByRole('status').getByText(/nothing was sent/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Delivery history' }).last()).toContainText(
    'qa@example.invalid',
  );
});

test('edits notification rules and templates with validation and preview', async ({ page }) => {
  await openSession(page, { path: '/admin/notifications' });
  await page.getByRole('button', { name: 'Add rule' }).click();
  const rule = page.getByRole('dialog', { name: 'Add notification rule' });
  await rule.getByLabel(/Rule name/).fill('After-sales low score');
  await rule.getByLabel(/Recipients/).fill('lead@example.invalid, not-an-address');
  await rule.getByRole('button', { name: 'Save' }).click();
  await expect(rule.getByText('One or more addresses are not valid.')).toBeVisible();
  await rule.getByLabel(/Recipients/).fill('lead@example.invalid');
  await rule.getByLabel('Threshold').selectOption('custom');
  await rule.getByLabel(/^Custom threshold/).fill('6.5');
  await rule.getByRole('button', { name: 'Save' }).click();
  await expect(
    page.getByRole('status').getByText('Rule “After-sales low score” added.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Test — After-sales low score' }).click();
  await expect(page.getByRole('status').getByText(/Test recorded \(simulated\)/)).toBeVisible();

  await page.getByRole('button', { name: 'Edit — Low-quality alert (English)' }).click();
  const tpl = page.getByRole('dialog', { name: /Edit template/ });
  await tpl.getByLabel(/^Subject/).fill('Quality alert');
  await tpl.getByLabel(/^Body/).fill('Call needs attention: {agent} {score}');
  await expect(tpl.getByTestId('template-check')).toContainText('{call_id} {result}');
  await expect(tpl.getByTestId('template-check')).toContainText('{score}');
  await tpl.getByLabel(/^Subject/).fill('Quality alert: {call_id}');
  await tpl.getByLabel(/^Body/).fill('Call {call_id} ({agent}) scored {result}.');
  await expect(tpl.getByTestId('template-preview')).toContainText(
    'Call DEMO-005 (Agent A (synthetic)) scored 4.00 / 10.',
  );
  await tpl.getByLabel(/Change note/).fill('Shorter alert');
  await tpl.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByRole('status').getByText('Template saved as v2.')).toBeVisible();
});
