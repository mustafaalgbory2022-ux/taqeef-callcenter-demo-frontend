import { expect, test } from '@playwright/test';
import { openSession } from './helpers';

test('creates users with unique emails, confirms role changes and shows effective access', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/users' });
  await page.getByRole('button', { name: 'Add user' }).click();
  const form = page.getByRole('dialog', { name: 'Add user' });
  await form.getByLabel(/^Name/).fill('Quality analyst');
  await form.getByLabel(/^Username/).fill('quality.analyst');
  await form.getByLabel(/^Email/).fill('Quality.Lead@example.invalid');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Another account already uses this email address.')).toBeVisible();
  await form.getByLabel(/^Email/).fill('analyst@example.invalid');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('Quality analyst was added.')).toBeVisible();
  await expect(page.getByTestId('user-quality.analyst')).toContainText('Verification pending');

  await page.getByRole('button', { name: 'Edit — Quality analyst' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit Quality analyst' });
  await edit.getByLabel(/^Role/).selectOption('admin');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(edit.getByText('Confirm the sensitive change before saving.')).toBeVisible();
  await edit.getByLabel('I confirm this sensitive account change.').check();
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').getByText('Quality analyst was updated.')).toBeVisible();

  await page.getByRole('button', { name: 'Access — Operations viewer (synthetic)' }).click();
  const access = page.getByTestId('effective-access');
  await expect(access).toContainText('Cannot sign in');
  await expect(access).toContainText('The account is locked after failed sign-ins.');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Disable — Synthetic administrator' }).click();
  await expect(
    page
      .getByRole('status')
      .getByText('You cannot disable or change the role of your own account.'),
  ).toBeVisible();
});

test('resets MFA with a reason and resets a password with confirmation', async ({ page }) => {
  await openSession(page, { path: '/admin/users' });
  await page.getByRole('button', { name: 'Reset MFA — Report viewer (synthetic)' }).click();
  const mfa = page.getByRole('dialog', { name: /Reset MFA for/ });
  await mfa.getByLabel("I verified the user's identity through an approved channel.").check();
  await mfa.getByRole('button', { name: 'Reset MFA' }).click();
  await expect(mfa.getByText(/Give a reason of at least 10 characters/)).toBeVisible();
  await mfa.getByLabel(/^Reason/).fill('Ticket SYN-42: lost phone, identity checked by phone');
  await mfa.getByRole('button', { name: 'Reset MFA' }).click();
  await expect(
    page.getByRole('status').getByText('MFA reset for Report viewer (synthetic).'),
  ).toBeVisible();
  await expect(page.getByTestId('user-report.viewer')).toContainText('Not enrolled');

  await page.getByRole('button', { name: 'Reset password — Synthetic supervisor' }).click();
  const reset = page.getByRole('dialog', { name: /Reset the password/ });
  await expect(reset.getByRole('button', { name: 'Reset password' })).toBeDisabled();
  await reset.getByRole('checkbox').check();
  await reset.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('status').getByText(/Password reset recorded/)).toBeVisible();
  await expect(page.getByTestId('user-quality.lead')).toContainText('Must set a new password');
});

test('administers sign-in policy, sessions and lockouts; enrolls MFA on the account page', async ({
  page,
}) => {
  await openSession(page, { path: '/admin/security' });
  await expect(page.getByTestId('auth-mode')).toContainText('Demo launch code (simulated)');
  const policy = page.getByRole('form', { name: 'Sign-in policy' });
  await policy.getByLabel(/Minimum password length/).fill('8');
  await policy.getByRole('button', { name: 'Save as v2' }).click();
  await expect(policy.getByText('Enter a whole number within the allowed range.')).toBeVisible();
  await policy.getByLabel(/Minimum password length/).fill('14');
  await policy.getByLabel(/Change note/).fill('Longer passwords');
  await policy.getByRole('button', { name: 'Save as v2' }).click();
  await expect(page.getByRole('status').getByText('Security policy saved as v2.')).toBeVisible();

  await page.getByRole('button', { name: 'Revoke — report.viewer' }).click();
  await page
    .getByRole('dialog', { name: /Revoke the session/ })
    .getByRole('button', { name: 'Revoke' })
    .click();
  await expect(
    page.getByRole('status').getByText('Session of report.viewer revoked.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Unlock — Operations viewer (synthetic)' }).click();
  await expect(page.getByText('No locked accounts.')).toBeVisible();

  await page.goto('/account/security');
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  await expect(page.getByTestId('qr-placeholder')).toContainText('no secret exists');
  await page.getByLabel(/6-digit code/).fill('12');
  await page.getByRole('button', { name: 'Verify and enroll' }).click();
  await expect(
    page.getByText('Enter the 6-digit code from the authenticator app.').first(),
  ).toBeVisible();
  await page.getByLabel(/6-digit code/).fill('123456');
  await page.getByRole('button', { name: 'Verify and enroll' }).click();
  await expect(page.getByTestId('mfa-card')).toContainText('MFA enrolled');
  await page.getByRole('button', { name: 'Generate new recovery codes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Generate new recovery codes?' });
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Generate new recovery codes' }).click();
  await expect(page.getByTestId('recovery-result')).toContainText(
    'No recovery codes were generated',
  );

  await page.getByLabel(/^New password/).fill('weak');
  await expect(page.getByTestId('password-checklist')).toContainText('At least 14 characters');
});
