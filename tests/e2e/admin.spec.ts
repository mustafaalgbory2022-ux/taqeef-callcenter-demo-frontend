import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, openSession, gotoInApp } from './helpers';

async function addAgent(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add agent' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add agent' });
  await dialog.getByRole('textbox', { name: 'Agent', exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
}

test('validates, adds, retires and audits agents (create and retire only)', async ({ page }) => {
  await openSession(page, { path: '/admin/agents' });
  await page.getByRole('button', { name: 'Add agent' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add agent' });
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText("Enter the agent's name.")).toBeVisible();
  // Contract v0.3 §4: the name only (no extension field).
  await expect(dialog.getByLabel(/Extension/)).toHaveCount(0);
  await dialog.getByRole('textbox', { name: 'Agent', exact: true }).fill('Agent [NUMBER]');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText(/masking token/)).toBeVisible();
  // Server-side name rule (simulated): digits are refused, the value is never echoed.
  await dialog.getByRole('textbox', { name: 'Agent', exact: true }).fill('Agent 5');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText('Names cannot contain digits.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Agent', exact: true }).fill('Agent E');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('Agent E was added.')).toBeVisible();

  // Names are immutable: there is no edit or reactivate action (contract v0.2.1 §A).
  await expect(page.getByRole('button', { name: /^Edit/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retire — Agent E' }).click();
  const confirm = page.getByRole('dialog', { name: 'Retire Agent E?' });
  await expect(confirm).toContainText('cannot be reactivated');
  await confirm.getByRole('button', { name: 'Retire' }).click();
  await expect(page.getByRole('status').getByText('Agent E was retired.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retire — Agent E' })).toHaveCount(0);

  // A retired name is never reused (normalized, case-insensitive).
  await page.getByRole('button', { name: 'Add agent' }).click();
  const again = page.getByRole('dialog', { name: 'Add agent' });
  await again.getByRole('textbox', { name: 'Agent', exact: true }).fill('  agent   e ');
  await again.getByRole('button', { name: 'Save' }).click();
  await expect(again.getByText(/already used by another agent/)).toBeVisible();
  await again.getByRole('button', { name: 'Cancel' }).click();

  // No history route exists in contract v0.3: no history action is offered.
  await expect(page.getByRole('button', { name: /^History/ })).toHaveCount(0);
  await expect(
    page.getByRole('row', { name: /Agent E/ }).getByText('Retired', { exact: true }),
  ).toBeVisible();
});

test('a retired agent leaves the upload choices but stays in historical views', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/agents' });
  await page.getByRole('button', { name: 'Retire — Agent B' }).click();
  await page
    .getByRole('dialog', { name: 'Retire Agent B?' })
    .getByRole('button', { name: 'Retire' })
    .click();
  await expect(page.getByRole('status').getByText('Agent B was retired.')).toBeVisible();
  await gotoInApp(page, '/calls/upload');
  const upload = page.getByRole('combobox', { name: 'Agent', exact: true });
  await expect(upload.locator('option', { hasText: 'Agent B' })).toHaveCount(0);
  await expect(upload.locator('option', { hasText: 'Agent A' })).toHaveCount(1);
  // DEMO-002 (Agent B) keeps its agent in the call list and the agent filter.
  await gotoInApp(page, '/calls');
  await expect(page.getByRole('row', { name: /DEMO-002/ })).toContainText('Agent B');
  await gotoInApp(page, '/agents/agt-002');
  await expect(page.getByRole('heading', { level: 1, name: 'Agent B' })).toBeVisible();
});

test('supports at least seven agents without layout breakage', async ({ page }) => {
  await openSession(page, { path: '/admin/agents' });
  for (const n of [5, 6, 7, 8]) await addAgent(page, `Agent ${'EFGH'[n - 5]}`);
  await gotoInApp(page, '/');
  // Links only: no comparative agent table (contract v0.2.1 §B).
  const links = page.getByRole('list', { name: 'Agent pages' }).getByRole('link');
  await expect(links).toHaveCount(8);
  await expect(page.getByRole('region', { name: 'Agents (sample)' })).toHaveCount(0);
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

  await gotoInApp(page, '/calls/DEMO-005');
  await page.getByRole('button', { name: 'Re-score with latest scorecard' }).click();
  const hits = page.getByRole('region', { name: 'Prohibited expressions' });
  await expect(hits).toContainText('Penalty applied: 1 point deducted');
  await expect(page.getByTestId('criterion-c-language')).toContainText('0 of 2 points');
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
