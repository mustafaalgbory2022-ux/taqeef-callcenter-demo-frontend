import { expect, test } from '@playwright/test';
import { clickNav, gotoInApp, openSession } from './helpers';

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
  // Agent pages are linked alphabetically with no figures: no ranking or comparison.
  const agentList = page.getByRole('list', { name: 'Agent pages' });
  await expect(agentList.getByRole('link')).toHaveText([
    'Agent A',
    'Agent B',
    'Agent C',
    'Agent D',
  ]);
  await expect(agentList).not.toContainText(/\d\.\d\d|\/ 10|best|worst|rank/i);
  await expect(page.getByTestId('kpi-average')).toContainText('Based on 4 calls');
  // Five-call demo: no PBX/SLA/missed/abandoned figures are shown or derived from recordings.
  await expect(page.getByTestId('pbx-panel')).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText(/SLA|Missed|Abandoned/);

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
  await expect(page).not.toHaveURL(/#c=|launch_code/); // never reintroduced by navigation
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

test('an agent page shows the agent’s own average, with no name in the title', async ({ page }) => {
  await openSession(page, { path: '/agents/agt-001' });
  await expect(page.getByRole('heading', { level: 1, name: 'Agent A' })).toBeVisible();
  await expect(page.getByTestId('kpi-average')).toContainText('Based on');
  await expect(page).toHaveTitle(/Agent performance/);
  await expect(page).not.toHaveTitle(/Agent A/);
});

test('scores render from the backend display_hundredths, truncated', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-001' });
  const value = page.getByTestId('overall-score').locator('[data-hundredths]');
  await expect(value).toHaveAttribute('data-hundredths', '900');
  await expect(value).toContainText('9.00');
  await gotoInApp(page, '/calls');
  const scored = page.locator('[data-hundredths]');
  await expect(scored.first()).toBeVisible();
  for (const el of await scored.all()) {
    const d = Number(await el.getAttribute('data-hundredths'));
    await expect(el).toContainText(`${Math.floor(d / 100)}.${String(d % 100).padStart(2, '0')}`);
  }
});
