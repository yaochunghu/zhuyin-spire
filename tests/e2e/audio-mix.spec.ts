/**
 * DUCK_SPEC in a real browser: the Web Audio graph, bus ramps, held rewards and
 * merged repeats, driven through the dev server's own audio module.
 */
import { expect, test } from '@playwright/test';

type AudioModule = typeof import('../../src/game/audio');
declare global {
  interface Window { __mix?: AudioModule }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.mouse.click(5, 5); // a user gesture, so the AudioContext may run
  await page.evaluate(async () => {
    const path = '/src/game/audio.ts';
    const audio = (await import(/* @vite-ignore */ path)) as AudioModule;
    audio.setVolume(1);
    audio.resetMixForTests();
    audio.warmAudio();
    window.__mix = audio;
  });
  await expect.poll(() => page.evaluate(() => window.__mix!.getMixSnapshot().buses !== null)).toBe(true);
});

test('master limiter: threshold −1 dB, ratio 20, attack 3 ms, release 100 ms', async ({ page }) => {
  const lim = await page.evaluate(() => window.__mix!.getMixSnapshot().limiter);
  expect(lim).not.toBeNull();
  expect(lim!.threshold).toBeCloseTo(-1, 3);
  expect(lim!.ratio).toBeCloseTo(20, 3);
  expect(lim!.attack).toBeCloseTo(0.003, 4);
  expect(lim!.release).toBeCloseTo(0.1, 4);
});

test('voice ducks sfx −6 dB and music −12 dB, leaves taps alone, then recovers', async ({ page }) => {
  await page.evaluate(() => window.__mix!.setVoiceActivity('clip', true));
  await page.waitForTimeout(300);
  const ducked = await page.evaluate(() => window.__mix!.getMixSnapshot().buses!);
  expect(20 * Math.log10(ducked.sfx)).toBeCloseTo(-6, 0);
  expect(20 * Math.log10(ducked.music)).toBeCloseTo(-12, 0);
  expect(ducked.ui).toBeCloseTo(1, 3);
  expect(ducked.voice).toBeCloseTo(1, 3);

  await page.evaluate(() => window.__mix!.setVoiceActivity('clip', false));
  await page.waitForTimeout(700);
  const back = await page.evaluate(() => window.__mix!.getMixSnapshot().buses!);
  expect(back.sfx).toBeCloseTo(1, 2);
  expect(back.music).toBeCloseTo(1, 2);
});

test('card description + 3 quick taps: taps at full level, ding at once on the ducked bus', async ({ page }) => {
  const shots = await page.evaluate(() => {
    const a = window.__mix!;
    a.setVoiceActivity('clip', true);
    a.sfx.click();
    a.sfx.cardPlay();
    a.sfx.click();
    a.sfx.ding();
    const s = a.getMixSnapshot();
    a.setVoiceActivity('clip', false);
    return { shots: s.shots, targets: s.busTargets };
  });
  expect(shots.shots.filter((s) => s.bus === 'ui')).toHaveLength(3);
  expect(shots.shots.find((s) => s.key === 'ding')).toMatchObject({ bus: 'sfx', heldMs: 0 });
  expect(shots.targets.ui).toBe(1);
  expect(shots.targets.sfx).toBeCloseTo(0.5, 2);
});

test('a correct answer inside a math prompt: the ding waits for the prompt + 150 ms', async ({ page }) => {
  await page.evaluate(() => {
    window.__mix!.setVoiceActivity('clip', true, true);
    window.__mix!.sfx.ding();
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__mix!.getMixSnapshot())).toMatchObject({ held: ['ding'], shots: [] });
  await page.evaluate(() => window.__mix!.setVoiceActivity('clip', false));
  await expect.poll(() => page.evaluate(() => window.__mix!.getMixSnapshot().shots.length)).toBe(1);
  const [ding] = await page.evaluate(() => window.__mix!.getMixSnapshot().shots);
  expect(ding!.key).toBe('ding');
  expect(ding!.heldMs).toBeGreaterThanOrEqual(400 + 150);
});

test('3 golds within 50 ms play one gold sound at gain 0.4', async ({ page }) => {
  const shots = await page.evaluate(async () => {
    const a = window.__mix!;
    a.sfx.gold();
    await new Promise((r) => setTimeout(r, 20));
    a.sfx.gold();
    await new Promise((r) => setTimeout(r, 20));
    a.sfx.gold();
    return a.getMixSnapshot().shots;
  });
  expect(shots).toEqual([{ key: 'gold', bus: 'sfx', gain: 0.4, heldMs: 0 }]);
});

test('no ducking while the Voice toggle is off', async ({ page }) => {
  const snap = await page.evaluate(() => {
    const a = window.__mix!;
    a.setBusMuted('voice', true);
    a.setVoiceActivity('clip', true, true);
    a.sfx.ding();
    const s = a.getMixSnapshot();
    a.setVoiceActivity('clip', false);
    a.setBusMuted('voice', false);
    return s;
  });
  expect(snap.ducking).toBe(false);
  expect(snap.busTargets.sfx).toBe(1);
  expect(snap.held).toEqual([]);
  expect(snap.shots.map((s) => s.key)).toEqual(['ding']);
});
