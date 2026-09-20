import { expect, test } from '@playwright/test';
import { editor, gotoHost, inputs, saves, textarea, typeAtEnd } from './helpers';

test('keystrokes sync the textarea immediately', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' synced');
  await expect(textarea(page)).toHaveValue(/synced/);
  const value = await textarea(page).inputValue();
  const blocks = JSON.parse(value);
  expect(Array.isArray(blocks)).toBe(true);
  expect(blocks.every((b: { type?: string }) => typeof b.type === 'string')).toBe(true);
});

test('each edit dispatches a bubbling input event before the debounced save', async ({ page }) => {
  await gotoHost(page);
  expect(await inputs(page)).toEqual([]);

  await typeAtEnd(page, ' stale');
  const seen = await inputs(page);
  expect(seen.length).toBeGreaterThan(0);
  expect(new Set(seen)).toEqual(new Set(['editable']));
  // No save yet: the host can show "stale" before anything is persisted.
  expect(await saves(page)).toEqual([]);

  await expect.poll(async () => (await saves(page)).length, { timeout: 3000 }).toBe(1);
});

test('readonly editors never dispatch input', async ({ page }) => {
  await gotoHost(page);
  await editor(page, 'readonly').locator('p').first().click();
  await page.keyboard.type('nope');
  await page.waitForTimeout(300);
  expect((await inputs(page)).filter((id) => id === 'readonly')).toEqual([]);
});

test('save is debounced ~1500 ms and carries the textarea JSON', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' debounced');
  const typedAt = Date.now();

  await page.waitForTimeout(1000);
  expect(await saves(page)).toEqual([]);

  await expect.poll(async () => (await saves(page)).length, { timeout: 3000 }).toBe(1);
  expect(Date.now() - typedAt).toBeGreaterThanOrEqual(1400);

  const [save] = await saves(page);
  expect(save.id).toBe('editable');
  expect(save.bubbles).toBe(true);
  expect(save.detail).toContain('debounced');
  expect(JSON.parse(save.detail)).toEqual(JSON.parse(await textarea(page).inputValue()));

  // Nothing else fires without another edit.
  await page.waitForTimeout(2000);
  expect((await saves(page)).length).toBe(1);
});

test('each edit burst produces one save', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' alpha-one');
  await expect.poll(async () => (await saves(page)).length, { timeout: 3000 }).toBe(1);

  await typeAtEnd(page, ' beta-two');
  await expect.poll(async () => (await saves(page)).length, { timeout: 3000 }).toBe(2);
  const [, second] = await saves(page);
  expect(second.detail).toContain('alpha-one beta-two');
});

test('save events target the text-editor element and bubble to document', async ({ page }) => {
  await gotoHost(page);
  await page.evaluate(() => {
    (window as unknown as { __onElement: string[] }).__onElement = [];
    document.getElementById('editable')!.addEventListener('save', (e) => {
      (window as unknown as { __onElement: string[] }).__onElement.push(
        (e.target as HTMLElement).id,
      );
    });
  });
  await typeAtEnd(page, ' targeted');
  await expect.poll(async () => (await saves(page)).length, { timeout: 3000 }).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { __onElement: string[] }).__onElement)).toEqual([
    'editable',
  ]);
});
