import { expect, test, type Page } from '@playwright/test';

type ReviewOptions = {
  enemyDefIds?: string[];
  heroHp?: number;
  enemyHp?: number[];
};

async function reviewCombat(page: Page, options: ReviewOptions) {
  await page.evaluate(async (opts) => {
    await (
      window as Window & {
        __zhuyinVisualReview: (screen: string, options: ReviewOptions) => Promise<void>;
      }
    ).__zhuyinVisualReview('combat', opts);
  }, options);
  await expect(page.locator('.combat-stage')).toBeVisible();
}

const heroArt = (page: Page) => page.locator('.hero-actor [data-hero-art]');
const heroImg = (page: Page) => heroArt(page).locator('img');
const bossImg = (page: Page) => page.locator('.enemy-slot .enemy-miniature-art img').first();

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.locator('.debug-head .debug-btn-icon').click();
});

test('hero and boss stills follow the HP thresholds', async ({ page }) => {
  // Hero max 40, boss1 max 42.
  const cases = [
    { heroHp: 40, bossHp: 42, hero: /hero-martial-artist\.webp/, boss: /boss-1\.webp/, shot: 'fresh' },
    { heroHp: 20, bossHp: 21, hero: /hero-martial-artist-scuffed\.webp/, boss: /boss-1-scuffed\.webp/, shot: 'scuffed' },
    { heroHp: 10, bossHp: 10, hero: /hero-martial-artist-beaten\.webp/, boss: /boss-1-beaten\.webp/, shot: 'beaten' },
  ];
  for (const item of cases) {
    await reviewCombat(page, {
      enemyDefIds: ['boss1'],
      heroHp: item.heroHp,
      enemyHp: [item.bossHp],
    });
    await expect(heroImg(page)).toHaveAttribute('src', item.hero);
    await expect(bossImg(page)).toHaveAttribute('src', item.boss);
    await expect(heroArt(page)).toHaveClass(/is-loaded/);
    await expect(page.locator('.enemy-slot .enemy-miniature-art').first()).toHaveClass(/is-loaded/);
    // Let the opening deal and entrance settle so the stills are in frame.
    await expect(page.locator('.combat-screen.fx-playing')).toHaveCount(0, { timeout: 8_000 });
    await expect(page.locator('.hand-card-hidden')).toHaveCount(0, { timeout: 8_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `test-results/damage-stage-${item.shot}.png` });
  }
});

test('regular enemies keep their single still at low HP', async ({ page }) => {
  await reviewCombat(page, { enemyDefIds: ['rock', 'eliteArmor'], enemyHp: [1, 1] });
  await expect(page.locator('.enemy-slot [data-art-key="enemyRock"]')).toHaveCount(1);
  await expect(page.locator('.enemy-slot [data-art-key="enemyEliteArmor"]')).toHaveCount(1);
  await expect(page.locator('.enemy-slot img[src*="-beaten"]')).toHaveCount(0);
});

test('the hero holds the faint still at 0 HP', async ({ page }) => {
  await reviewCombat(page, { enemyDefIds: ['boss1'], heroHp: 0 });
  await expect(heroImg(page)).toHaveAttribute('src', /hero-martial-artist-faint\.webp/);
  await expect(heroArt(page)).toHaveAttribute('data-hero-base', 'faint');
});

test('a broken stage still falls back to the fresh hero', async ({ page }) => {
  await reviewCombat(page, { enemyDefIds: ['boss1'], heroHp: 20 });
  await expect(heroArt(page)).toHaveClass(/is-loaded/);
  await heroImg(page).evaluate((element) => {
    (element as HTMLImageElement).src = '/missing-hero-stage.webp';
  });
  await expect(heroImg(page)).toHaveAttribute('src', /hero-martial-artist\.webp/);
  await expect(heroArt(page)).toHaveClass(/is-loaded/);
});

test('an enemy hit flashes the hurt pose, then returns to the HP still', async ({ page }) => {
  await reviewCombat(page, { enemyDefIds: ['boss1'], heroHp: 40 });
  await page.locator('.end-turn-btn').click();
  await expect(heroArt(page)).toHaveAttribute('data-hero-pose', /hurt|defend/, { timeout: 8_000 });
  await expect(heroArt(page)).not.toHaveAttribute('data-hero-pose', /.+/, { timeout: 8_000 });
  await expect(heroImg(page)).not.toHaveAttribute('src', /-(attack|cast|defend|hurt)\.webp/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('skips transient poses but still applies damage stages', async ({ page }) => {
    await reviewCombat(page, { enemyDefIds: ['boss1'], heroHp: 20, enemyHp: [10] });
    await expect(heroImg(page)).toHaveAttribute('src', /hero-martial-artist-scuffed\.webp/);
    await expect(bossImg(page)).toHaveAttribute('src', /boss-1-beaten\.webp/);
    await page.locator('.end-turn-btn').click();
    await expect(page.locator('.end-turn-btn')).toBeEnabled({ timeout: 8_000 });
    await expect(heroArt(page)).not.toHaveAttribute('data-hero-pose', /.+/);
  });
});
