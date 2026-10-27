import { expect, test, type Page } from '@playwright/test';

const consoleErrors = new WeakMap<Page, string[]>();

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

async function waitForCombatIdle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const screen = document.querySelector('.combat-screen');
    return !screen || !screen.classList.contains('fx-playing');
  });
}

test('drinks, aims, buys, and resolves a full belt', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  await page.locator('.debug-head .debug-btn-icon').click();

  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const state = run();
    state.heroHp = 20;
    state.potions = ['warmHoney', 'guardBubble', 'soundPebble'];
    render();
  });

  const belt = page.locator('.map-potion-row .potion-belt');
  await expect(belt).toBeVisible();
  await expect(belt.locator('.potion-slot')).toHaveCount(3);
  await page.screenshot({
    path: '/opt/cursor/artifacts/potion-belt-desktop.png',
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(belt).toBeVisible();
  const phoneSlot = await belt.locator('.potion-slot').first().boundingBox();
  expect(phoneSlot).not.toBeNull();
  expect(Math.round(phoneSlot!.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(phoneSlot!.height)).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: '/opt/cursor/artifacts/potion-belt-phone.png',
    fullPage: true,
  });

  await page.getByRole('button', { name: '查看藥水：蜂蜜暖茶' }).click();
  const honey = page.getByRole('dialog', { name: '查看藥水：蜂蜜暖茶' });
  await expect(honey).toBeVisible();
  await honey.getByRole('button', { name: '使用', exact: true }).click();
  await expect(page.locator('[data-map-hp]')).toHaveText('🧒❤️25');
  await expect(page.locator('.potion-slot[data-potion-id="warmHoney"]')).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugStartEncounter } = await import('/src/game/state.ts');
    const state = run();
    debugStartEncounter(state, 'slime');
    render();
  });
  await expect(page.locator('.combat-potion-belt')).toBeVisible();
  await waitForCombatIdle(page);
  await page.screenshot({
    path: '/opt/cursor/artifacts/potion-belt-combat-desktop.png',
    fullPage: true,
  });

  await page.getByRole('button', { name: '查看藥水：護盾泡泡' }).click();
  await page.getByRole('dialog', { name: '查看藥水：護盾泡泡' }).getByRole('button', { name: '使用', exact: true }).click();
  await expect(page.locator('[data-block-val]')).toHaveText('8');
  await waitForCombatIdle(page);

  await page.getByRole('button', { name: '查看藥水：音波小石' }).click();
  await page.getByRole('dialog', { name: '查看藥水：音波小石' }).getByRole('button', { name: '使用', exact: true }).click();
  await expect(page.locator('.enemy-slot.potion-aim-target')).toBeVisible();
  await page.getByRole('button', { name: '取消藥水瞄準' }).click();
  await expect(page.locator('.enemy-slot.potion-aim-target')).toHaveCount(0);
  await expect(page.locator('.potion-slot[data-potion-id="soundPebble"]')).toHaveCount(1);

  const hpBefore = await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    return run().combat!.enemies[0]!.hp;
  });
  await page.getByRole('button', { name: '查看藥水：音波小石' }).click();
  await page.getByRole('dialog', { name: '查看藥水：音波小石' }).getByRole('button', { name: '使用', exact: true }).click();
  await page.locator('.enemy-slot.potion-aim-target').click();
  await expect.poll(async () => page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    return run().combat?.enemies[0]?.hp ?? -1;
  })).toBe(hpBefore - 6);
  await expect(page.locator('.potion-slot[data-potion-id="soundPebble"]')).toHaveCount(0);
  await waitForCombatIdle(page);

  await page.evaluate(async () => {
    const { SHOP_POTION_PRICE } = await import('/src/data/balance.ts');
    const { rollShopPotions } = await import('/src/data/potions.ts');
    const { run, render } = await import('/src/ui/runtime.ts');
    const state = run();
    state.combat = null;
    state.screen = 'shop';
    state.gold = 40;
    state.potions = [null, null, null];
    state.shopPotionOffers = rollShopPotions(() => 0).map((potionId) => ({
      potionId,
      price: SHOP_POTION_PRICE,
      sold: false,
    }));
    render();
  });
  const shopButtons = page.locator('.shop-potion-button');
  await expect(shopButtons).toHaveCount(2);
  const firstLabel = await shopButtons.first().getAttribute('aria-label');
  await shopButtons.first().click();
  await expect(page.locator('.kid-stat').filter({ hasText: '🪙' }).first()).toHaveText('🪙22');
  await expect(page.locator('.potion-slot[data-potion-id]')).toHaveCount(1);

  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const state = run();
    state.potions = ['guardBubble', 'soundPebble', 'warmHoney'];
    render();
  });
  await expect(shopButtons.nth(1)).toBeDisabled();
  expect(firstLabel).toContain('買');

  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { resolvePotionDrop } = await import('/src/game/state.ts');
    const state = run();
    state.screen = 'reward';
    state.rewardSource = 'fight';
    state.rewardOptions = [];
    state.pendingGold = 0;
    state.pendingRelicId = null;
    state.potions = ['guardBubble', 'soundPebble', 'warmHoney'];
    state.potionDropChance = 40;
    resolvePotionDrop(state, (max) => (max === 100 ? 0 : 5));
    render();
  });
  await expect(page.locator('.potion-reward-name')).toHaveText('合唱爆泡');
  await expect(page.getByRole('button', { name: '收下寶箱' })).toBeDisabled();
  await page.getByRole('button', { name: '用這瓶換掉護盾泡泡' }).click();
  await expect(page.locator('.potion-slot[data-potion-slot="0"]')).toHaveAttribute('data-potion-id', 'chorusBurst');
  await expect(page.getByRole('button', { name: '收下寶箱' })).toBeEnabled();
});
