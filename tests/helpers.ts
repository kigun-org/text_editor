import { expect, type Locator, type Page } from '@playwright/test';

export type InputRecord = { id: string; notes: string; bubbles: boolean };

export async function gotoHost(page: Page) {
  await page.goto('/host.html');
  await expect
    .poll(() => page.evaluate(() => customElements.get('text-editor') != null))
    .toBe(true);
  await expect(page.locator('#editable .bn-editor')).toBeVisible();
}

export function editor(page: Page, id = 'editable'): Locator {
  return page.locator(`#${id} .bn-editor`);
}

export function textarea(page: Page, id = 'editable'): Locator {
  return page.locator(`#${id} > textarea[name="notes"]`);
}

/** Bubbling `input` events seen at document level, with the textarea value at that moment. */
export function inputs(page: Page, id?: string): Promise<InputRecord[]> {
  return page.evaluate(
    (id) => (window.__inputs ?? []).filter((r) => !id || r.id === id),
    id,
  );
}

/** Place the caret at the very end of the last paragraph and type `text`. */
export async function typeAtEnd(page: Page, text: string, id = 'editable') {
  const ed = editor(page, id);
  const last = ed.locator('p').last();
  await last.click();
  // A click lands mid-text; End moves to the line end. Verify instead of hoping.
  await expect
    .poll(async () => {
      await page.keyboard.press('End');
      return last.evaluate((p) => {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode || !p.contains(sel.anchorNode)) return false;
        const range = document.createRange();
        range.selectNodeContents(p);
        range.setStart(sel.anchorNode, sel.anchorOffset);
        return range.toString().length === 0;
      });
    })
    .toBe(true);
  await page.keyboard.type(text);
  await expect(last).toContainText(text);
}

declare global {
  interface Window {
    __inputs: InputRecord[];
    __formSubmissions: Record<string, string>[];
  }
}
