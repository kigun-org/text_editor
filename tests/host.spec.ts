import { expect, test, type Page } from '@playwright/test';

async function stubSave(page: Page) {
  await page.evaluate(() => {
    const saves: { url: string; notes?: string }[] = [];
    Object.defineProperty(window, '__saves', { value: saves, writable: true });
    const up = (window as Window & { up?: { request?: unknown } }).up ?? {};
    up.request = async (url: string, options?: { params?: { notes?: string } }) => {
      saves.push({ url, notes: options?.params?.notes });
    };
    (window as Window & { up: typeof up }).up = up;
  });
}

test('mounts BlockNote on the data-blocknote host and saves through up.request', async ({
  page,
}) => {
  await page.goto('/');

  const editor = page.locator('[data-blocknote] .bn-editor');
  await expect(editor).toBeVisible();
  await expect(editor).toContainText('Patient note');

  await stubSave(page);

  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' typed from the host test');

  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __saves: unknown[] }).__saves?.length ?? 0), {
      timeout: 8_000,
    })
    .toBeGreaterThan(0);

  const save = await page.evaluate(
    () => (window as unknown as { __saves: { url: string; notes?: string }[] }).__saves[0],
  );
  expect(save.url).toBe('/demo-save');
  expect(save.notes).toContain('typed from the host test');
});

test('slash menu keeps Heading only and puts Dental last', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('[data-blocknote] .bn-editor');
  await expect(editor).toBeVisible();
  await editor.locator('p').last().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');

  const menu = page.locator('.bn-suggestion-menu');
  await expect(menu).toBeVisible();

  const titles = menu.locator('.bn-mt-suggestion-menu-item-title');
  await expect(titles.filter({ hasText: 'Heading' })).toHaveCount(1);
  await expect(titles.filter({ hasText: 'Heading 2' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Toggle List' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Emoji' })).toHaveCount(0);

  const labels = menu.locator('.bn-suggestion-menu-label');
  await expect(labels.last()).toHaveText('Dental');
  await expect(titles.last()).toHaveText('Tooth chart');

  const toothItem = menu.locator('[role="option"]', { hasText: 'Tooth chart' });
  await expect(toothItem.locator('svg')).toBeVisible();
});

test('editor headings use H3 size', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('[data-blocknote] .bn-editor');
  await expect(editor).toBeVisible();

  const headingSize = await editor
    .locator('[data-content-type="heading"]')
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(headingSize).toBe('20.8px');
});

test('dental template still renders existing subheadings', async ({ page }) => {
  await page.goto('/dental.html');

  const editor = page.locator('[data-blocknote] .bn-editor');
  await expect(editor).toBeVisible();
  await expect(editor.locator('h2').first()).toBeVisible();
});
