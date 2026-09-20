import { expect, test } from '@playwright/test';

const room = () => `collab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test('collab host leaves the connecting state and mounts the editor', async ({ page }) => {
  await page.goto(`/?room=${room()}`);
  await expect(page.locator('text-editor .bn-editor')).toBeVisible();
  await expect(page.getByText('Connecting to room…')).toHaveCount(0);
  await expect(page.locator('text-editor .bn-editor')).toContainText('Patient note');
});

test('two tabs on one room sync typed text (BroadcastChannel, no signaling)', async ({ browser }) => {
  test.slow();
  const context = await browser.newContext();
  const id = room();
  const a = await context.newPage();
  const b = await context.newPage();

  await a.goto(`/?room=${id}`);
  await b.goto(`/?room=${id}`);
  const editorA = a.locator('text-editor .bn-editor');
  const editorB = b.locator('text-editor .bn-editor');
  await expect(editorA).toBeVisible();
  await expect(editorB).toBeVisible();

  await editorA.locator('p').last().click();
  await a.keyboard.press('End');
  await a.keyboard.type(' shared across tabs');
  await expect(editorA).toContainText('shared across tabs');
  await expect(editorB).toContainText('shared across tabs', { timeout: 15_000 });

  await context.close();
});
