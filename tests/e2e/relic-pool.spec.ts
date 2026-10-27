import { expect, test, type Page } from '@playwright/test';
import { RELIC_TEST_MAP_SEED } from '../helpers/relicTestMap';

const POOL_IDS = ['gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart', 'trainingStance'];
const consoleErrors = new WeakMap<Page, string[]>();

async function debugAction(page: Page, rowName: string, buttonName: string): Promise<void> {
  await page
    .locator('.debug-row')
    .filter({ hasText: rowName })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
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
  const tops = await sixBadges.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  const rights = await sixBadges.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  const lefts = await sixBadges.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
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
