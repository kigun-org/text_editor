import { expect, test } from '@playwright/test';
import { editor, gotoHost, inputs, textarea, typeAtEnd } from './helpers';

test('removing the element keeps the textarea current and emits nothing afterwards', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' unsaved edit');
  await expect(textarea(page)).toHaveValue(/unsaved edit/);
  const before = (await inputs(page)).length;

  await page.evaluate(() => {
    const el = document.getElementById('editable')!;
    (window as unknown as { __detached: HTMLElement }).__detached = el;
    el.remove();
  });

  await page.waitForTimeout(500);
  expect((await inputs(page)).length).toBe(before);

  const detached = await page.evaluate(() => {
    const el = (window as unknown as { __detached: HTMLElement }).__detached;
    return {
      root: el.querySelector('[data-text-editor-root]'),
      notes: el.querySelector<HTMLTextAreaElement>(':scope > textarea')!.value,
    };
  });
  expect(detached.root).toBeNull();
  expect(detached.notes).toContain('unsaved edit');
});

test('re-appending the element remounts from the textarea', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' survives detach');

  await page.evaluate(() => {
    const el = document.getElementById('editable')!;
    const parent = el.parentElement!;
    el.remove();
    parent.prepend(el);
  });

  await expect(editor(page)).toBeVisible();
  await expect(editor(page)).toContainText('survives detach');
  await expect(editor(page)).toHaveAttribute('contenteditable', 'true');
});

test('a wrapping form submits the latest notes value', async ({ page }) => {
  await gotoHost(page);
  await typeAtEnd(page, ' via form');
  await page.getByRole('button', { name: 'Submit form' }).click();

  const submissions = await page.evaluate(() => window.__formSubmissions);
  expect(submissions).toHaveLength(1);
  expect(submissions[0].notes).toContain('via form');
  expect(JSON.parse(submissions[0].notes)).toEqual(JSON.parse(await textarea(page).inputValue()));
});

test('removing a clean or readonly editor emits nothing', async ({ page }) => {
  await gotoHost(page);
  await page.evaluate(() => {
    document.getElementById('readonly')!.remove();
    document.getElementById('invalid')!.remove();
  });
  await page.waitForTimeout(300);
  expect(await inputs(page)).toEqual([]);
});
