import { expect, test, type Page } from '@playwright/test';
import { editor, gotoHost, saves } from './helpers';

const room = () => `dental-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function gotoDental(page: Page) {
  await page.goto(`/dental.html?room=${room()}`);
  await expect(page.locator('text-editor .bn-editor')).toBeVisible();
}

test('dental template renders the ODTP heading and a tooth chart', async ({ page }) => {
  await gotoDental(page);
  const ed = page.locator('text-editor .bn-editor');
  await expect(ed.getByText('Oral Diagnosis and Treatment Plan')).toBeVisible();
  await expect(ed.locator('.tooth-chart')).toBeVisible();
  await expect(ed.locator('.tooth-chart__cell')).toHaveCount(32);
});

test('clicking a tooth cycles default -> missing -> warning -> danger -> default', async ({ page }) => {
  await gotoDental(page);
  const tooth = page.locator('text-editor .tooth-chart__cell').first(); // FDI 18
  await expect(tooth).toHaveAttribute('data-state', '0');
  await expect(tooth).toHaveAttribute('aria-label', 'Tooth 18, empty');
  await expect(tooth).toHaveText('8');

  await tooth.click();
  await expect(tooth).toHaveAttribute('data-state', '1');
  await expect(tooth).toHaveAttribute('aria-label', 'Tooth 18, missing');
  await expect(tooth).toHaveClass(/tooth-chart__cell--missing/);
  await expect(tooth).toHaveText('×');

  await tooth.click();
  await expect(tooth).toHaveAttribute('data-state', '2');
  await expect(tooth).toHaveAttribute('aria-label', 'Tooth 18, warning');
  await expect(tooth).toHaveClass(/tooth-chart__cell--warning/);
  await expect(tooth).not.toHaveClass(/--missing/);
  await expect(tooth).toHaveText('8');

  await tooth.click();
  await expect(tooth).toHaveAttribute('data-state', '3');
  await expect(tooth).toHaveAttribute('aria-label', 'Tooth 18, danger');
  await expect(tooth).toHaveClass(/tooth-chart__cell--danger/);

  await tooth.click();
  await expect(tooth).toHaveAttribute('data-state', '0');
  await expect(tooth).toHaveAttribute('aria-label', 'Tooth 18, empty');
  await expect(tooth).not.toHaveClass(/--danger/);
});

test('tooth states are stored as one digit per tooth in props.teeth', async ({ page }) => {
  await gotoHost(page);
  const cells = page.locator('#editable .tooth-chart__cell');
  // basic.json: index 2 (FDI 16) warning, index 29 (FDI 36) danger.
  await expect(cells.nth(2)).toHaveAttribute('data-state', '2');
  await expect(cells.nth(29)).toHaveAttribute('data-state', '3');

  await cells.nth(0).click(); // 18 -> missing
  await cells.nth(8).click(); // 21 -> missing
  await cells.nth(8).click(); // 21 -> warning

  await expect.poll(async () => (await saves(page)).length, { timeout: 3000 }).toBe(1);
  const [save] = await saves(page);
  const chart = JSON.parse(save.detail).find((b: { type: string }) => b.type === 'toothChart');
  expect(chart.props.teeth).toBe('10200000200000000000000000000300');
  expect(chart.props.teeth).toHaveLength(32);
  expect(chart.content).toBeUndefined();
});

test('readonly tooth chart ignores clicks', async ({ page }) => {
  await gotoHost(page);
  const chart = editor(page, 'readonly').locator('.tooth-chart');
  await expect(chart).toHaveClass(/tooth-chart--readonly/);
  const tooth = chart.locator('.tooth-chart__cell').first();
  await tooth.click();
  await page.waitForTimeout(300);
  await expect(tooth).toHaveAttribute('data-state', '0');
  expect((await saves(page)).filter((s) => s.id === 'readonly')).toEqual([]);
});
