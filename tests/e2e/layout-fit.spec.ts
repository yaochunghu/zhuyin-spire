import { expect, test, type Page } from '@playwright/test';

// Playtest v0.4.2 (M1, M2): the parent coach must never sit on top of a map
// dot, and the campfire's three choices must fit on screen without scrolling.

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('layout-fit-keep')) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('layout-fit-keep', '1');
  });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

function sizeLabel(page: Page): string {
  const size = page.viewportSize()!;
  return `${size.width}x${size.height}`;
}

async function startResonanceRun(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
}

/** Scroll every dot into the map panel and report any whose centre is covered. */
async function coveredDots(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((dotSelector) => {
    const covered: string[] = [];
    for (const dot of document.querySelectorAll<HTMLElement>(dotSelector)) {
      // elementFromPoint flushes layout itself, so no frame wait is needed.
      dot.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const rect = dot.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
        covered.push(`${dot.dataset.nodeId}: centre off screen at ${x},${y}`);
        continue;
      }
      const hit = document.elementFromPoint(x, y);
      if (!hit || !dot.contains(hit)) {
        const owner = hit?.closest('aside, button, div') as HTMLElement | null;
        covered.push(`${dot.dataset.nodeId}: hit ${owner?.className ?? hit?.tagName ?? 'nothing'}`);
      }
    }
    return covered;
  }, selector);
}

/** Without scrolling, every available dot the map shows must take its own taps. */
async function coveredVisibleDots(page: Page): Promise<{ visible: number; covered: string[] }> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.map-panel')!.getBoundingClientRect();
    let visible = 0;
    const covered: string[] = [];
    for (const dot of document.querySelectorAll<HTMLElement>('.map-dot.available')) {
      const rect = dot.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < panel.left || x > panel.right || y < panel.top || y > panel.bottom) continue;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      visible += 1;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !dot.contains(hit)) {
        const owner = hit?.closest('aside, button, div') as HTMLElement | null;
        covered.push(`${dot.dataset.nodeId}: hit ${owner?.className ?? hit?.tagName ?? 'nothing'}`);
      }
    }
    return { visible, covered };
  });
}

async function expectCoachClearOfDots(page: Page): Promise<void> {
  await expect(page.locator('.map-dot.available').first()).toBeAttached();
  await page.waitForTimeout(300);
  // The map scrolls the next rooms into view after it renders; on a slow
  // runner that can land after the first measurement, so wait for it.
  await expect
    .poll(async () => (await coveredVisibleDots(page)).visible, {
      message: 'an available dot should be on screen',
      timeout: 6_000,
    })
    .toBeGreaterThan(0);
  const before = await coveredVisibleDots(page);
  expect(before.covered).toEqual([]);
  expect(await coveredDots(page, '.map-dot.available')).toEqual([]);
  expect(await coveredDots(page, '.map-dot')).toEqual([]);
}

test('the parent coach never covers a map dot', async ({ page }, testInfo) => {
  // Several full map loads; WebKit on a shared CI runner can need more than 30s.
  test.slow(testInfo.project.name.includes('webkit'));
  test.skip(
    !['landscape-wide', 'phone-landscape-chromium', 'phone-landscape-webkit'].includes(
      testInfo.project.name,
    ),
  );
  await startResonanceRun(page);
  await expect(page.locator('.map-stage .adult-coach')).toBeVisible();
  await expectCoachClearOfDots(page);
  await page.screenshot({ path: `test-results/layout-fit/map-${sizeLabel(page)}.png` });

  // Whatever the coach's state, flipping it must not cover a dot either.
  await page.locator('.map-stage .adult-coach-head').click();
  await expectCoachClearOfDots(page);
  await page.screenshot({ path: `test-results/layout-fit/map-coach-toggled-${sizeLabel(page)}.png` });

  // Continue re-enters the map through the title; it must stay clear too.
  await page.reload();
  await page.getByRole('button', { name: '繼續爬塔' }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  await expectCoachClearOfDots(page);

  // A tap on an available dot's centre enters that room.
  // (The dot's pulse animation never settles, so skip Playwright's stability wait.)
  const centre = await page.evaluate(() => {
    const dot = document.querySelector<HTMLElement>('.map-dot.available')!;
    dot.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = dot.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await page.mouse.click(centre.x, centre.y);
  await expect(page.locator('.map-stage')).toBeHidden();
});

test('all three campfire choices fit on screen without scrolling', async ({ page }, testInfo) => {
  // Starts a real run, then loads the rest screen; WebKit on a shared CI runner can need more than 30s.
  test.slow(testInfo.project.name.includes('webkit'));
  test.skip(
    ![
      'landscape-wide',
      'phone-landscape-chromium',
      'phone-landscape-webkit',
      'phone-portrait-webkit',
    ].includes(testInfo.project.name),
  );
  // Start like a real player so the coach opens the way it does in play.
  await startResonanceRun(page);
  await page.evaluate(async () => {
    await (
      window as Window & { __zhuyinVisualReview: (screen: string) => Promise<void> }
    ).__zhuyinVisualReview('rest');
  });
  const choices = page.locator('.rest-choice');
  await expect(choices).toHaveCount(3);
  await page.waitForTimeout(400);
  for (const choice of await choices.all()) {
    await expect(choice).toBeInViewport({ ratio: 1 });
  }
  const scrolled = await page.evaluate(() => ({
    window: window.scrollY,
    screen: document.querySelector('.rest-screen, .screen')?.scrollTop ?? 0,
  }));
  expect(scrolled).toEqual({ window: 0, screen: 0 });
  await page.screenshot({ path: `test-results/layout-fit/rest-${sizeLabel(page)}.png` });
});

async function debugAction(page: Page, rowName: string, buttonName: string): Promise<void> {
  if (!(await page.locator('.debug-panel').isVisible())) {
    await expect(page.locator('#zhuyin-debug-root')).toBeAttached();
    await page.getByRole('button', { name: '開啟暫停選單' }).click({ force: true });
    await page.getByRole('button', { name: '🐛 測試工具' }).click({ force: true });
    await expect(page.locator('.debug-panel')).toBeVisible();
  }
  await page
    .locator('.debug-row')
    .filter({ hasText: rowName })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
  await page.locator('.debug-head .debug-btn-icon').click({ force: true });
  await expect(page.locator('.debug-panel')).toBeHidden();
}

test('the shop remove button is disabled until it can be afforded', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-landscape-chromium');
  await page.goto('/?debug=1');
  await page.evaluate(async () => {
    await (
      window as Window & { __zhuyinVisualReview: (screen: string) => Promise<void> }
    ).__zhuyinVisualReview('shop');
  });
  const remove = page.locator('.shop-remove-btn');
  await expect(remove).toBeEnabled();

  await debugAction(page, 'Gold', '0');
  await expect(remove).toBeDisabled();
  await expect(remove).toHaveAttribute('aria-label', /金幣不夠/);
  for (const card of await page.locator('.shop-card').all()) {
    await expect(card).toBeDisabled();
  }
  await page.screenshot({ path: `test-results/layout-fit/shop-poor-${sizeLabel(page)}.png` });

  await debugAction(page, 'Gold', '+50');
  await expect(remove).toBeEnabled();
  await remove.click();
  await expect(page.locator('.remove-screen')).toBeVisible();
});
