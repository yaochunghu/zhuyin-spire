import { expect, test, type Page } from '@playwright/test';

const consoleErrors = new WeakMap<Page, string[]>();

async function openDebug(page: Page): Promise<void> {
  if (await page.locator('.debug-panel').isVisible()) return;
  await expect(page.locator('#zhuyin-debug-root')).toBeAttached();
  await page.getByRole('button', { name: '開啟暫停選單' }).click();
  await page.getByRole('button', { name: '🐛 測試工具' }).click();
  await expect(page.locator('.debug-panel')).toBeVisible();
}

async function debugAction(page: Page, rowName: string, buttonName: string): Promise<void> {
  await openDebug(page);
  await page
    .locator('.debug-row')
    .filter({ hasText: rowName })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
}

async function closeDebug(page: Page): Promise<void> {
  await page.locator('.debug-head .debug-btn-icon').click();
  await expect(page.locator('.debug-panel')).toBeHidden();
}

async function openTutorial(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await debugAction(page, 'Tutorial', 'Start');
  await closeDebug(page);
  await expect(page.locator('.tutorial-step-shield')).toBeVisible();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '注音 ㄇ', exact: true })).toBeEnabled();
}

async function enterHintedSpellAndOpenPauseMenu(page: Page): Promise<void> {
  await page.locator('.hint-btn').click();
  const spell = (await page.locator('.spell-answer').textContent())!.trim();
  await page.evaluate((symbols) => {
    for (const symbol of symbols) {
      const key = [...document.querySelectorAll<HTMLButtonElement>('.spell-key:not([disabled])')]
        .find((button) => button.textContent?.trim() === symbol);
      if (!key) throw new Error(`Missing enabled spell key: ${symbol}`);
      key.click();
    }

    // The final key schedules auto-submit for 380 ms later. Open the menu in
    // this same browser task so a slow CI round trip cannot race that timer.
    const menu = document.querySelector<HTMLButtonElement>('.pause-global-control');
    if (!menu) throw new Error('Missing phone pause menu control');
    menu.click();
  }, [...spell]);
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.html).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

test('phone shell uses one large menu and a keyboard-safe Options sheet', async ({ page }) => {
  await page.goto('/');
  await expectNoPageOverflow(page);
  await expect(page.locator('.desktop-global-control:visible')).toHaveCount(0);
  const menu = page.getByRole('button', { name: '開啟暫停選單' });
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.width).toBeGreaterThanOrEqual(64);
  expect(menuBox!.height).toBeGreaterThanOrEqual(64);

  await menu.click();
  const pauseDialog = page.getByRole('dialog', { name: '遊戲選單' });
  await expect(pauseDialog).toBeVisible();
  await expect(page.getByRole('button', { name: '▶️ 繼續玩' })).toBeFocused();
  await page.getByRole('button', { name: '🔉 小' }).click();
  await page.getByRole('button', { name: '⚙️ 完整選項' }).click();
  await expect(page.getByRole('dialog', { name: '遊戲選項' })).toBeVisible();
  await page.getByRole('button', { name: '2× 快速' }).click();
  await page.getByLabel('新小玩家暱稱，不要填真名').focus();
  await expect(page.getByLabel('新小玩家暱稱，不要填真名')).toBeInViewport();
  await page.getByRole('button', { name: '關閉選項' }).click();
  await expect(page.getByRole('dialog', { name: '遊戲選項' })).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-game-speed', '2');
});

test('phone map keeps routes attached, nodes large, and scrolling internal', async ({ page }) => {
  await page.goto('/?debug=1');
  await debugAction(page, 'Run', 'Map');
  await closeDebug(page);
  await expect(page.locator('.map-stage')).toBeVisible();
  await expectNoPageOverflow(page);

  const nodes = await page.locator('.map-dot').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  expect(nodes.length).toBeGreaterThan(0);
  // Fractional device-pixel rounding can report 47.99999 for a 48 CSS-pixel target.
  expect(Math.min(...nodes.map((node) => node.width))).toBeGreaterThanOrEqual(47.9);
  expect(Math.min(...nodes.map((node) => node.height))).toBeGreaterThanOrEqual(47.9);

  const panel = await page.locator('.map-panel').evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
  expect(panel.pageOverflow).toBe(false);
  await expect(page.locator('.map-phone-progress')).toContainText('/16 層');

  const maxEdgeDistance = await page.locator('.map-edge').evaluateAll((edges) => {
    const center = (id: string) => {
      const node = document.querySelector<HTMLElement>(`.map-dot[data-node-id="${id}"]`)!;
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    return Math.max(
      ...edges.flatMap((edge) => {
        const line = edge as SVGLineElement;
        const matrix = line.ownerSVGElement!.getScreenCTM()!;
        const a = new DOMPoint(Number(line.getAttribute('x1')), Number(line.getAttribute('y1')))
          .matrixTransform(matrix);
        const b = new DOMPoint(Number(line.getAttribute('x2')), Number(line.getAttribute('y2')))
          .matrixTransform(matrix);
        const ca = center(line.dataset.fromNodeId!);
        const cb = center(line.dataset.toNodeId!);
        return [Math.hypot(a.x - ca.x, a.y - ca.y), Math.hypot(b.x - cb.x, b.y - cb.y)];
      }),
    );
  });
  expect(maxEdgeDistance).toBeLessThanOrEqual(1.5);

  const [menuBox, topBox] = await Promise.all([
    page.getByRole('button', { name: '開啟暫停選單' }).boundingBox(),
    page.locator('.map-stage-top').boundingBox(),
  ]);
  expect(menuBox).not.toBeNull();
  expect(topBox).not.toBeNull();
  const overlapsHeaderContent = await page.evaluate(() => {
    const menuRect = document
      .querySelector<HTMLElement>('.pause-global-control')!
      .getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('.map-stage-top .kid-stat')]
      .filter((element) => getComputedStyle(element).display !== 'none')
      .some((element) => {
        const rect = element.getBoundingClientRect();
        return !(
          rect.right <= menuRect.left ||
          rect.left >= menuRect.right ||
          rect.bottom <= menuRect.top ||
          rect.top >= menuRect.bottom
        );
      });
  });
  expect(overlapsHeaderContent).toBe(false);
});

test('combat hand is full-width, equal-height, scrollable, and state survives rotation', async ({
  page,
}, testInfo) => {
  await openTutorial(page);
  await expectNoPageOverflow(page);

  const geometry = await page.evaluate(() => {
    const hand = document.querySelector<HTMLElement>('.hand')!;
    const cards = [...hand.querySelectorAll<HTMLElement>('.card')];
    const action = document.querySelector<HTMLElement>('.combat-action-bar')!;
    return {
      handWidth: hand.getBoundingClientRect().width,
      viewport: window.innerWidth,
      scrollWidth: hand.scrollWidth,
      clientWidth: hand.clientWidth,
      heights: cards.map((card) => card.getBoundingClientRect().height),
      actionHeight: action.getBoundingClientRect().height,
    };
  });
  if (testInfo.project.name.includes('portrait')) {
    expect(geometry.handWidth).toBeGreaterThanOrEqual(geometry.viewport - 20);
  } else {
    expect(geometry.handWidth).toBeGreaterThanOrEqual(240);
  }
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  expect(new Set(geometry.heights.map(Math.round)).size).toBe(1);
  expect(geometry.actionHeight).toBeGreaterThanOrEqual(63.9);
  await expect(page.locator('.combat-action-energy')).toContainText('3/3');
  await expect(page.locator('.end-turn-label')).toBeVisible();

  const hand = page.locator('.hand');
  await hand.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
  await expect
    .poll(() => hand.evaluate((element) => element.scrollLeft + element.clientWidth))
    .toBeGreaterThanOrEqual(geometry.scrollWidth - 2);
  await expect(page.locator('.hand .card').last()).toBeInViewport();

  const before = {
    hp: await page.locator('.kid-hp-num').textContent(),
    cards: await page.locator('.hand .card').count(),
  };
  const enemyHandle = await page.locator('.enemy-slot').elementHandle();
  const nextViewport = testInfo.project.name.includes('portrait')
    ? { width: 640, height: 360 }
    : { width: 360, height: 640 };
  await page.setViewportSize(nextViewport);
  await expect(page.locator('.kid-hp-num')).toHaveText(before.hp!);
  await expect(page.locator('.hand .card')).toHaveCount(before.cards);
  expect(await enemyHandle!.evaluate((node) => node.isConnected)).toBe(true);
  await expectNoPageOverflow(page);
});

test('horizontal card movement does not cast and the pause menu freezes auto-submit', async ({
  page,
}) => {
  await openTutorial(page);
  const card = page.getByRole('button', { name: '注音 ㄇ', exact: true });
  const box = (await card.boundingBox())!;
  await card.dispatchEvent('pointerdown', {
    pointerId: 41,
    pointerType: 'touch',
    button: 0,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
  });
  await card.dispatchEvent('pointermove', {
    pointerId: 41,
    pointerType: 'touch',
    clientX: box.x + box.width / 2 + 60,
    clientY: box.y + box.height / 2 + 4,
  });
  await card.dispatchEvent('pointerup', {
    pointerId: 41,
    pointerType: 'touch',
    button: 0,
    clientX: box.x + box.width / 2 + 60,
    clientY: box.y + box.height / 2 + 4,
  });
  await expect(page.locator('.combat-stage')).toBeVisible();
  await expect(page.locator('.combat-action-energy')).toContainText('3/3');

  const heroBox = (await page.locator('.hero-drop-zone').boundingBox())!;
  await card.dispatchEvent('pointerdown', {
    pointerId: 42,
    pointerType: 'touch',
    button: 0,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
  });
  // Commit an upward drag before crossing toward the hero in landscape.
  await card.dispatchEvent('pointermove', {
    pointerId: 42,
    pointerType: 'touch',
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2 - 42,
  });
  await card.dispatchEvent('pointermove', {
    pointerId: 42,
    pointerType: 'touch',
    clientX: heroBox.x + heroBox.width / 2,
    clientY: heroBox.y + heroBox.height / 2,
  });
  await card.dispatchEvent('pointerup', {
    pointerId: 42,
    pointerType: 'touch',
    button: 0,
    clientX: heroBox.x + heroBox.width / 2,
    clientY: heroBox.y + heroBox.height / 2,
  });
  await expect(page.locator('.cast-screen')).toBeVisible();
  await enterHintedSpellAndOpenPauseMenu(page);
  await expect(page.getByRole('dialog', { name: '注音暫停' })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.locator('.spell-reveal-overlay')).toHaveCount(0);
  await page.getByRole('button', { name: '▶️ 繼續玩' }).click();
  await expect(page.locator('.spell-reveal-overlay')).toBeVisible({ timeout: 1_000 });

  await page.getByRole('button', { name: '開啟暫停選單' }).click();
  await page.waitForTimeout(2_100);
  await expect(page.locator('.spell-reveal-overlay')).toBeVisible();
  await page.getByRole('button', { name: '▶️ 繼續玩' }).click();
  await page.locator('.spell-reveal-continue').click();
  await expect(page.locator('.tutorial-step-endTurn')).toBeVisible();
});

test('phone menu opens the current deck without changing the run', async ({ page }) => {
  await page.goto('/?debug=1');
  await debugAction(page, 'Run', 'Map');
  await closeDebug(page);
  const before = await page.locator('.map-dot').count();
  await page.getByRole('button', { name: '開啟暫停選單' }).click();
  await page.getByRole('button', { name: '🃏 查看牌組' }).click();
  await expect(page.getByRole('dialog', { name: '牌組與卡牌設計檢視器' })).toBeVisible();
  await expect(page.locator('#zhuyin-deck-viewer-root .deck-viewer-card')).toHaveCount(10);
  await expect(page.getByRole('dialog', { name: '牌組與卡牌設計檢視器' })).toContainText(
    '每一張實體牌都分開顯示；重複牌不合併。',
  );
  await page.getByRole('button', { name: '🧰 設計檢視' }).click();
  await expect(page.locator('#zhuyin-deck-viewer-root .deck-viewer-card')).toHaveCount(27);
  await page.getByRole('button', { name: /音波擊，攻擊，基礎，查看完整資料/ }).click();
  await expect(page.getByText('結算順序')).toBeVisible();
  await expect(page.getByText(/平衡備註：一能量基礎攻擊下限/)).toBeVisible();
  await page.getByRole('button', { name: '關閉卡牌檢視器' }).click();
  await expect(page.locator('.map-dot')).toHaveCount(before);
});

test('three-enemy encounters keep every target usable', async ({ page }) => {
  await page.goto('/?debug=1');
  await openDebug(page);
  const startRow = page.locator('.debug-row').filter({ hasText: 'Start' });
  await startRow.locator('select').nth(1).selectOption('slimeTriple');
  await startRow.getByRole('button', { name: 'Go', exact: true }).click();
  await closeDebug(page);
  await expect(page.locator('.enemy-slot')).toHaveCount(3);
  const targets = await page.locator('.enemy-slot').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  expect(targets.every((target) => target.width >= 48 && target.height >= 48)).toBe(true);
  await expectNoPageOverflow(page);
});
