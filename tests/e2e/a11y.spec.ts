import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openSession } from './helpers';

const PAGES = [
  '/',
  '/agents/agt-001',
  '/calls',
  '/calls/DEMO-003',
  '/evaluations',
  '/admin/agents',
  '/admin/scorecard',
  '/admin/settings',
];

for (const lang of ['en', 'ar'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${lang}/${theme}: WCAG 2.2 AA, RTL, no overflow, no CSP errors`, async ({ page }) => {
      const errors = await openSession(page, { lang, theme });
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expectNoHorizontalOverflow(page);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map((v) => `${path} ${v.id}: ${v.nodes[0]?.target.join(' ')}`),
        ).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  }
}

test('keyboard: skip link reaches main content', async ({ page }) => {
  await openSession(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});
