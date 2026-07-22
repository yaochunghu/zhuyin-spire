import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('security-test-ready') !== '1') {
      localStorage.clear();
      sessionStorage.setItem('security-test-ready', '1');
    }
  });
});

test('release build ignores debug flags and makes no third-party requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => localStorage.setItem('zhuyin-debug', '1'));
  await page.goto('?debug=1');
  await expect(page.locator('.title-screen')).toBeVisible();
  await expect(page.locator('#zhuyin-debug-root')).toHaveCount(0);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4174')).toBe(true);
});

test('privacy control clears game keys but preserves unrelated storage', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('privacy-seeded') !== '1') {
      localStorage.setItem('zhuyin-spire-test-private', 'remove');
      localStorage.setItem('unrelated-test-key', 'keep');
      sessionStorage.setItem('privacy-seeded', '1');
    }
  });
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('');
  await page.getByRole('button', { name: '🔒 隱私與資料' }).click();
  await page.getByRole('button', { name: '清除這台裝置的所有遊戲資料' }).click();
  await page.waitForLoadState('domcontentloaded');
  expect(await page.evaluate(() => localStorage.getItem('zhuyin-spire-test-private'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-test-key'))).toBe('keep');
});
