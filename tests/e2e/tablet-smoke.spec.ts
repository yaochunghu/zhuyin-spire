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
  await expect(character).toContainText('🃏 12/75');
  await expect(character).toContainText('下一批：0/300');
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
  expect(saved.deck.every((card: { upgradeLevel: number }) => card.upgradeLevel === 0)).toBe(true);
  expect(saved.deck.filter((card: { defId: string }) => card.defId === 'bo')).toHaveLength(5);
  expect(saved.deck.filter((card: { defId: string }) => card.defId === 'mo')).toHaveLength(4);
  expect(saved.deck.filter((card: { defId: string }) => card.defId === 'po')).toHaveLength(1);
  expect(new Set(saved.deck.map((card: { uid: string }) => card.uid)).size).toBe(10);
});

test('toy-board artwork loads locally and preserves its emoji fallback', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/');

  const hero = page.locator('[data-art-key="heroMartialArtist"]');
  const image = hero.locator('img');
  await expect(hero).toHaveClass(/is-loaded/);
  const imageResponse = await page.request.get((await image.getAttribute('src'))!);
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()['content-type']).toContain('image/webp');

  await image.evaluate((element) => {
    (element as HTMLImageElement).src = '/missing-toy-board-art.webp';
  });
  await expect(hero).toHaveClass(/is-error/);
  const fallbackState = await hero.evaluate((element) => {
    const fallback = element.querySelector<HTMLElement>('.art-image-fallback')!;
    const imageElement = element.querySelector<HTMLImageElement>('img')!;
    return {
      fallbackOpacity: getComputedStyle(fallback).opacity,
      imageDisplay: getComputedStyle(imageElement).display,
    };
  });
  expect(fallbackState).toEqual({ fallbackOpacity: '1', imageDisplay: 'none' });
});

test('debug tools are hidden by default and can be enabled from Options', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/');
  await expect(page.locator('#zhuyin-debug-root')).toHaveCount(0);

  await openOptionsFromMenu(page);
  const developer = page
    .locator('.options-section')
    .filter({ hasText: '開發測試工具' });
  await expect(developer).toBeVisible();
  await developer.getByRole('button', { name: '開啟', exact: true }).click();
  await expect(page.locator('#zhuyin-debug-root')).toBeAttached();
});

test('combat hand keeps cards separate when they fit and scrolls at ten cards', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');
  await page
    .locator('.debug-row')
    .filter({ hasText: 'Start' })
    .getByRole('button', { name: 'Go', exact: true })
    .click();
  await page.locator('.debug-head .debug-btn-icon').click();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  await expect(page.locator('.hand .card')).toHaveCount(5);
  await expect(page.locator('.combat-stage .adult-coach')).toHaveCount(0);

  const handMetrics = () =>
    page.locator('.hand').evaluate((hand) => {
      const handRect = hand.getBoundingClientRect();
      const cards = [...hand.querySelectorAll<HTMLElement>('.card')].map((card) => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
      return {
        hand: { left: handRect.left, right: handRect.right },
        clientWidth: hand.clientWidth,
        scrollWidth: hand.scrollWidth,
        cards,
      };
    });
  const expectSeparatedCards = (cards: { left: number; right: number; width: number }[]) => {
    expect(cards.every((card) => card.width >= 119)).toBe(true);
    for (let index = 1; index < cards.length; index += 1) {
      expect(cards[index]!.left).toBeGreaterThanOrEqual(cards[index - 1]!.right);
    }
  };

  const fiveCards = await handMetrics();
  expectSeparatedCards(fiveCards.cards);
  expect(fiveCards.scrollWidth).toBeLessThanOrEqual(fiveCards.clientWidth + 1);
  expect(fiveCards.cards[0]!.left).toBeGreaterThanOrEqual(fiveCards.hand.left);
  expect(fiveCards.cards.at(-1)!.right).toBeLessThanOrEqual(fiveCards.hand.right);

  await page.keyboard.press('`');
  await debugAction(page, 'Energy', 'Draw 5');
  await page.locator('.debug-head .debug-btn-icon').click();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  await expect(page.locator('.hand .card')).toHaveCount(10);
  const tenCards = await handMetrics();
  expectSeparatedCards(tenCards.cards);
  expect(tenCards.scrollWidth).toBeGreaterThan(tenCards.clientWidth);

  await page.locator('.hand').evaluate((hand) => hand.scrollTo({ left: hand.scrollWidth }));
  await expect(page.locator('.hand .card').last()).toBeInViewport();

  const layout = await page.locator('.combat-bottom-row').evaluate((bottom) => {
    const rect = (selector: string) => {
      const box = bottom.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    return {
      draw: rect('[data-pile="draw"]'),
      hand: rect('[data-hand]'),
      discard: rect('[data-pile="discard"]'),
      end: rect('.end-turn-btn'),
    };
  });
  expect(layout.draw.right).toBeLessThanOrEqual(layout.hand.left + 1);
  expect(layout.hand.right).toBeLessThanOrEqual(layout.discard.left + 1);
  expect(layout.end.left).toBeGreaterThanOrEqual(layout.discard.left - 1);
  expect(layout.end.top).toBeGreaterThanOrEqual(layout.discard.top);
});

test('combat chrome stays clear and supports a five-enemy formation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');
  await page
    .locator('.debug-row')
    .filter({ hasText: 'Start' })
    .getByRole('button', { name: 'Go', exact: true })
    .click();
  await page.locator('.debug-head .debug-btn-icon').click();

  await expect(page.locator('.debug-fab')).toHaveCount(0);
  await expect(page.locator('.hero-energy')).toHaveCount(0);
  await expect(page.locator('.hero-kid-hp')).toBeVisible();
  await expect(page.locator('.hero-inline-shield')).toBeVisible();

  const chrome = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const rect = document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
      };
    };
    return {
      hud: bounds('.combat-hud-strip'),
      menu: bounds('.pause-global-control'),
      heroVitals: bounds('.hero-vitals'),
    };
  });
  expect(chrome.menu.top).toBeGreaterThanOrEqual(chrome.hud.top);
  expect(chrome.menu.bottom).toBeLessThanOrEqual(chrome.hud.bottom);
  expect(chrome.heroVitals.width).toBeLessThanOrEqual(192);

  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  const formation = await page.locator('.enemy-row').evaluate((row) => {
    const first = row.querySelector<HTMLElement>('.enemy-slot')!;
    while (row.querySelectorAll('.enemy-slot').length < 5) {
      const clone = first.cloneNode(true) as HTMLElement;
      clone.dataset.enemyId = `layout-test-${row.querySelectorAll('.enemy-slot').length}`;
      clone.setAttribute('aria-label', `版面測試怪物 ${row.querySelectorAll('.enemy-slot').length + 1}`);
      row.appendChild(clone);
    }
    (row as HTMLElement).dataset.count = '5';

    const parent = row.getBoundingClientRect();
    const targets = [...row.querySelectorAll<HTMLElement>('.enemy-slot')].map((slot) => {
      const rect = slot.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    });
    return {
      parent: { left: parent.left, right: parent.right },
      targets,
    };
  });
  expect(formation.targets).toHaveLength(5);
  expect(
    formation.targets.every((target) => target.width >= 48 && target.height >= 48),
    JSON.stringify(formation),
  ).toBe(true);
  expect(formation.targets[0]!.left).toBeGreaterThanOrEqual(formation.parent.left - 1);
  expect(formation.targets.at(-1)!.right).toBeLessThanOrEqual(formation.parent.right + 1);
  for (let index = 1; index < formation.targets.length; index += 1) {
    expect(formation.targets[index]!.left).toBeGreaterThanOrEqual(
      formation.targets[index - 1]!.right - 1,
    );
  }
});

test('title-to-reward path keeps the Garden tabletop theme and loaded art', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');
  await expect(
    page.locator('[data-art-key="heroMartialArtist"]'),
  ).toHaveClass(/is-loaded/);
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-visual-theme', 'garden');
  // Available room tokens gently pulse; forcing the click avoids Playwright
  // waiting for an intentionally animated transform to become motionless.
  await page.locator('.map-dot.available').first().click({ force: true });
  await expect(page.locator('.combat-stage')).toBeVisible();
  await debugAction(page, 'Fight', 'Win');
  await expect(page.locator('.reward-screen')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('#app')).toHaveAttribute('data-visual-theme', 'garden');
  const rewardScene = await page.locator('#app').evaluate((app) =>
    getComputedStyle(app, '::before').backgroundImage,
  );
  expect(rewardScene).toContain('act-garden');
});

test('all three tower sections switch scene and room-token treatments', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');

  const expected = [
    { button: 'I', theme: 'garden', scene: 'act-garden', token: 'token-garden' },
    { button: 'II', theme: 'library', scene: 'act-library', token: 'token-library' },
    {
      button: 'III',
      theme: 'observatory',
      scene: 'act-observatory',
      token: 'token-observatory',
    },
  ] as const;

  for (const item of expected) {
    await debugAction(page, 'Act', item.button);
    await debugAction(page, 'Run', 'Map');
    await expect(page.locator('#app')).toHaveAttribute('data-visual-theme', item.theme);
    const styles = await page.locator('.map-screen').evaluate((screen) => ({
      scene: getComputedStyle(screen).backgroundImage,
      token: getComputedStyle(document.querySelector<HTMLElement>('.map-dot')!)
        .backgroundImage,
    }));
    expect(styles.scene).toContain(item.scene);
    expect(styles.token).toContain(item.token);
  }
});

test('reduced motion removes the decorative toy-board loops', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug=1');
  await debugAction(page, 'Run', 'Map');
  const motion = await page.locator('.map-dot.available').first().evaluate((node) => ({
    animationName: getComputedStyle(node).animationName,
    transitionDuration: getComputedStyle(node).transitionDuration,
  }));
  expect(motion.animationName).toBe('none');
  expect(motion.transitionDuration).toBe('0s');
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
  await expect(page.locator('.map-floor-progress')).toContainText('/16 層');
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
  await openOptionsFromMenu(page);
  await page
    .locator('.options-section')
    .filter({ hasText: '戰鬥家長提示' })
    .getByRole('button', { name: '顯示', exact: true })
    .click();
  await page.getByRole('button', { name: '關閉選項' }).click();
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
  // Browser layout can report a 63.99998px box after device-scale rounding;
  // keep the 64px target-size assertion tolerant of sub-pixel measurement noise.
  expect((await profileButton.boundingBox())!.height).toBeGreaterThanOrEqual(63.5);
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
  const enemyText = await page.locator('.enemy-slot .kid-hp-num').textContent();
  const cardCount = await page.locator('.hand .card').count();
  const enemyHandle = await page.locator('.enemy-slot').elementHandle();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.enemy-slot .kid-hp-num')).toHaveText(enemyText!);
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
    .toBeLessThanOrEqual(5);

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
  await page.keyboard.press('`');
  await debugAction(page, 'Energy', 'Draw 5');
  await page.locator('.debug-head .debug-btn-icon').click();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  await expect(page.locator('.hand .card')).toHaveCount(10);

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
  await expect(page.locator('.combat-action-energy')).toContainText('2/3');
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

test('every canonical enemy family renders through the typed art registry', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');
  const cases = [
    ['tutorialSlime', 'enemySlime'],
    ['slimeWeak', 'enemySlime'],
    ['slime', 'enemySlime'],
    ['rock', 'enemyRock'],
    ['bat', 'enemyBat'],
    ['ember', 'enemyEmber'],
    ['fang', 'enemyFang'],
    ['fangSoft', 'enemyFangSoft'],
    ['armor', 'enemyArmor'],
    ['spike', 'enemySpike'],
    ['fangHard', 'enemyFangHard'],
    ['toad', 'enemyToad'],
    ['wraith', 'enemyWraith'],
    ['owl', 'enemyOwl'],
    ['crystal', 'enemyCrystal'],
    ['eliteArmor', 'enemyEliteArmor'],
    ['eliteBee', 'enemyEliteBee'],
    ['eliteBoom', 'enemyEliteBoom'],
    ['eliteStorm', 'enemyEliteStorm'],
    ['eliteShadow', 'enemyEliteShadow'],
    ['boss1', 'enemyBoss1'],
    ['boss2', 'enemyBoss2'],
    ['boss3', 'enemyBoss3'],
    ['boss', 'enemyBoss1'],
  ] as const;

  for (const [enemyDefId, artKey] of cases) {
    await page.evaluate(
      async ({ enemyDefId: id }) => {
        await (
          window as Window & {
            __zhuyinVisualReview: (
              screen: string,
              options: { enemyDefIds: string[] },
            ) => Promise<void>;
          }
        ).__zhuyinVisualReview('combat', { enemyDefIds: [id] });
      },
      { enemyDefId },
    );
    const art = page.locator(`.enemy-slot [data-art-key="${artKey}"]`);
    await expect(art).toHaveCount(1);
    await expect(art).toHaveClass(/is-loaded/);
  }
});

test('combat review states support one to five enemies and five to ten cards', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');

  for (const enemyCount of [1, 2, 3, 4, 5]) {
    await page.evaluate(
      async ({ count }) => {
        await (
          window as Window & {
            __zhuyinVisualReview: (
              screen: string,
              options: { enemyCount: number; handCount: number },
            ) => Promise<void>;
          }
        ).__zhuyinVisualReview('combat', {
          enemyCount: count,
          handCount: 5,
        });
      },
      { count: enemyCount },
    );
    await expect(page.locator('.enemy-slot')).toHaveCount(enemyCount);
    await expect(page.locator('.enemy-miniature-art.is-loaded')).toHaveCount(
      enemyCount,
    );
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - window.innerWidth,
      row: (() => {
        const row = document.querySelector<HTMLElement>('.enemy-row')!;
        return row.scrollWidth - row.clientWidth;
      })(),
    }));
    expect(overflow.page).toBeLessThanOrEqual(0);
    expect(overflow.row).toBeLessThanOrEqual(1);
  }

  for (const handCount of [5, 6, 8, 10]) {
    await page.evaluate(
      async ({ count }) => {
        await (
          window as Window & {
            __zhuyinVisualReview: (
              screen: string,
              options: { enemyCount: number; handCount: number },
            ) => Promise<void>;
          }
        ).__zhuyinVisualReview('combat', {
          enemyCount: 3,
          handCount: count,
        });
      },
      { count: handCount },
    );
    await expect(page.locator('.hand .card')).toHaveCount(handCount);
    await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  }
});

test('enemy image failures retain the registry emoji fallback', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.goto('/?debug=1');
  await page.evaluate(async () => {
    await (
      window as Window & {
        __zhuyinVisualReview: (
          screen: string,
          options: { enemyDefIds: string[] },
        ) => Promise<void>;
      }
    ).__zhuyinVisualReview('combat', { enemyDefIds: ['rock'] });
  });
  const art = page.locator('[data-art-key="enemyRock"]');
  await expect(art).toHaveClass(/is-loaded/);
  await art.locator('img').evaluate((image) => {
    image.dispatchEvent(new Event('error'));
  });
  await expect(art).toHaveClass(/is-error/);
  await expect(art.locator('.art-image-fallback')).toHaveText('🪨');
});

test('both act transformations and ambience honor reduced motion', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-landscape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug=1');

  for (const [actIndex, artKey] of [
    [0, 'transitionGardenLibrary'],
    [1, 'transitionLibraryObservatory'],
  ] as const) {
    await page.evaluate(
      async ({ act }) => {
        await (
          window as Window & {
            __zhuyinVisualReview: (
              screen: string,
              options: { actIndex: number },
            ) => Promise<void>;
          }
        ).__zhuyinVisualReview('actClear', { actIndex: act });
      },
      { act: actIndex },
    );
    await expect(page.locator(`[data-art-key="${artKey}"]`)).toHaveClass(
      /is-loaded/,
    );
    const transitionMotion = await page
      .locator('.act-transition-backdrop')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(transitionMotion).toBe('none');
  }

  await page.evaluate(async () => {
    await (
      window as Window & {
        __zhuyinVisualReview: (
          screen: string,
          options: { actIndex: number },
        ) => Promise<void>;
      }
    ).__zhuyinVisualReview('map', { actIndex: 2 });
  });
  const ambience = page.locator('.act-ambience');
  await expect(ambience).toHaveAttribute('aria-hidden', 'true');
  const ambienceStyle = await ambience.evaluate((element) => ({
    pointerEvents: getComputedStyle(element).pointerEvents,
    particleAnimation: getComputedStyle(
      element.querySelector('.act-ambience-particle')!,
    ).animationName,
  }));
  expect(ambienceStyle.pointerEvents).toBe('none');
  expect(ambienceStyle.particleAnimation).toBe('none');
});
