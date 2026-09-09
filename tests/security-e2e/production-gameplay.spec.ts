import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

async function enterTutorial(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '開始爬塔', exact: true }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  // Exercise keyboard activation as well as the pointer-based responsive suite.
  await page.locator('.map-dot:not([disabled])').first().press('Enter');
  await expect(page.locator('.tutorial-step-shield')).toBeVisible();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
}

async function solve(page: Page) {
  await page.locator('.hint-btn').click();
  const answer = (await page.locator('.spell-answer').textContent())!.trim();
  for (const symbol of answer) {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await page.locator('.spell-key:not(:disabled)').filter({ hasText: new RegExp(`^${escaped}$`) }).first().click();
  }
  await expect(page.locator('.spell-reveal-overlay')).toBeVisible();
  await expect(page.locator('.spell-reveal-spell')).toHaveText(answer);
  // Verify the normal automatic advance; clicking a disappearing Continue button
  // races the reveal timer under slower browser startup or CI load.
  await expect(page.locator('.cast-screen')).toHaveCount(0);
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
}

test('production tutorial requires full casts and reaches a saved reward', async ({ page }) => {
  // Three timed casts plus browser startup/reload need a full-flow budget on busy CI.
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enterTutorial(page);
  await page.getByRole('button', { name: '注音 ㄇ', exact: true }).click();
  await solve(page);
  await expect(page.locator('.tutorial-step-endTurn')).toBeVisible();
  await page.locator('.end-turn-btn').click();
  await page.getByRole('button', { name: '注音 ㄅ', exact: true }).first().click();
  await solve(page);
  await page.getByRole('button', { name: '注音 ㄆ', exact: true }).click();
  await solve(page);
  await expect(page.locator('.reward-screen')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /繼續爬塔/ }).click();
  await expect(page.locator('.reward-screen')).toBeVisible();
  expect(errors).toEqual([]);
});

test('hidden page and native pause modal compose without submitting a pending cast', async ({ page }) => {
  await enterTutorial(page);
  await page.getByRole('button', { name: '注音 ㄇ', exact: true }).click();
  await page.locator('.hint-btn').click();
  const answer = (await page.locator('.spell-answer').textContent())!.trim();
  await page.evaluate((symbols) => {
    for (const symbol of symbols) {
      const key = [...document.querySelectorAll<HTMLButtonElement>('.spell-key:not(:disabled)')]
        .find((button) => button.textContent?.trim() === symbol)!;
      key.click();
    }
    document.querySelector<HTMLButtonElement>('.pause-global-control')!.click();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, [...answer]);
  await expect(page.locator('#zhuyin-phone-menu-root')).toHaveJSProperty('open', true);
  await page.getByRole('button', { name: '▶️ 繼續玩', exact: true }).click();
  // Deliberately wait past the 380 ms submission boundary while hidden.
  await page.waitForTimeout(650);
  await expect(page.locator('.cast-screen')).toBeVisible();
  await expect(page.locator('.spell-reveal-overlay')).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.spell-reveal-overlay')).toBeVisible();
});

test('save denial is visible and unavailable speech keeps a full answer gate', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('zhuyin-spire-run-v1')) throw new DOMException('full', 'QuotaExceededError');
      original.call(this, key, value);
    };
    // WebKit may return a fresh speechSynthesis wrapper on each access.
    // Replace the window property so the unavailable-voice fixture is stable.
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [], cancel: () => {}, speak: () => {},
    } });
  });
  await enterTutorial(page);
  await page.getByRole('button', { name: '開啟暫停選單' }).click();
  await expect(page.locator('.checkpoint-status')).toContainText('無法儲存');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '注音 ㄇ', exact: true }).click();
  await expect(page.locator('.speech-fallback-note')).toContainText('請大人念');
  await expect(page.locator('.cast-screen')).toBeVisible();
  await expect(page.locator('.spell-submit')).toBeDisabled();
});

test('a stalled card animation cannot leave the hand locked', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      animation.pause(); // Simulate a browser that never delivers finish/cancel.
      return animation;
    };
  });
  await page.goto('./');
  await page.getByRole('button', { name: '開始爬塔', exact: true }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // The map token intentionally pulses. Its center is still a valid touch target.
  await page.locator('.map-dot:not([disabled])').first().click({ force: true });
  await expect(page.locator('.tutorial-step-shield')).toBeVisible();
  await expect(page.locator('.hand-card-hidden')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '注音 ㄇ', exact: true })).toBeEnabled();
});
