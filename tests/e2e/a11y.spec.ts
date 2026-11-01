import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openSession } from './helpers';

const PAGES = [
  '/',
  '/live',
  '/agents',
  '/agents/agt-001',
  '/calls',
  '/calls/DEMO-003',
  '/insights',
  '/reports',
  '/evaluations',
  '/admin/agents',
  '/admin/scorecard',
  '/admin/settings',
  '/admin/queues',
  '/admin/ai',
];

for (const lang of ['en', 'ar'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const path of PAGES) {
      test(`${lang}/${theme} ${path}: WCAG 2.2 AA, RTL, no overflow, no CSP errors`, async ({
        page,
      }) => {
        const errors = await openSession(page, { lang, theme, path });
        await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('#main h1')).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expectNoHorizontalOverflow(page);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual(
          [],
        );
        expect(errors).toEqual([]);
      });
    }
  }
}

test('keyboard: skip link reaches main content', async ({ page }) => {
  await openSession(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});
