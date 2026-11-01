import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('configures sampling, keeps scheduling locked and generates a weekly report', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/reports' });
  await expect(page.getByTestId('scheduling')).toContainText('Not authorized');
  await expect(
    page.getByRole('checkbox', { name: 'Generate and send reports automatically' }),
  ).toBeDisabled();

  const form = page.getByRole('form', { name: 'Sampling and defaults' });
  await form.getByLabel(/Recordings per agent/).fill('0');
  await form.getByRole('button', { name: 'Save as v2' }).click();
  await expect(form.getByText('Enter a whole number from 1 to 20.')).toBeVisible();
  await form.getByLabel(/Recordings per agent/).fill('3');
  await expect(page.getByTestId('policy-warning')).toBeVisible();
  await form.getByLabel(/Change note/).fill('Smaller pilot sample');
  await form.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByRole('status').getByText('Report settings saved as v2.')).toBeVisible();

  await expect(page.getByText(/random sample of 3 answered recordings per agent/)).toBeVisible();
  await page.getByLabel('Email the report after generating it (simulated)').check();
  await page.getByRole('button', { name: 'Generate report' }).click();
  const run = page.getByTestId('report-run');
  await expect(run).toContainText('Weekly report');
  await expect(run).toContainText('Email recorded as simulated');
  await run.getByRole('link', { name: 'Open report history' }).click();
  await expect(page.getByRole('region', { name: 'Report history' }).first()).toContainText(
    'Weekly report',
  );
});
