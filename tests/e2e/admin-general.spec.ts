import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('validates and versions application settings and branding, applying branding at runtime', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/general' });
  await expect(page.getByTestId('branding-status')).toContainText('Neutral placeholder');

  const app = page.getByRole('form', { name: 'Application settings' });
  await app.getByLabel('Sign-in notice (English)').fill('Authorized users only.');
  await app.getByLabel(/Change note/).fill('Add notice');
  await app.getByRole('button', { name: 'Save as v2' }).click();
  await expect(
    app.getByText('Enter the text in both English and Arabic, or leave both empty.'),
  ).toBeVisible();
  await app.getByLabel('Sign-in notice (Arabic)').fill('للمستخدمين المصرح لهم فقط.');
  await app.getByRole('button', { name: 'Save as v2' }).click();
  await expect(
    page.getByRole('status').getByText('Application settings saved as v2.'),
  ).toBeVisible();

  const brand = page.getByRole('form', { name: 'Branding' });
  await brand.getByLabel('Primary colour (light theme)').fill('#cccccc');
  await expect(brand.getByTestId('contrast-light')).toContainText('Below AA');
  await brand.getByLabel('Organization name (English)').fill('Synthetic Org');
  await brand.getByLabel(/Change note/).fill('Try branding');
  await brand.getByRole('button', { name: 'Save as v2' }).click();
  await expect(
    brand.getByText('This colour does not reach the 4.5:1 contrast required for text.'),
  ).toBeVisible();
  await expect(
    brand.getByText('Enter the text in both English and Arabic, or leave both empty.'),
  ).toBeVisible();
  await expect(brand.getByText('Enter the reference of the branding approval.')).toBeVisible();

  await brand.getByLabel('Primary colour (light theme)').fill('#0b5d73');
  await expect(brand.getByTestId('contrast-light')).toContainText('Meets AA');
  await brand.getByLabel('Organization name (Arabic)').fill('مؤسسة تجريبية');
  await brand.getByLabel(/Approval reference/).fill('SYN-APPROVAL-1');
  await expect(page.getByTestId('branding-preview')).toContainText('Synthetic Org');
  await brand.getByRole('button', { name: 'Save as v2' }).click();
  await expect(
    page.getByRole('status').getByText('Branding saved as v2 and applied.'),
  ).toBeVisible();
  await expect(page.getByText('Synthetic Org').first()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue('--brand-primary')),
    )
    .toBe('#0b5d73');

  await page.getByRole('button', { name: 'Load into form — v1' }).last().click();
  await expect(
    page.getByRole('form', { name: 'Branding' }).getByLabel('Organization name (English)'),
  ).toHaveValue('');
});

test('applies the organization default language and theme unless the user chose their own', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/general', noPreferences: true });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const app = page.getByRole('form', { name: 'Application settings' });
  await app.getByLabel(/Default language/).selectOption('ar');
  await app.getByLabel(/Default theme/).selectOption('dark');
  await app.getByLabel(/Change note/).fill('Arabic and dark by default');
  await app.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await page.getByRole('group', { name: 'اللغة' }).getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en'); // personal choice wins
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); // still the default
});
