import { expect, test, type Page } from '@playwright/test';
import { RELIC_TEST_MAP_SEED } from '../helpers/relicTestMap';

const POOL_IDS = ['gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart', 'trainingStance'];
const ALL_RELIC_IDS = ['tuningFork', ...POOL_IDS];
const SMALL_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 640, height: 360 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
];

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
const consoleErrors = new WeakMap<Page, string[]>();

async function debugAction(page: Page, rowName: string, buttonName: string): Promise<void> {
  await page
    .locator('.debug-row')
    .filter({ hasText: rowName })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
}

async function roundedBox(page: Page, selector: string, index = 0): Promise<Box | null> {
  return page.evaluate(
    ([sel, i]) => {
      const el = document.querySelectorAll<HTMLElement>(sel)[i];
      if (!el || getComputedStyle(el).display === 'none') return null;
      const rect = el.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
      };
    },
    [selector, index] as const,
  );
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function contains(outer: Box, inner: Box): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  );
}

async function isTopmostAtCenter(page: Page, selector: string, index: number): Promise<boolean> {
  return page.evaluate(
    ([sel, i]) => {
      const el = document.querySelectorAll<HTMLElement>(sel)[i]!;
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !!hit && el.contains(hit);
    },
    [selector, index] as const,
  );
}

/**
 * Every badge must sit fully on screen with a >= 44px target, inside its
 * container's visible box. A scrollable container may hold a badge out of
 * view, as long as scrolling brings it in and it then takes a tap.
 */
async function expectBadgesReachable(
  page: Page,
  containerSelector: string,
  viewport: { width: number; height: number },
): Promise<Box[]> {
  const badgeSelector = `${containerSelector} .relic-badge`;
  const badges = page.locator(badgeSelector);
  await expect(badges).toHaveCount(ALL_RELIC_IDS.length);
  // Screen entry and resize can still be settling; measure a still frame.
  const frame = () =>
    page.evaluate(async (sel) => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return [...document.querySelectorAll<HTMLElement>(sel)]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return [rect.left, rect.top, rect.right, rect.bottom].map(Math.round).join(',');
        })
        .join('|');
    }, `${containerSelector}, ${badgeSelector}`);
  let previous = '';
  await expect
    .poll(async () => {
      const current = await frame();
      const stable = current === previous;
      previous = current;
      return stable;
    })
    .toBe(true);
  const boxes: Box[] = [];
  for (let i = 0; i < ALL_RELIC_IDS.length; i += 1) {
    const label = `${containerSelector} badge ${i + 1} at ${viewport.width}x${viewport.height}`;
    let box = (await roundedBox(page, badgeSelector, i))!;
    let container = (await roundedBox(page, containerSelector))!;
    if (!contains(container, box)) {
      const scrollable = await page.locator(containerSelector).evaluate((el) => {
        const overflowX = getComputedStyle(el).overflowX;
        return (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
      });
      expect(scrollable, `${label} is clipped by a container that cannot scroll`).toBe(true);
      await badges.nth(i).scrollIntoViewIfNeeded();
      box = (await roundedBox(page, badgeSelector, i))!;
      container = (await roundedBox(page, containerSelector))!;
      expect(contains(container, box), `${label} stays clipped after scrolling`).toBe(true);
      await badges.nth(i).click();
      const dialog = page.getByRole('dialog', { name: /查看遺物/ });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
    expect(box.left, `${label} left`).toBeGreaterThanOrEqual(0);
    expect(box.right, `${label} right`).toBeLessThanOrEqual(viewport.width);
    expect(box.top, `${label} top`).toBeGreaterThanOrEqual(0);
    expect(box.bottom, `${label} bottom`).toBeLessThanOrEqual(viewport.height);
    expect(box.right - box.left, `${label} width`).toBeGreaterThanOrEqual(44);
    expect(box.bottom - box.top, `${label} height`).toBeGreaterThanOrEqual(44);
    expect(await isTopmostAtCenter(page, badgeSelector, i), `${label} is covered`).toBe(true);
    boxes.push(box);
  }
  return boxes;
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

test('chests, elites, and bosses drop relics, and a badge opens the inspect dialog', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  await page.evaluate(async (seed) => {
    const { generateRunMap } = await import('/src/data/map.ts');
    const { run, render } = await import('/src/ui/runtime.ts');
    let state = seed >>> 0;
    const rng = () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const next = run();
    next.runMap = generateRunMap(rng);
    next.actIndex = 0;
    next.currentNodeId = null;
    next.activeNodeId = null;
    next.visitedIds = [];
    next.pathIds = [];
    if (!next.runMap.acts[0]!.nodes.some((node) => node.kind === 'elite')) {
      throw new Error('Seeded Act I map has no elite');
    }
    render();
  }, RELIC_TEST_MAP_SEED);

  await debugAction(page, 'Map', '💎');
  await page.locator('.debug-head .debug-btn-icon').click();
  await expect(page.locator('.reward-screen')).toBeVisible();
  await expect(page.locator('.reward-cards .card')).toHaveCount(0);
  const chestBadge = page.locator('.relic-reward .relic-badge');
  await expect(chestBadge).toBeVisible();
  const chestId = await chestBadge.getAttribute('data-relic-id');
  expect(POOL_IDS).toContain(chestId);
  await chestBadge.click();
  const chestDialog = page.getByRole('dialog', { name: /查看遺物/ });
  await expect(chestDialog).toBeVisible();
  await expect(chestDialog.locator('.relic-inspect-blurb')).not.toBeEmpty();
  await page.getByRole('button', { name: '關閉遺物說明' }).click();
  await expect(chestDialog).toBeHidden();
  await page.getByRole('button', { name: '收下寶箱' }).click();
  await expect(page.locator('.map-stage')).toBeVisible();

  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugFinishFight, debugStartEncounter } = await import('/src/game/state.ts');
    const state = run();
    const elite = state.runMap.acts[state.actIndex]!.nodes.find((node) => node.kind === 'elite');
    if (!elite) throw new Error('Missing elite');
    debugStartEncounter(state, elite.enemyId ?? 'slime', elite.encounterId);
    state.activeNodeId = elite.id;
    debugFinishFight(state);
    render();
  });
  await expect(page.locator('.reward-cards .card')).toHaveCount(3);
  const eliteBadge = page.locator('.relic-reward .relic-badge');
  await expect(eliteBadge).toBeVisible();
  const eliteId = await eliteBadge.getAttribute('data-relic-id');
  expect(POOL_IDS).toContain(eliteId);
  expect(eliteId).not.toBe(chestId);
  await page.getByRole('button', { name: /跳過/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();

  const badges = page.locator('.map-relic-badges .relic-badge');
  await expect(badges).toHaveCount(3);
  const starter = page.locator('.relic-badge[data-relic-id="tuningFork"]');
  const box = await starter.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(48);
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(48);
  await starter.click();
  const dialog = page.getByRole('dialog', { name: '查看遺物：初心音叉' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(starter).toBeFocused();
  await starter.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.relic-inspect-name')).toHaveText('初心音叉');
  await page.screenshot({
    path: test.info().outputPath('relic-badge-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  const phoneBox = await starter.boundingBox();
  expect(phoneBox).not.toBeNull();
  expect(Math.round(phoneBox!.width)).toBeGreaterThanOrEqual(48);
  expect(Math.round(phoneBox!.height)).toBeGreaterThanOrEqual(48);
  await page.screenshot({
    path: test.info().outputPath('relic-badge-phone.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '關閉遺物說明' }).click();
  await expect(dialog).toBeHidden();

  const earnedRelicIds = await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const state = run();
    const earned = [...state.relicIds];
    state.relicIds = ['tuningFork', 'gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart', 'trainingStance'];
    render();
    return earned;
  });
  const sixBadges = page.locator('.map-relic-badges .relic-badge');
  await expect(sixBadges).toHaveCount(6);
  // Relics may wrap to a second row on phones; they just have to stay on screen.
  const rights = await sixBadges.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().right)));
  const lefts = await sixBadges.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
  expect(Math.max(...rights)).toBeLessThanOrEqual(390);
  expect(Math.min(...lefts)).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.evaluate(async (earned) => {
    const { run, render } = await import('/src/ui/runtime.ts');
    run().relicIds = earned;
    render();
  }, earnedRelicIds);
  await expect(badges).toHaveCount(3);

  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugFinishFight, debugStartEncounter } = await import('/src/game/state.ts');
    const state = run();
    const boss = state.runMap.acts[state.actIndex]!.nodes.find((node) => node.kind === 'boss');
    if (!boss) throw new Error('Missing boss');
    debugStartEncounter(state, boss.enemyId ?? 'slime', boss.encounterId);
    state.activeNodeId = boss.id;
    debugFinishFight(state);
    render();
  });
  await expect(page.locator('.reward-cards .card')).toHaveCount(3);
  const bossBadge = page.locator('.relic-reward .relic-badge');
  await expect(bossBadge).toBeVisible();
  const bossId = await bossBadge.getAttribute('data-relic-id');
  expect(POOL_IDS).toContain(bossId);
  expect(bossId).not.toBe(chestId);
  expect(bossId).not.toBe(eliteId);
});

test('six relic badges stay on screen and tappable on phones and tablets', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  await page.evaluate(async (ids) => {
    const { run, render } = await import('/src/ui/runtime.ts');
    run().relicIds = ids;
    render();
  }, ALL_RELIC_IDS);

  for (const viewport of SMALL_VIEWPORTS) {
    await page.setViewportSize(viewport);
    const toggle = page.locator('.map-stage .adult-coach-head');
    // The expanded coach is the larger box, so measure against it.
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const badgeBoxes = await expectBadgesReachable(page, '.map-relic-badges', viewport);
    const pause = (await roundedBox(page, '.pause-global-control'))!;
    const coach = (await roundedBox(page, '.map-stage .adult-coach'))!;
    const chrome: [string, Box | null][] = [
      ['.map-stage-top', await roundedBox(page, '.map-stage-top')],
      ['.map-phone-progress', await roundedBox(page, '.map-phone-progress')],
      ...badgeBoxes.map((box, i): [string, Box] => [`badge ${i + 1}`, box]),
    ];
    for (const [name, box] of chrome) {
      if (!box) continue;
      const at = `at ${viewport.width}x${viewport.height}`;
      expect(overlaps(box, pause), `${name} overlaps the pause button ${at}`).toBe(false);
      expect(overlaps(box, coach), `${name} overlaps the coach panel ${at}`).toBe(false);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }

  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugStartEncounter } = await import('/src/game/state.ts');
    debugStartEncounter(run(), 'slime');
    render();
  });
  await expect(page.locator('.combat-hud-relics')).toBeVisible();
  for (const viewport of SMALL_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.locator('.combat-hud-relics').evaluate((el) => {
      el.scrollLeft = 0;
    });
    await expectBadgesReachable(page, '.combat-hud-relics', viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }
});
