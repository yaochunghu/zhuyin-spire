import { expect, test } from '@playwright/test';

test('ignores ?childModel unless the debug query is set', async ({ page }) => {
  await page.goto('/?childModel=firstGrader&seed=1');
  await page.waitForFunction(() => {
    const gate = (window as Window & { __zsChildModelGate?: { installed: boolean } }).__zsChildModelGate;
    return gate !== undefined;
  });
  await expect(page.locator('.title-screen')).toBeVisible();
  expect(await page.evaluate(() => {
    const host = window as Window & { __zsDebug?: unknown; __zsChildModelGate?: { installed: boolean } };
    return { api: host.__zsDebug ?? null, installed: host.__zsChildModelGate?.installed ?? null };
  })).toEqual({ api: null, installed: false });
});

test('localStorage debug alone does not answer for ?childModel', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('zhuyin-debug', '1'));
  await page.goto('/?childModel=struggling');
  await page.waitForFunction(() => {
    return (window as Window & { __zsChildModelGate?: unknown }).__zsChildModelGate !== undefined;
  });
  await expect(page.locator('.title-screen')).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __zsDebug?: unknown }).__zsDebug ?? null)).toBeNull();
});

test('exposes answerCast with ?debug and stays on the title screen', async ({ page }) => {
  await page.goto('/?debug&childModel=firstGrader&seed=1&zhuyinP=0.7');
  await page.waitForFunction(() => {
    return (window as Window & { __zsChildModelGate?: { installed: boolean } }).__zsChildModelGate?.installed === true;
  });
  await expect(page.locator('.title-screen')).toBeVisible();
  const snapshot = await page.evaluate(() => {
    const api = (window as Window & {
      __zsDebug?: { personaId: string; zhuyinP: number; answerCast: () => string };
    }).__zsDebug;
    return {
      personaId: api?.personaId ?? '',
      zhuyinP: api?.zhuyinP ?? -1,
      idle: api?.answerCast() ?? '',
    };
  });
  expect(snapshot).toEqual({ personaId: 'firstGrader', zhuyinP: 0.7, idle: 'idle' });
  await expect(page.locator('.title-screen')).toBeVisible();
});
