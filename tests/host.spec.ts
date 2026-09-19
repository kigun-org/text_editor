import { expect, test, type Page } from '@playwright/test';

const editor = (page: Page) => page.locator('text-editor .bn-editor');

test('defines a text-editor custom element without a shadow root', async ({
  page,
}) => {
  await page.goto('/');

  await expect
    .poll(() => page.evaluate(() => customElements.get('text-editor') != null))
    .toBe(true);
  const host = page.locator('text-editor');
  await expect(host).toBeVisible();
  expect(await host.evaluate((el) => el.shadowRoot)).toBeNull();
});

test('mounts BlockNote and emits a bubbling save event', async ({ page }) => {
  await page.addInitScript(() => {
    const saves: string[] = [];
    Object.defineProperty(window, '__saves', { value: saves, writable: true });
    document.addEventListener('save', (event) => {
      if ((event.target as HTMLElement | null)?.localName !== 'text-editor') {
        return;
      }
      saves.push((event as CustomEvent<string>).detail);
    });
  });

  await page.goto('/?room=host-save');

  await expect(editor(page)).toBeVisible();
  await expect(editor(page)).toContainText('Patient note');

  await editor(page).locator('p').last().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' typed from the host test');
  await expect(editor(page)).toContainText('typed from the host test');

  await expect
    .poll(async () => {
      const saves = await page.evaluate(
        () => (window as unknown as { __saves?: string[] }).__saves ?? [],
      );
      return saves.some((notes) => notes.includes('typed from the host test'));
    }, { timeout: 8_000 })
    .toBe(true);
});

test('slash menu keeps Heading only and puts Other last', async ({ page }) => {
  await page.goto('/');

  await expect(editor(page)).toBeVisible();
  await editor(page).locator('p').last().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');

  const menu = page.locator('.bn-suggestion-menu');
  await expect(menu).toBeVisible();

  const titles = menu.locator('.bn-mt-suggestion-menu-item-title');
  await expect(titles.filter({ hasText: 'Heading' })).toHaveCount(1);
  await expect(titles.filter({ hasText: 'Heading 2' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Toggle List' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Emoji' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Image' })).toHaveCount(1);
  await expect(titles.filter({ hasText: 'Video' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Audio' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'File' })).toHaveCount(0);
  await expect(titles.filter({ hasText: 'Code' })).toHaveCount(0);

  const labels = menu.locator('.bn-suggestion-menu-label');
  await expect(labels).toHaveCount(1);
  await expect(labels.first()).toHaveText('Other');
  await expect(titles.first()).toHaveText('Heading');
  await expect(titles.nth(1)).toHaveText('Paragraph');
  await expect(titles.nth(5)).toHaveText('Table');
  await expect(titles.nth(-4)).toHaveText('Quote');
  await expect(titles.nth(-3)).toHaveText('Divider');
  await expect(titles.nth(-2)).toHaveText('Image');
  await expect(titles.last()).toHaveText('Tooth chart');
  await expect(menu.locator('.bn-suggestion-menu-item-small')).toHaveCount(0);
  await expect(
    menu.locator('.bn-mt-suggestion-menu-item-subtitle').first(),
  ).toBeHidden();

  const toothItem = menu.locator('[role="option"]', { hasText: 'Tooth chart' });
  await expect(toothItem.locator('svg')).toBeVisible();
});

test('slash menu stacks above a sticky visit title', async ({ page }) => {
  await page.goto('/');
  await expect(editor(page)).toBeVisible();
  await editor(page).locator('p').first().click();
  await page.keyboard.press('Home');
  await page.keyboard.type('/');

  const menu = page.locator('.bn-suggestion-menu');
  await expect(menu).toBeVisible();

  const onTop = await page.evaluate(() => {
    const menuEl = document.querySelector('.bn-suggestion-menu');
    if (!menuEl) return false;
    const box = menuEl.getBoundingClientRect();
    const bar = document.createElement('div');
    bar.style.cssText = [
      'position:fixed',
      `top:${box.top}px`,
      `left:${box.left}px`,
      `width:${box.width}px`,
      `height:${Math.min(80, box.height)}px`,
      'z-index:1',
      'background:red',
    ].join(';');
    document.body.append(bar);
    const x = box.left + box.width / 2;
    const y = box.top + Math.min(40, box.height / 2);
    const top = document.elementFromPoint(x, y);
    bar.remove();
    return top?.closest('.bn-suggestion-menu') != null;
  });
  expect(onTop).toBe(true);
});

test('editor headings use H3 size', async ({ page }) => {
  await page.goto('/');

  await expect(editor(page)).toBeVisible();

  const headingSize = await editor(page)
    .locator('[data-content-type="heading"]')
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(headingSize).toBe('20.8px');
});

test('image file panel has a gallery tab that inserts from the JSON list', async ({
  page,
}) => {
  const pixel =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  await page.route('**/*gallery.json*', (route) => {
    if (route.request().resourceType() !== 'fetch') {
      return route.continue();
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        visits: [
          {
            title: 'Sample',
            images: [{ id: 1, url: pixel, thumbnail: pixel }],
          },
        ],
      }),
    });
  });

  await page.goto('/');

  await expect(editor(page)).toBeVisible();
  await editor(page).locator('p').last().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/image');
  await page.keyboard.press('Enter');

  const panel = page.locator('.bn-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('tab', { name: 'Embed' })).toHaveCount(0);

  const galleryItem = panel.locator('.image-gallery__item').first();
  await expect(galleryItem).toBeVisible();
  await expect(galleryItem).toHaveCSS('height', '150px');
  const editorWidth = await editor(page).evaluate((el) => el.getBoundingClientRect().width);
  const panelWidth = await panel.evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(panelWidth - editorWidth * 0.9)).toBeLessThan(8);

  await galleryItem.click();

  const inserted = editor(page).locator('img').first();
  await expect(inserted).toBeVisible();
  await expect(panel).toBeHidden();
  const expectedWidth = await editor(page).evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;font:inherit;';
    probe.textContent = '0'.repeat(65);
    el.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  });
  const imageWidth = await inserted.evaluate((el) => {
    const sized =
      el.closest('[style*="width"]') ??
      el.parentElement ??
      el;
    return sized.getBoundingClientRect().width;
  });
  expect(Math.abs(imageWidth - expectedWidth)).toBeLessThan(16);
});

test('image gallery fetches the host gallery-url', async ({ page }) => {
  const pixel =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  await page.route('**/42/images', (route) => {
    if (route.request().resourceType() !== 'fetch') {
      return route.continue();
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        visits: [
          {
            title: 'Visit one',
            images: [{ id: 9, url: pixel, thumbnail: pixel }],
          },
        ],
      }),
    });
  });

  await page.goto('/?gallery=/42/images');

  await expect(editor(page)).toBeVisible();
  await editor(page).locator('p').last().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/image');
  await page.keyboard.press('Enter');

  const panel = page.locator('.bn-panel');
  await expect(panel.getByRole('heading', { name: 'Visit one' })).toBeVisible();
  await panel.locator('.image-gallery__item').first().click();
  await expect(editor(page).locator('img').first()).toBeVisible();
});

test('dental template still renders existing subheadings', async ({ page }) => {
  await page.goto('/dental.html');

  await expect(editor(page)).toBeVisible();
  await expect(editor(page).locator('h2').first()).toBeVisible();
});
