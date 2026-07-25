import { expect, test, type Page } from '@playwright/test';

const consoleErrors = new WeakMap<Page, string[]>();

async function debugAction(page: Page, rowName: string, buttonName: string) {
  await page
    .locator('.debug-row')
    .filter({ hasText: rowName })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
}

async function openOptionsFromMenu(page: Page) {
  await page.getByRole('button', { name: '開啟暫停選單' }).click();
  await page.getByRole('button', { name: '⚙️ 完整選項' }).click();
}

async function openTutorial(page: Page) {
  await page.goto('/?debug=1');
  await debugAction(page, 'Tutorial', 'Start');
  await expect(page.locator('.tutorial-step-shield')).toBeVisible();
  await expect(page.locator('.enemy-slot')).toHaveCount(1);
  await page.locator('.debug-head .debug-btn-icon').click();
  // The live hand is deliberately hidden while the opening five-card deal FX
  // lands. Layout assertions must observe the settled, interactive hand.
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '注音 ㄇ', exact: true }),
  ).toBeEnabled();
}

async function solveCurrentCast(page: Page) {
  await page.locator('.hint-btn').click();
  const spell = (await page.locator('.spell-answer').textContent())!.trim();
  for (const symbol of [...spell]) {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const key = page
      .locator('.spell-key:not([disabled])')
      .filter({ hasText: new RegExp(`^${escaped}$`) })
      .first();
    await key.click();
  }
  // Completing the final symbol auto-submits after a short learning pause.
  // Waiting for that avoids racing a manual click against the reveal overlay.
  await expect(page.locator('.spell-reveal-overlay')).toBeVisible({ timeout: 1_500 });
  await expect(page.locator('.spell-reveal-spell')).toHaveText(spell);
  await expect(page.locator('.spell-reveal-continue')).toBeVisible({ timeout: 1_700 });
  await page.locator('.spell-reveal-continue').click();
}

async function expectMapEdgesAttached(page: Page) {
  const distances = await page.locator('.map-edge').evaluateAll((edges) => {
    const centerOf = (nodeId: string) => {
      const node = document.querySelector<HTMLElement>(
        `.map-dot[data-node-id="${CSS.escape(nodeId)}"]`,
      );
      if (!node) throw new Error(`Missing map node ${nodeId}`);
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    return edges.flatMap((edge) => {
      const line = edge as SVGLineElement;
      const matrix = line.ownerSVGElement?.getScreenCTM();
      const fromId = line.dataset.fromNodeId;
      const toId = line.dataset.toNodeId;
      if (!matrix || !fromId || !toId) throw new Error('Map edge metadata is incomplete');

      const fromPoint = new DOMPoint(
        Number(line.getAttribute('x1')),
        Number(line.getAttribute('y1')),
      ).matrixTransform(matrix);
      const toPoint = new DOMPoint(
        Number(line.getAttribute('x2')),
        Number(line.getAttribute('y2')),
      ).matrixTransform(matrix);
      const fromCenter = centerOf(fromId);
      const toCenter = centerOf(toId);
      return [
        Math.hypot(fromPoint.x - fromCenter.x, fromPoint.y - fromCenter.y),
        Math.hypot(toPoint.x - toCenter.x, toPoint.y - toCenter.y),
      ];
    });
  });

  expect(distances.length).toBeGreaterThan(0);
  expect(Math.max(...distances)).toBeLessThanOrEqual(1.5);
}

async function toggleCoachTwice(page: Page) {
  const coach = page.locator('.adult-coach');
  const toggle = coach.locator('.adult-coach-head');
  if ((await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(coach).not.toHaveClass(/collapsed/);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-label', '展開家長提示');
  await expect(coach).toHaveClass(/collapsed/);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-label', '收合家長提示');
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // addInitScript runs again on reload. Clear once per Playwright page so a
    // persistence test can reload without erasing the value it just saved.
    if (sessionStorage.getItem('zhuyin-e2e-storage-cleared') !== '1') {
      localStorage.clear();
      sessionStorage.setItem('zhuyin-e2e-storage-cleared', '1');
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

test('character selection binds the simple starter deck and relic', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  const character = page.getByRole('button', { name: /選擇共鳴武者/ });
  await expect(character).toBeVisible();
  await expect(character).toContainText('⚔️ 1⚡ ×5');
  await expect(character).toContainText('🛡️ 1⚡ ×4');
  await expect(character).toContainText('🎯 2⚡ ×1');
  await expect(character).toContainText('初心音叉');
  await character.click();
  await expect(page.locator('.map-stage')).toBeVisible();

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('zhuyin-spire-run-v1');
    return raw ? JSON.parse(raw) : null;
  });
  expect(saved.characterId).toBe('echoMage');
  expect(saved.relicId).toBe('tuningFork');
  expect(saved.deck).toHaveLength(10);
  expect(saved.v).toBe(2);
  expect(saved.deck.filter((card: { defId: string }) => card.defId === 'bo')).toHaveLength(5);
  expect(saved.deck.filter((card: { defId: string }) => card.defId === 'mo')).toHaveLength(4);
  expect(saved.deck.filter((card: { defId: string }) => card.defId === 'po')).toHaveLength(1);
  expect(new Set(saved.deck.map((card: { uid: string }) => card.uid)).size).toBe(10);
});

test('map has usable touch targets, no page overflow, and scrolls when needed', async ({ page }) => {
  await page.goto('/?debug=1');
  await debugAction(page, 'Run', 'Map');
  await expect(page.locator('.map-stage')).toBeVisible();

  const viewport = page.viewportSize()!;
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(viewport.width);

  const nodeBoxes = await page.locator('.map-dot').evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  expect(nodeBoxes.length).toBeGreaterThan(0);
  expect(nodeBoxes.every((box) => box.width >= 48 && box.height >= 48)).toBe(true);

  const panel = await page.locator('.map-panel').evaluate((el) => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }));
  expect(panel.scrollHeight).toBeGreaterThanOrEqual(panel.clientHeight);
  if (viewport.height <= 1024) expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
  await expect(page.locator('.map-floor-progress')).toContainText('/15 層');
  await expectMapEdgesAttached(page);
});

test('map routes stay attached after an orientation change', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');
  await debugAction(page, 'Run', 'Map');
  await expectMapEdgesAttached(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expectMapEdgesAttached(page);
});

test('parent tooltip can be minimized on map and combat', async ({ page }) => {
  await page.goto('/?debug=1');
  await debugAction(page, 'Run', 'Map');
  await toggleCoachTwice(page);

  await page
    .locator('.debug-row')
    .filter({ hasText: 'Start' })
    .getByRole('button', { name: 'Go', exact: true })
    .click();
  await expect(page.locator('.combat-stage')).toBeVisible();
  await toggleCoachTwice(page);
});

test('Options persists speed and keeps primary controls large', async ({ page }) => {
  await page.goto('/');
  const controls = await page.locator('.global-control-btn:visible').evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().height),
  );
  expect(controls.every((height) => height >= 64)).toBe(true);

  await openOptionsFromMenu(page);
  await page.getByRole('button', { name: '2× 快速' }).click();
  await page.getByRole('button', { name: '關閉選項' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-game-speed', '2');
  await openOptionsFromMenu(page);
  await expect(page.getByRole('button', { name: '2× 快速' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('learner profiles keep their own curriculum and survive reload', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-portrait');
  await page.goto('/');

  const profileButton = page.getByRole('button', { name: /目前是小玩家 1/ });
  await expect(profileButton).toBeVisible();
  expect((await profileButton.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  await profileButton.click();
  await expect(page.getByRole('dialog', { name: '遊戲選項' })).toContainText(
    '每位孩子有自己的存檔、教學、徽章和練習紀錄',
  );

  await page.getByLabel('新小玩家暱稱，不要填真名').fill('米米');
  await page.getByLabel('新小玩家圖示').selectOption('🐰');
  await page.getByRole('button', { name: '＋ 新增' }).click();
  await expect(page.getByRole('heading', { name: '小玩家 · 🐰 米米' })).toBeVisible();
  await page.getByRole('button', { name: '加入進階詞' }).click();
  await expect(page.getByRole('button', { name: '加入進階詞' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '關閉選項' }).click();

  await page.reload();
  await expect(page.getByRole('button', { name: /目前是米米/ })).toBeVisible();
  await page.getByRole('button', { name: /目前是米米/ }).click();
  await expect(page.getByRole('button', { name: '加入進階詞' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: '🧒 小玩家 1' }).click();
  await expect(page.getByRole('button', { name: '幼兒核心' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '關閉選項' }).click();
  await expect(page.getByRole('button', { name: /目前是小玩家 1/ })).toBeVisible();
});

test('Options rejects a vocabulary filter that would make cards uncastable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-portrait');
  await page.goto('/');
  await openOptionsFromMenu(page);
  await page.getByText('進階：只出／不要出哪些詞').click();
  await page.getByLabel('只出這些詞').fill('爸爸');
  await page.getByRole('button', { name: '套用詞語清單' }).click();
  await expect(page.locator('.curriculum-options .warn-banner')).toContainText(
    '沒有題目',
  );
});

test('orientation change preserves active combat state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await openTutorial(page);
  const enemyText = await page.locator('.kid-hp-num').textContent();
  const cardCount = await page.locator('.hand .card').count();
  const enemyHandle = await page.locator('.enemy-slot').elementHandle();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.kid-hp-num')).toHaveText(enemyText!);
  await expect(page.locator('.hand .card')).toHaveCount(cardCount);
  expect(await enemyHandle!.evaluate((node) => node.isConnected)).toBe(true);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(768);
});

test('combat stays full-width and a fitting hand is centered on screen', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-portrait');
  await openTutorial(page);

  await expect
    .poll(async () =>
      page.locator('.hand .card').evaluateAll((cards) => {
        const rects = cards.map((card) => card.getBoundingClientRect());
        const left = Math.min(...rects.map((rect) => rect.left));
        const right = Math.max(...rects.map((rect) => rect.right));
        return Math.abs((left + right) / 2 - window.innerWidth / 2);
      }),
    )
    .toBeLessThanOrEqual(2);

  const layoutBefore = await page.locator('.combat-stage').evaluate((stage) => {
    const rect = stage.getBoundingClientRect();
    const style = getComputedStyle(stage);
    return {
      left: rect.left,
      width: rect.width,
      paddingLeft: Number.parseFloat(style.paddingLeft),
      paddingRight: Number.parseFloat(style.paddingRight),
    };
  });
  expect(layoutBefore.left).toBeCloseTo(0, 0);
  expect(layoutBefore.width).toBeCloseTo(page.viewportSize()!.width, 0);
  expect(Math.abs(layoutBefore.paddingLeft - layoutBefore.paddingRight)).toBeLessThanOrEqual(1);

  await openOptionsFromMenu(page);
  await expect(page.getByRole('dialog', { name: '遊戲選項' })).toBeVisible();
  const layoutWhileOpen = await page.locator('.combat-stage').evaluate((stage) => {
    const rect = stage.getBoundingClientRect();
    return { left: rect.left, width: rect.width };
  });
  expect(layoutWhileOpen.left).toBeCloseTo(layoutBefore.left, 1);
  expect(layoutWhileOpen.width).toBeCloseTo(layoutBefore.width, 1);
  await page.getByRole('button', { name: '關閉選項' }).click();
});

test('Vulnerable is shown on its enemy and explains itself when tapped', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-portrait');
  await page.goto('/?debug=1');
  await page
    .locator('.debug-row')
    .filter({ hasText: 'Cast' })
    .getByRole('button', { name: /^Skip cast/ })
    .click();
  await page
    .locator('.debug-row')
    .filter({ hasText: 'Start' })
    .getByRole('button', { name: 'Go', exact: true })
    .click();
  await debugAction(page, 'Energy', 'Draw 5');
  await page.locator('.debug-head .debug-btn-icon').click();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);

  await page.getByRole('button', { name: /^注音 ㄆ/ }).click();
  const vulnerable = page.getByRole('button', { name: '🎯 易傷 2' });
  await expect(vulnerable).toBeVisible();
  await expect(vulnerable).toHaveAttribute('aria-expanded', 'false');
  await vulnerable.click();
  await expect(
    page.getByText('攻擊傷害 ×1.5，無條件捨去小數。怪物行動後少 1 回合。'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '🎯 易傷 2' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('portrait hand scrolls fully without hiding cards under End Turn', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-portrait');
  await openTutorial(page);

  const hand = page.locator('.hand');
  const endTurn = page.locator('.end-turn-btn');
  const metrics = await hand.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

  await hand.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const handElement = document.querySelector<HTMLElement>('.hand')!;
        return handElement.scrollLeft + handElement.clientWidth;
      }),
    )
    .toBeGreaterThanOrEqual(metrics.scrollWidth - 2);

  const lastCard = hand.locator('.card').last();
  const [lastBox, endBox, handBox] = await Promise.all([
    lastCard.boundingBox(),
    endTurn.boundingBox(),
    hand.boundingBox(),
  ]);
  expect(lastBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  expect(handBox).not.toBeNull();
  expect(lastBox!.x + lastBox!.width).toBeLessThanOrEqual(handBox!.x + handBox!.width + 1);
  expect(lastBox!.x + lastBox!.width).toBeLessThanOrEqual(endBox!.x - 1);
});

test('complete guided tutorial sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-portrait');
  await openTutorial(page);

  await expect(page.locator('.end-turn-btn')).toBeDisabled();
  await page.getByRole('button', { name: '注音 ㄇ', exact: true }).click();
  await expect(page.locator('.mana-condition')).toContainText('魔力');
  await expect(page.locator('.mana-focus')).toContainText('ㄇ');
  await solveCurrentCast(page);

  await expect(page.locator('.tutorial-step-endTurn')).toBeVisible();
  await expect(page.locator('.hand .card[aria-label^="注音 ㄅ"]:not([disabled])')).toHaveCount(3);
  await expect(page.locator('.energy-readout')).toContainText('2/3');
  await page.locator('.end-turn-btn').click();
  await expect(page.locator('.tutorial-step-attack')).toBeVisible();

  await page.getByRole('button', { name: /^注音 ㄅ/ }).click();
  await solveCurrentCast(page);
  await expect(page.locator('.tutorial-step-free')).toBeVisible();
  await page.getByRole('button', { name: /^注音 ㄆ/ }).click();
  await solveCurrentCast(page);
  await expect(page.locator('.reward-screen')).toBeVisible({ timeout: 8_000 });
  expect(await page.evaluate(() => localStorage.getItem('zhuyin-spire-tutorial-complete-v1'))).toBe(
    '1',
  );
});
