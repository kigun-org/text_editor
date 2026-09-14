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
