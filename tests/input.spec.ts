import { expect, test } from '@playwright/test';
import { editor, gotoHost, inputs, textarea, typeAtEnd } from './helpers';

test('keystrokes sync the textarea immediately with BlockNote JSON', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' synced');
  await expect(textarea(page)).toHaveValue(/synced/);
  const blocks = JSON.parse(await textarea(page).inputValue());
  expect(Array.isArray(blocks)).toBe(true);
  expect(blocks.every((b: { type?: string }) => typeof b.type === 'string')).toBe(true);
});

test('every edit dispatches a bubbling input event after the textarea is updated', async ({ page }) => {
  await gotoHost(page);
  expect(await inputs(page)).toEqual([]);

  await typeAtEnd(page, ' abc');
  const seen = await inputs(page, 'editable');
  // One event per BlockNote change (at least one per typed character here).
  expect(seen.length).toBeGreaterThanOrEqual(3);
  expect(seen.every((r) => r.bubbles)).toBe(true);
  // The textarea was already current when the listener ran.
  expect(seen.at(-1)!.notes).toContain(' abc');
  expect(JSON.parse(seen.at(-1)!.notes)).toEqual(JSON.parse(await textarea(page).inputValue()));
});

test('an element listener sees the widget input (target = text-editor) after the native contenteditable input', async ({ page }) => {
  await gotoHost(page);
  await page.evaluate(() => {
    type Rec = { target: string; notes: string };
    (window as unknown as { __onElement: Rec[] }).__onElement = [];
    const el = document.getElementById('editable')!;
    el.addEventListener('input', (e) => {
      (window as unknown as { __onElement: Rec[] }).__onElement.push({
        target: (e.target as HTMLElement).localName,
        notes: el.querySelector('textarea')!.value,
      });
    });
  });
  await typeAtEnd(page, ' x');
  const seen = await page.evaluate(
    () => (window as unknown as { __onElement: { target: string; notes: string }[] }).__onElement,
  );
  // Native `input` from the contenteditable bubbles too (target = ProseMirror div),
  // possibly before the textarea is synced. Hosts must filter on target === element:
  // those events always carry the current document.
  const widget = seen.filter((r) => r.target === 'text-editor');
  expect(widget.length).toBeGreaterThan(0);
  expect(widget.at(-1)!.notes).toContain(' x');
  expect(seen.some((r) => r.target !== 'text-editor')).toBe(true);
});

test('the widget itself never persists: no input without an edit, no non-GET requests', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') writes.push(`${r.method()} ${r.url()}`);
  });
  await gotoHost(page);
  await page.waitForTimeout(500);
  expect(await inputs(page)).toEqual([]);

  await typeAtEnd(page, ' no network');
  await page.waitForTimeout(2000);
  expect(writes).toEqual([]);
});

test('readonly editors never dispatch input', async ({ page }) => {
  await gotoHost(page);
  await editor(page, 'readonly').locator('p').first().click();
  await page.keyboard.type('nope');
  await page.waitForTimeout(300);
  expect(await inputs(page, 'readonly')).toEqual([]);
});

test('.document matches the textarea', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' doc');
  const doc = await page.evaluate(
    () => (document.getElementById('editable') as HTMLElement & { document: unknown }).document,
  );
  expect(doc).toEqual(JSON.parse(await textarea(page).inputValue()));
});
