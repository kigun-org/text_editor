import { expect, test } from '@playwright/test';
import { editor, gotoHost, saves, textarea, typeAtEnd } from './helpers';

test('removing the element cancels the pending save and keeps the textarea current', async ({ page }) => {
  await gotoHost(page);
  await page.evaluate(() => {
    (window as unknown as { __onElement: number }).__onElement = 0;
    document.getElementById('editable')!.addEventListener('save', () => {
      (window as unknown as { __onElement: number }).__onElement += 1;
    });
  });

  await typeAtEnd(page, ' unsaved edit');
  await expect(textarea(page)).toHaveValue(/unsaved edit/);

  // Detach well inside the 1500 ms debounce window.
  await page.evaluate(() => {
    const el = document.getElementById('editable')!;
    (window as unknown as { __detached: HTMLElement }).__detached = el;
    el.remove();
  });

  await page.waitForTimeout(2500);
  expect(await saves(page)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __onElement: number }).__onElement)).toBe(0);

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
  await page.waitForTimeout(500);
  expect(await saves(page)).toEqual([]);
});
