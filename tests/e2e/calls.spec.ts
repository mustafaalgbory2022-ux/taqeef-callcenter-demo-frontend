import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  clickNav,
  openSession,
  syntheticWav,
  gotoInApp,
  expectNoHorizontalOverflow,
} from './helpers';

test('evidence and transcript lines seek the synthetic recording', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-003' });
  await expect(page.getByTestId('criterion-c-language')).toContainText('0 of 2 points');
  await page.getByTestId('criterion-c-language').getByRole('button').first().click();
  await expect(page.locator('[data-segment-id="seg-0005"]')).toHaveAttribute(
    'aria-current',
    'true',
  );
  const time = await page.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime);
  expect(time).toBeGreaterThanOrEqual(27);
  await page.locator('[data-segment-id="seg-0007"]').click();
  await expect(page.locator('[data-segment-id="seg-0007"]')).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('below 6 assessable points the evaluation has no score', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-004' });
  await expect(page.getByTestId('overall-score')).toContainText('Insufficient evidence — No score');
  await expect(page.getByTestId('overall-score')).toContainText('4 of 10 points could be assessed');
  await expect(page.getByTestId('criterion-c-closing')).toContainText('Insufficient evidence');
  await expect(page.getByTestId('criterion-c-greeting')).toContainText('1 of 1 point');
});

test('prohibited expressions are flagged for review without an approved penalty rule', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-003' });
  const hits = page.getByRole('region', { name: 'Prohibited expressions' });
  await expect(hits).toContainText('مو شغلي');
  await expect(hits).toContainText('Flagged for review');
  await expect(hits).not.toContainText('Penalty applied');
});

test('re-scoring adds an immutable evaluation and a comparison', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-005' });
  await expect(page.getByText('Only one evaluation so far')).toBeVisible();
  await page.getByRole('button', { name: 'Re-score with latest scorecard' }).click();
  await expect(page.getByRole('status').getByText(/Re-scored with scorecard v2/)).toBeVisible();
  await expect(page.getByText('2 immutable evaluations')).toBeVisible();
  await expect(page.getByText('Scorecard changed from v1 to v2.')).toBeVisible();
  // v2 detects the prohibited expression "ما أدري" that v1 did not list.
  await expect(page.getByRole('region', { name: 'Prohibited expressions' })).toContainText(
    'ما أدري',
  );
  await expect(page.getByRole('region', { name: 'Prohibited expressions' })).toContainText(
    'Flagged for review',
  );
});

test('uploads a synthetic file and shows simulated processing', async ({ page }) => {
  await openSession(page, { path: '/calls/upload' });
  await page.getByRole('button', { name: 'Upload and process' }).click();
  await expect(page.getByText('Choose an audio file.')).toBeVisible();
  await expect(page.getByText('Confirm that the recording is synthetic.')).toBeVisible();

  await page
    .getByLabel('Audio file')
    .setInputFiles({ name: 'synthetic.wav', mimeType: 'audio/wav', buffer: syntheticWav() });
  await page.getByLabel('Display name').fill('Synthetic upload test');
  await page
    .getByRole('combobox', { name: 'Agent', exact: true })
    .selectOption({ label: 'Agent B' });
  await page.getByLabel(/I confirm this recording is synthetic/).check();
  await page.getByRole('button', { name: 'Upload and process' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Synthetic upload test' }),
  ).toBeVisible();
  await expect(page.getByText('Simulated in the browser')).toBeVisible();
  // The confirmed pipeline steps are shown while processing (contract v0.2 item C).
  for (const step of ['Uploaded', 'Checking file', 'Transcribing', 'Evaluating']) {
    await expect(page.getByRole('listitem').filter({ hasText: step }).first()).toBeVisible();
  }

  // The calls list must update by itself when processing finishes (no reload).
  await clickNav(page, 'Calls');
  const row = page.getByRole('row', { name: /Synthetic upload test/ });
  await expect(row).toBeVisible();
  // The final call status is the run's explicit outcome, not a generic "Scored".
  await expect(row.locator('[data-status="not_assessable"]')).toBeVisible({ timeout: 15_000 });
  // The list keeps the no-score kind distinct: not assessable, never a generic or 0 score.
  await expect(row.getByText('No score — not assessable')).toBeVisible();
  // Not assessable criteria show their reason code (roles unreliable on a mixed channel).
  await row.getByRole('link').first().click();
  await expect(page.getByTestId('overall-score')).toBeVisible({ timeout: 15_000 });
  // Uploads are a single mixed channel: speakers unknown, so no criterion is assessable.
  // Zero assessable points is "Not assessable — No score" (handoff §7), never a 0 score.
  await expect(page.getByTestId('mixed-channel')).toBeVisible();
  await expect(page.getByTestId('overall-score')).toContainText('Not assessable — No score');
  await expect(page.getByTestId('overall-score')).not.toContainText('/ 10');
  await expect(page.locator('[data-segment-id="seg-0001"]')).toContainText('Speaker unknown');
  await expect(page.getByTestId('criterion-c-greeting')).toContainText('Speaker roles unreliable');
});

test('transcript search finds Arabic spelling variants and steps through matches', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-001' });
  const status = page.getByTestId('transcript-search-status');
  const search = page.getByRole('searchbox', { name: 'Search transcript' });
  // Taa marbuta written as haa still matches "فاتورة" in the synthetic transcript.
  await search.fill('فاتوره');
  const matches = page.locator('[data-segment-id][data-match]');
  await expect(matches.first()).toBeVisible();
  const n = await matches.count();
  await expect(status).toHaveText(`${n} matching lines`);
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(status).toHaveText(`Match 1 of ${n}`);
  await expect(page.getByLabel('Follow playback')).not.toBeChecked();
  await search.press('Shift+Enter');
  await expect(status).toHaveText(n > 1 ? `Match ${n} of ${n}` : `Match 1 of 1`);

  await search.fill('zzzz');
  await expect(status).toHaveText('No matches');
  await expect(page.getByRole('button', { name: 'Next match' })).toBeDisabled();
  await expect(matches).toHaveCount(0);
});

test('transcript search is available in Arabic', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-001', lang: 'ar' });
  await page.getByRole('searchbox', { name: 'بحث في النص' }).fill('فاتورة');
  await expect(page.getByTestId('transcript-search-status')).toContainText('سطور مطابقة');
});

test('evidence segments are located in the run revision, marked and playable by keyboard', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-003' });
  await expect(page.getByTestId('transcript-revision')).toBeVisible();
  const evidenceButton = page.getByTestId('criterion-c-language').getByRole('button').first();
  await evidenceButton.focus();
  await page.keyboard.press('Enter');
  const status = page.getByTestId('evidence-status');
  await expect(status).toContainText('Evidence located at');
  const line = page.locator('[data-segment-id][data-evidence]');
  await expect(line).toHaveCount(1);
  await expect(line).toHaveAttribute('data-segment-id', 'seg-0005');
  // The text shown for the evidence is the referenced line of the transcript revision.
  const quote = (await evidenceButton.locator('[dir="auto"]').innerText()).trim();
  await expect(line).toContainText(quote);
  await expect(status).toContainText(quote);
  await expect(line).toHaveAttribute('aria-current', 'true');

  await page.locator('[data-segment-id="seg-0001"]').click();
  await status.getByRole('button', { name: /^Play from/ }).click();
  await expect(line).toHaveAttribute('aria-current', 'true');
  await status.getByRole('button', { name: 'Go to transcript line' }).click();
  await expect(line).toBeFocused();

  // Search and its navigation still work alongside the evidence mark.
  await page.getByRole('searchbox', { name: 'Search transcript' }).fill(quote.slice(0, 6));
  await expect(page.getByTestId('transcript-search-status')).toContainText('matching line');
  await status.getByRole('button', { name: 'Clear evidence' }).click();
  await expect(page.locator('[data-segment-id][data-evidence]')).toHaveCount(0);
  await expect(status).toBeEmpty();
});

test('evidence location feedback is available in Arabic', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-003', lang: 'ar', theme: 'dark' });
  await expect(page.getByTestId('transcript-revision')).toBeVisible();
  await page.getByTestId('criterion-c-language').getByRole('button').first().click();
  await expect(page.getByTestId('evidence-status')).toContainText('تم تحديد موضع الدليل');
  await expect(page.locator('[data-segment-id][data-evidence]')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('audio keyboard shortcuts play, seek and focus the player but never fire while typing', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-003' });
  const audio = page.locator('audio');
  const paused = () => audio.evaluate((a: HTMLAudioElement) => a.paused);
  const time = () => audio.evaluate((a: HTMLAudioElement) => a.currentTime);
  const announce = page.getByTestId('player-announcement');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveAttribute(
    'aria-keyshortcuts',
    'K',
  );

  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('KeyL');
  await expect(announce).toHaveText('Position 0:05');
  await expect.poll(time).toBeGreaterThanOrEqual(5);
  await page.keyboard.press('KeyJ');
  await expect(announce).toHaveText('Position 0:00');
  await page.keyboard.press('KeyK');
  await expect(announce).toContainText('Playing from');
  await expect.poll(paused).toBe(false);
  await page.keyboard.press('KeyK');
  await expect.poll(paused).toBe(true);

  // Typing in transcript search is never captured; modified keys are left to the browser.
  const search = page.getByRole('searchbox', { name: 'Search transcript' });
  await search.fill('');
  await search.press('KeyK');
  await search.press('KeyL');
  await expect(search).toHaveValue('kl');
  expect(await paused()).toBe(true);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Shift+KeyK');
  expect(await paused()).toBe(true);

  await page.keyboard.press('KeyP');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.getByText('Keyboard shortcuts').click();
  await expect(page.getByTestId('player-shortcuts')).toContainText('Move focus to the player');
});

test('audio shortcuts announce in Arabic and keep evidence highlighting', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-003', lang: 'ar' });
  await page.getByTestId('criterion-c-language').getByRole('button').first().click();
  await expect(page.locator('[data-segment-id][data-evidence]')).toHaveCount(1);
  // Evidence excerpts and indicators never widen the page (mobile RTL regression check).
  await expectNoHorizontalOverflow(page);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('KeyK');
  await expect(page.getByTestId('player-announcement')).toContainText('إيقاف مؤقت عند');
  await page.keyboard.press('KeyL');
  await expect(page.getByTestId('player-announcement')).toContainText('الموضع');
  await expect(page.locator('[data-segment-id][data-evidence]')).toHaveCount(1);
});

test('AI explanations carry a visible advisory label and points read naturally', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-001' });
  const criterion = page.getByTestId('criterion-c-resolution');
  await expect(criterion).toContainText('AI-generated, preliminary, advisory');
  await expect(criterion).toContainText(/\d of 3 points/);
  await expect(page.getByTestId('criterion-c-greeting')).toContainText(/\d of 1 point(?!s)/);
});

test('Arabic shows the advisory label, readable points and 24-hour times', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-001', lang: 'ar' });
  const criterion = page.getByTestId('criterion-c-resolution');
  await expect(criterion).toContainText('مُولَّد بالذكاء الاصطناعي، أوّلي، استشاري');
  await expect(criterion).toContainText(/النقاط: \d من 3/);
  await expect(page.getByRole('main')).not.toContainText(/\d{1,2}:\d{2}\s?[صم](\s|$)/);
});

test('a call page shows the transcript revision its evaluation run was scored on', async ({
  page,
}) => {
  // DEMO-002 was re-transcribed after scoring (synthetic): the run's revision 1 of 2 is shown.
  await openSession(page, { path: '/calls/DEMO-002' });
  await expect(page.getByTestId('transcript-revision')).toHaveText('Transcript revision 1');
  await expect(page.getByTestId('older-revision')).toBeVisible();
  // Evidence resolves against that revision: located, never "different revision".
  await page.getByTestId('criterion-c-greeting').getByRole('button').first().click();
  await expect(page.getByTestId('evidence-status')).toContainText('Evidence located at');
  // A call scored on its latest revision shows no notice.
  await gotoInApp(page, '/calls/DEMO-001');
  await expect(page.getByTestId('transcript-revision')).toHaveText('Transcript revision 1');
  await expect(page.getByTestId('older-revision')).toHaveCount(0);
});

test('Arabic shows the twelve-status labels and the revision notice', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-002', lang: 'ar', theme: 'dark' });
  await expect(page.getByTestId('older-revision')).toContainText('نسخة نص سابقة');
  await gotoInApp(page, '/calls');
  await expect(page.locator('[data-status="insufficient_evidence"]').first()).toHaveText(
    'أدلة غير كافية',
  );
});

test('hiding a call is a soft delete that can be restored (contract v0.3 §5.4)', async ({
  page,
}) => {
  await openSession(page, { path: '/calls/DEMO-005' });
  await page.getByRole('button', { name: 'Hide call' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hide this call?' });
  await expect(dialog).toContainText('nothing is removed');
  await dialog.getByLabel('Reason (optional)').fill('Synthetic duplicate');
  await dialog.getByRole('button', { name: 'Hide call' }).click();
  await expect(page.getByTestId('call-hidden')).toBeVisible();
  // The recording, transcript and evaluation stay available.
  await expect(page.getByTestId('overall-score')).toBeVisible();
  await expect(page.locator('[data-segment-id]').first()).toBeVisible();
  await gotoInApp(page, '/calls');
  await expect(page.getByRole('row', { name: /DEMO-001/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /DEMO-005/ })).toHaveCount(0);
  await gotoInApp(page, '/calls/DEMO-005');
  await page.getByRole('button', { name: 'Restore call' }).click();
  await expect(page.getByTestId('call-hidden')).toHaveCount(0);
  await gotoInApp(page, '/calls');
  await expect(page.getByRole('row', { name: /DEMO-005/ })).toBeVisible();
});

test('Arabic shows the hide and restore wording', async ({ page }) => {
  await openSession(page, { path: '/calls/DEMO-005', lang: 'ar', theme: 'dark' });
  await expect(page.getByRole('button', { name: 'إخفاء المكالمة' })).toBeVisible();
});
