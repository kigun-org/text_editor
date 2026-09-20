import { expect, test } from '@playwright/test';
import { editor, gotoHost, saves, typeAtEnd } from './helpers';

test('importing the bundle defines text-editor without a shadow root', async ({ page }) => {
  await gotoHost(page);
  const info = await page.evaluate(() => ({
    defined: customElements.get('text-editor') != null,
    shadow: document.querySelector('text-editor')!.shadowRoot,
  }));
  expect(info.defined).toBe(true);
  expect(info.shadow).toBeNull();
});

test('mounts the document from the child textarea', async ({ page }) => {
  await gotoHost(page);
  await expect(editor(page)).toContainText('Patient note');
  await expect(editor(page).locator('.tooth-chart')).toBeVisible();
});

test('invalid JSON and a missing child mount an empty paragraph without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await gotoHost(page);
  for (const id of ['invalid', 'empty']) {
    const ed = editor(page, id);
    await expect(ed).toBeVisible();
    await expect(ed.locator('[data-content-type]')).toHaveCount(1);
    await expect(ed.locator('[data-content-type="paragraph"]')).toHaveCount(1);
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('readonly host is not editable and never emits save', async ({ page }) => {
  await gotoHost(page);
  const ed = editor(page, 'readonly');
  await expect(ed).toHaveAttribute('contenteditable', 'false');
  await expect(page.locator('#readonly .bn-side-menu')).toHaveCount(0);

  await ed.locator('p').first().click();
  await page.keyboard.type('nope');
  await expect(ed).not.toContainText('nope');
  await page.waitForTimeout(2000);
  expect((await saves(page)).filter((s) => s.id === 'readonly')).toEqual([]);
});

test('adding readonly at runtime switches to read-only and removing it re-enables', async ({ page }) => {
  await gotoHost(page);
  const ed = editor(page);
  await expect(ed).toHaveAttribute('contenteditable', 'true');

  await page.evaluate(() => document.getElementById('editable')!.setAttribute('readonly', ''));
  await expect(ed).toHaveAttribute('contenteditable', 'false');
  // The document survives the remount.
  await expect(ed).toContainText('Patient note');

  await page.evaluate(() => document.getElementById('editable')!.removeAttribute('readonly'));
  await expect(ed).toHaveAttribute('contenteditable', 'true');
  await typeAtEnd(page, ' back to editing');
});

test('the widget itself performs no HTTP writes', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') writes.push(`${r.method()} ${r.url()}`);
  });
  await gotoHost(page);
  await typeAtEnd(page, ' no network');
  await page.waitForTimeout(2200);
  expect(writes).toEqual([]);
  expect((await saves(page)).length).toBeGreaterThan(0);
});
