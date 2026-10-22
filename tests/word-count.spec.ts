import { expect, test } from '@playwright/test';
import { editor, gotoHost, inputs, typeAtEnd } from './helpers';
import { countWords } from '../src/wordCount';

test('counts authored text across formatting, blocks, tables, and captions', () => {
  expect(countWords([
    { type: 'paragraph', content: [
      { type: 'text', text: 'hel' }, { type: 'text', text: 'lo world ' },
      { type: 'link', href: 'https://excluded.test', content: [{ type: 'text', text: 'label' }] },
    ], children: [{ type: 'paragraph', content: [{ type: 'text', text: " well-known can't … 42 中文\twords" }] }] },
    { type: 'table', content: { type: 'tableContent', rows: [{ cells: [
      { content: [{ type: 'text', text: 'one' }] }, [{ type: 'text', text: 'two' }],
    ] }] } },
    { type: 'image', props: { caption: 'a caption', url: 'https://ignored.test' } },
    { type: 'toothChart', props: { teeth: '123' } },
  ])).toBe(12);
  expect(countWords([])).toBe(0);
});

test('limit changes preserve the editor and do not emit input', async ({ page }) => {
  await gotoHost(page);
  await page.evaluate(() => {
    const host = document.getElementById('editable')!;
    (window as any).originalEditor = host.querySelector('.bn-editor');
    host.setAttribute('word-limit', '1');
  });
  await expect(page.locator('#editable .editor-word-count')).toContainText('words over the limit');
  expect(await inputs(page)).toEqual([]);
  expect(await page.evaluate(() => document.querySelector('#editable .bn-editor') === (window as any).originalEditor)).toBe(true);
  await typeAtEnd(page, ' extra words');
  await expect(editor(page)).toContainText('extra words');
  expect((await inputs(page)).length).toBeGreaterThan(0);
  await page.locator('#editable').evaluate(el => el.setAttribute('word-limit', '1000'));
  await expect(page.locator('#editable .editor-word-count-over')).toHaveCount(0);
  await page.locator('#editable').evaluate(el => el.removeAttribute('word-limit'));
  await expect(page.locator('#editable .editor-word-count')).toHaveCount(0);
});

test('read-only editors show counts only with a valid limit', async ({ page }) => {
  await gotoHost(page);
  const host = page.locator('#readonly');
  await expect(host.locator('.editor-word-count')).toHaveCount(0);
  await host.evaluate(el => el.setAttribute('word-limit', '1'));
  await expect(host.locator('.editor-word-count')).toBeVisible();
  for (const value of ['0', '-1', 'abc', '1.5']) {
    await host.evaluate((el, value) => el.setAttribute('word-limit', value), value);
    await expect(host.locator('.editor-word-count')).toHaveCount(0);
  }
});


test('paste, undo, and redo refresh the count at the limit boundary', async ({ page }) => {
  await gotoHost(page);
  await page.evaluate(() => {
    const host = document.createElement('text-editor');
    host.id = 'count-test';
    host.setAttribute('word-limit', '2');
    const field = document.createElement('textarea');
    field.name = 'notes';
    field.value = JSON.stringify([{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }]);
    host.appendChild(field);
    document.body.appendChild(host);
  });
  const host = page.locator('#count-test');
  const counter = host.locator('.editor-word-count');
  await expect(counter).toHaveText('1 / 2 words');
  await host.locator('.bn-editor p').click();
  await page.keyboard.press('End');
  await page.keyboard.insertText(' two three');
  await expect(counter).toHaveText('3 / 2 words — 1 word over the limit');
  await host.evaluate((el: any) => el.undo());
  await expect(counter).toHaveText('1 / 2 words');
  await host.evaluate((el: any) => el.redo());
  await expect(counter).toHaveText('3 / 2 words — 1 word over the limit');
  await host.evaluate(el => el.setAttribute('word-limit', '3'));
  await expect(counter).toHaveText('3 / 3 words');
});
