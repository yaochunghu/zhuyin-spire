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
  // Register before the action: waitForLoadState can resolve against the old page.
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.getByRole('button', { name: '清除這台裝置的所有遊戲資料' }).click(),
  ]);
  expect(await page.evaluate(() => localStorage.getItem('zhuyin-spire-test-private'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-test-key'))).toBe('keep');
});

test('production bundle has no child-error model and ignores ?childModel', async ({ page }) => {
  await page.goto('?debug=1&childModel=firstGrader&seed=1');
  await expect(page.locator('.title-screen')).toBeVisible();
  expect(await page.evaluate(() => {
    const host = window as Window & { __zsDebug?: unknown; __zsChildModelGate?: unknown };
    return { api: host.__zsDebug ?? null, gate: host.__zsChildModelGate ?? null };
  })).toEqual({ api: null, gate: null });

  const sources = await page.evaluate(() => [
    ...document.querySelectorAll('script[src], link[rel="modulepreload"]'),
  ].map((node) => (node as HTMLScriptElement).src || (node as HTMLLinkElement).href));
  expect(sources.some((source) => source.endsWith('.js'))).toBe(true);
  for (const source of sources) {
    const body = await (await page.request.get(source)).text();
    expect(body).not.toMatch(/childModel|ChildModel|__zsDebug|firstGrader/);
  }
});
