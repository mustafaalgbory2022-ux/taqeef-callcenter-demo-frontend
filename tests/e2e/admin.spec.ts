import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, openSession } from './helpers';

async function addAgent(page: Page, name: string, ext: string) {
  await page.getByRole('button', { name: 'Add agent' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add agent' });
  await dialog.getByRole('textbox', { name: 'Agent', exact: true }).fill(name);
  await dialog.getByLabel(/Extension/).fill(ext);
  await dialog.getByLabel('Billing').check();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
}

test('validates, adds, disables and audits agents', async ({ page }) => {
  await openSession(page, { path: '/admin/agents' });
  await page.getByRole('button', { name: 'Add agent' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add agent' });
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText("Enter the agent's name.")).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Agent', exact: true }).fill('Agent E');
  await dialog.getByLabel(/Extension/).fill('syn-101');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(
    dialog.getByText('This extension is already assigned to another agent.'),
  ).toBeVisible();
  await dialog.getByLabel(/Extension/).fill('SYN-105');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('Agent E was added.')).toBeVisible();

  await page.getByRole('button', { name: 'Disable — Agent E' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Disable' }).click();
  await expect(page.getByRole('status').getByText('Agent E was disabled.')).toBeVisible();

  await page.getByRole('button', { name: 'History — Agent E' }).click();
  const history = page.getByRole('dialog', { name: /Change history/ });
  await expect(history.getByText('Disabled', { exact: true })).toBeVisible();
  await expect(history.getByText('Created', { exact: true })).toBeVisible();
});

test('supports at least seven agents without layout breakage', async ({ page }) => {
  await openSession(page, { path: '/admin/agents' });
  for (const n of [5, 6, 7, 8]) await addAgent(page, `Agent ${'EFGH'[n - 5]}`, `SYN-10${n}`);
  await page.goto('/');
  const rows = page.getByRole('region', { name: 'Agents (sample)' }).getByRole('row');
  await expect(rows).toHaveCount(9); // header + 8 agents
  await expect(
    page.getByRole('combobox', { name: 'Agent', exact: true }).locator('option'),
  ).toHaveCount(9);
  await expectNoHorizontalOverflow(page);
});

test('an approved penalty rule deducts points only for reliably attributed agent speech', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/scorecard' });
  await expect(page.getByTestId('total-points')).toContainText('10 points in total');
  await page.getByLabel('Penalty points per expression').fill('1');
  await page
    .getByLabel('Deduct from criterion')
    .selectOption({ label: 'Professional language and courtesy' });
  await page
    .getByLabel('Change note')
    .fill('Approved penalty: 1 point from professional language.');
  await page.getByRole('button', { name: 'Save as v3' }).click();
  await expect(page.getByRole('status').getByText('Scorecard saved as version v3.')).toBeVisible();

  await page.goto('/calls/DEMO-005');
  await page.getByRole('button', { name: 'Re-score with latest scorecard' }).click();
  const hits = page.getByRole('region', { name: 'Prohibited expressions' });
  await expect(hits).toContainText('Penalty applied: −1 pt');
  await expect(page.getByTestId('criterion-c-language')).toContainText('0 / 2 pts');
  await expect(page.getByTestId('overall-score')).toContainText('4.00'); // 4 of 10 points
});

test('editing the scorecard creates a new immutable version', async ({ page }) => {
  await openSession(page, { path: '/admin/scorecard' });
  await page.getByLabel('Low-score threshold').fill('7.5');
  await page.getByRole('button', { name: 'Save as v3' }).click();
  await expect(page.getByText('Describe what changed.')).toBeVisible();
  await page.getByLabel('Change note').fill('Raised the threshold for the demo.');
  await page.getByRole('button', { name: 'Save as v3' }).click();
  await expect(page.getByRole('status').getByText('Scorecard saved as version v3.')).toBeVisible();
  await expect(page.getByText('Raised the threshold for the demo.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save as v4' })).toBeDisabled();
});
