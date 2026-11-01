import { expect, test } from '@playwright/test';
import { clickNav, openSession } from './helpers';

test('overall dashboard pools per call and labels the sample', async ({ page }) => {
  await openSession(page);
  await expect(page.getByTestId('sample-notice')).toContainText('n = 4');
  await expect(page.getByTestId('sample-notice')).toContainText('Not a performance ranking');
  await expect(page.getByTestId('kpi-evaluated')).toContainText('4');
  // Pooled over the 4 scored calls: (9 + 8 + 3 + 5) / 4 = 6.25. DEMO-004 has insufficient
  // evidence (no score) and is excluded. The mean of agent averages would be 6.33.
  await expect(page.getByTestId('kpi-evaluated')).toContainText('1 with insufficient evidence');
  await expect(page.getByTestId('kpi-average')).toContainText('6.25');
  await expect(page.getByTestId('kpi-low')).toContainText('2');
  const names = page.getByRole('region', { name: 'Agents (sample)' }).getByRole('link');
  await expect(names).toHaveText(['Agent A', 'Agent B', 'Agent C', 'Agent D']);
  await expect(page.getByTestId('pbx-panel')).toContainText('Not available — awaiting PBX data');

  // Compare like with like: one scorecard version only.
  await page.getByRole('combobox', { name: 'Scorecard' }).selectOption('1');
  await expect(page).toHaveURL(/version=1/);
  await expect(page.getByTestId('kpi-evaluated')).toContainText('3');
});

test('agent filter is stored in the URL and carries to Calls', async ({ page }) => {
  await openSession(page);
  await page
    .getByRole('combobox', { name: 'Agent', exact: true })
    .selectOption({ label: 'Agent A · SYN-101' });
  await expect(page).toHaveURL(/agent=agt-001/);
  await expect(page).not.toHaveURL(/launch_code/); // never reintroduced by navigation
  await expect(page.getByTestId('kpi-evaluated')).toContainText('2');
  await expect(page.getByTestId('kpi-average')).toContainText('6.00');
  await clickNav(page, 'Calls');
  await expect(page).toHaveURL(/\/calls\?agent=agt-001/);
  await expect(page.getByRole('link', { name: 'DEMO-002' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'DEMO-003' })).toBeVisible();
});

test('agent dashboard clicks through to the call and its evidence', async ({ page }) => {
  await openSession(page, { path: '/agents/agt-004' });
  await expect(page.getByRole('heading', { level: 1, name: 'Agent D' })).toBeVisible();
  await expect(page.getByTestId('sample-notice')).toContainText('n = 1');
  await expect(page.getByTestId('kpi-average')).toContainText('5.00'); // 5 of 10 points
  await page.getByRole('link', { name: 'DEMO-005' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Router setup' })).toBeVisible();
  await expect(page.getByTestId('overall-score')).toContainText('5.00');
  await expect(page.getByTestId('overall-score')).toContainText('5 of 10 assessable points');
  await expect(page.getByTestId('overall-score')).toContainText('Below threshold');
});
