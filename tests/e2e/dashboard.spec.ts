import { expect, test } from '@playwright/test';
import { clickNav, openSession } from './helpers';

const OCT = 'from=2026-10-01&to=2026-10-31';
const num = (text: string | null) => Number((text ?? '').replace(/[^\d.]/g, ''));

test('executive dashboard applies the approved SLA formula and keeps missed/abandoned separate', async ({
  page,
}) => {
  await openSession(page, { path: `/?${OCT}` });
  const kpis = page.getByTestId('pbx-kpis');
  await expect(kpis).toContainText('Simulated PBX data');
  const tile = (label: string) =>
    kpis.locator('div', { hasText: label }).first().locator('span').nth(1);
  const incoming = num(await tile('Total incoming').textContent());
  const missed = num(await tile('Missed').textContent());
  const expected = Math.floor(((incoming - missed) / incoming) * 100 * 100 + 1e-9) / 100;
  await expect(page.getByTestId('kpi-sla')).toContainText(`${expected.toFixed(2)}%`);
  await expect(kpis).toContainText('Abandoned');

  const queues = page.getByRole('region', { name: 'Queues' }).first();
  await expect(queues).toContainText('6001 · Sales');
  await expect(queues).toContainText('6002 · After-Sales');
  await expect(page.getByTestId('sample-notice')).toContainText('Not a performance ranking');
  await expect(page.getByTestId('kpi-evaluated')).toContainText('insufficient evidence');
});

test('agent filter is stored in the URL and carries to Calls', async ({ page }) => {
  await openSession(page, { path: `/?from=2026-10-20&to=2026-10-24` });
  await page
    .getByRole('combobox', { name: 'Agent', exact: true })
    .selectOption({ label: 'Agent A · SYN-101' });
  await expect(page).toHaveURL(/agent=agt-001/);
  await expect(page).not.toHaveURL(/launch_code/); // never reintroduced by navigation
  await clickNav(page, 'Calls');
  await expect(page).toHaveURL(/\/calls\?agent=agt-001/);
  await expect(page.getByRole('link', { name: 'DEMO-003' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'DEMO-002' })).toHaveCount(0);
});

test('agent dashboard shows PBX figures without a per-agent SLA and clicks through to calls', async ({
  page,
}) => {
  await openSession(page, { path: '/agents/agt-004?from=2026-10-24&to=2026-10-24' });
  await expect(page.getByRole('heading', { level: 1, name: 'Agent D' })).toBeVisible();
  await expect(page.getByTestId('agent-pbx')).toContainText('Answered');
  await expect(page.getByTestId('agent-pbx')).not.toContainText('SLA');
  await expect(page.getByTestId('sample-notice')).toBeVisible();
  await page.getByRole('link', { name: 'DEMO-005' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Router setup' })).toBeVisible();
  await expect(page.getByTestId('overall-score')).toContainText('5.00');
  await expect(page.getByTestId('overall-score')).toContainText('5 of 10 assessable points');
});

test('version filter restricts quality figures to one scorecard version', async ({ page }) => {
  await openSession(page, { path: `/?${OCT}` });
  const before = num(await page.getByTestId('kpi-evaluated').locator('span').nth(1).textContent());
  await page.getByRole('combobox', { name: 'Scorecard' }).selectOption('2');
  await expect(page).toHaveURL(/version=2/);
  await expect
    .poll(async () =>
      num(await page.getByTestId('kpi-evaluated').locator('span').nth(1).textContent()),
    )
    .toBeLessThan(before);
});
