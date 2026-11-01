import { existsSync, mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** Local review runs save shots here; CI has no such directory and skips them. */
const SHOT_DIR = '/workspace/zhuyin-scratch/screens-backdrop';

type ReviewOptions = {
  actIndex?: number;
  nodeKind?: string;
  row?: number;
  eventId?: string;
  enemyDefIds?: string[];
  save?: boolean;
};

async function review(page: Page, screen: string, options: ReviewOptions = {}) {
  await page.evaluate(
    async ([name, opts]) => {
      await (
        window as Window & {
          __zhuyinVisualReview: (screen: string, options: ReviewOptions) => Promise<void>;
        }
      ).__zhuyinVisualReview(name, opts);
    },
    [screen, options] as const,
  );
}

const sceneImage = (page: Page) =>
  page.evaluate(() =>
    getComputedStyle(document.getElementById('app')!).getPropertyValue('--scene-image'),
  );

async function expectScene(page: Page, file: string, shot?: string) {
  await expect.poll(() => sceneImage(page)).toContain(`/${file}`);
  if (shot && existsSync(SHOT_DIR)) {
    const size = page.viewportSize();
    const dir = size ? `${SHOT_DIR}/${size.width}x${size.height}` : SHOT_DIR;
    mkdirSync(dir, { recursive: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/${shot}.png` });
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug=1');
  await page.waitForFunction(() => '__zhuyinVisualReview' in window);
  // The desktop debug panel opens over the board; phones start with it closed.
  const closeDebug = page.locator('.debug-head .debug-btn-icon');
  await closeDebug.click({ timeout: 3_000 }).catch(() => undefined);
});

test('each part of a run shows its room', async ({ page }) => {
  await expectScene(page, 'backdrops/foyer.webp', 'title');

  await review(page, 'combat', { actIndex: 0, nodeKind: 'fight', enemyDefIds: ['rock'] });
  await expect(page.locator('.combat-stage')).toBeVisible();
  await expectScene(page, 'act-garden.webp', 'lower-fight');

  await review(page, 'combat', { actIndex: 0, nodeKind: 'fight', row: 9, enemyDefIds: ['rock'] });
  await expectScene(page, 'backdrops/act-garden-upper.webp', 'upper-fight');

  await review(page, 'combat', { actIndex: 0, nodeKind: 'boss', enemyDefIds: ['boss1'] });
  await expectScene(page, 'backdrops/act-garden-boss.webp', 'boss');

  await review(page, 'event', {
    actIndex: 1,
    nodeKind: 'unknown',
    eventId: 'event_a2_moth_rehearsal',
  });
  await expect(page.locator('.event-screen')).toBeVisible();
  await expectScene(page, 'backdrops/scene-event-moth-rehearsal.webp', 'event');

  await review(page, 'shop', { actIndex: 2, nodeKind: 'shop' });
  await expectScene(page, 'backdrops/scene-observatory-shop.webp', 'shop');

  await review(page, 'victory');
  await expectScene(page, 'backdrops/scene-heart-boss-victory.webp', 'victory');
  // The closed dome is stacked under the open door in case the variant fails.
  expect(await sceneImage(page)).toContain('/backdrops/act-heart-boss.webp');
});

test('a saved camp, shop, event or treasure comes back in the same room', async ({ page }) => {
  const cases: { screen: string; options: ReviewOptions; file: string }[] = [
    { screen: 'rest', options: { actIndex: 0, nodeKind: 'rest', row: 14 }, file: 'backdrops/scene-garden-camp.webp' },
    { screen: 'shop', options: { actIndex: 1, nodeKind: 'shop' }, file: 'backdrops/scene-library-shop.webp' },
    {
      screen: 'event',
      options: { actIndex: 0, nodeKind: 'unknown', eventId: 'event_shared_moon_gong' },
      file: 'backdrops/scene-event-moon-gong.webp',
    },
    { screen: 'reward', options: { actIndex: 2, nodeKind: 'treasure', row: 8 }, file: 'backdrops/act-observatory-upper.webp' },
  ];
  for (const item of cases) {
    await review(page, item.screen, { ...item.options, save: true });
    await expectScene(page, item.file);
    const before = await sceneImage(page);

    await page.reload();
    await page.getByRole('button', { name: '繼續爬塔' }).click();
    await expect.poll(() => sceneImage(page)).toBe(before);
  }
});

test('review gallery: every act room (local shots only)', async ({ page }) => {
  test.skip(!existsSync(SHOT_DIR), 'screenshot gallery runs only on a review box');
  test.setTimeout(120_000);
  await review(page, 'relicPick');
  await expectScene(page, 'backdrops/foyer.webp', 'character-select');

  const acts = [
    { act: 'garden', boss: 'boss1', event: 'event_a1_bell_rope', eventFile: 'scene-event-bell-rope' },
    { act: 'library', boss: 'boss2', event: 'event_a2_echo_market', eventFile: 'scene-event-echo-market' },
    { act: 'observatory', boss: 'boss3', event: 'event_a3_star_bell', eventFile: 'scene-event-star-bell' },
  ];
  for (const [actIndex, item] of acts.entries()) {
    const prefix = `act${actIndex + 1}`;
    await review(page, 'combat', { actIndex, nodeKind: 'fight', enemyDefIds: ['rock'] });
    await expectScene(page, `act-${item.act}.webp`, `${prefix}-lower-fight`);
    await review(page, 'combat', { actIndex, nodeKind: 'fight', row: 9, enemyDefIds: ['rock'] });
    await expectScene(page, `backdrops/act-${item.act}-upper.webp`, `${prefix}-upper-fight`);
    await review(page, 'combat', { actIndex, nodeKind: 'boss', enemyDefIds: [item.boss] });
    await expectScene(page, `backdrops/act-${item.act}-boss.webp`, `${prefix}-boss`);
    await review(page, 'rest', { actIndex, nodeKind: 'rest' });
    await expectScene(page, `backdrops/scene-${item.act}-camp.webp`, `${prefix}-camp`);
    await review(page, 'shop', { actIndex, nodeKind: 'shop' });
    await expectScene(page, `backdrops/scene-${item.act}-shop.webp`, `${prefix}-shop`);
    await review(page, 'event', { actIndex, nodeKind: 'unknown', eventId: item.event });
    await expectScene(page, `backdrops/${item.eventFile}.webp`, `${prefix}-event`);
    await review(page, 'reward', { actIndex, nodeKind: 'treasure', row: 8 });
    await expectScene(page, `backdrops/act-${item.act}-upper.webp`, `${prefix}-treasure-row8`);
  }
});
