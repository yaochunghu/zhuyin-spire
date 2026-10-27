import { expect, test, type Page } from '@playwright/test';

// Playtest PR #61 (A3, A4, A10): the 珠算武者 question must be readable and
// fully inside its box, its three answers must be big separate tap targets on
// screen, and both characters must show on the select screen without scrolling.

const SIZES = ['landscape-wide', 'phone-landscape-chromium', 'phone-landscape-webkit', 'phone-portrait-webkit'];
const LANDSCAPE_PHONES = ['phone-landscape-chromium', 'phone-landscape-webkit'];

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('math-cast-fit-keep')) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('math-cast-fit-keep', '1');
  });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

function sizeLabel(page: Page): string {
  const size = page.viewportSize()!;
  return `${size.width}x${size.height}`;
}

async function openMathCast(page: Page): Promise<void> {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇珠算武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  // The debug panel opens on its own only where there is room; fold it away.
  const fold = page.locator('.debug-panel .debug-head .debug-btn-icon');
  if (await fold.isVisible()) await fold.click();
  await expect(page.locator('.debug-panel')).toBeHidden();
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugStartEncounter } = await import('/src/game/state.ts');
    debugStartEncounter(run(), 'slime');
    render();
  });
  await expect(page.locator('.hand .card').first()).toBeVisible();
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { tryPlayCard } = await import('/src/game/state.ts');
    const state = run();
    const combat = state.combat!;
    tryPlayCard(state, combat.hand[0].uid, [combat.enemies[0].id]);
    render();
  });
  await expect(page.locator('.cast-choice-key')).toHaveCount(3);
  await expect(page.locator('.cast-cue-pane .cue-word')).toBeVisible();
  // Let the dock's open transition settle before measuring.
  await page.waitForTimeout(600);
}

test('the math question is high-contrast and fits inside its box', async ({ page }, testInfo) => {
  test.skip(!SIZES.includes(testInfo.project.name));
  await openMathCast(page);
  const report = await page.evaluate(() => {
    type Rgba = [number, number, number, number];
    const parse = (value: string): Rgba[] =>
      [...value.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => {
        const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return [parts[0], parts[1], parts[2], parts[3] ?? 1];
      });
    const lum = ([r, g, b]: Rgba): number => {
      const ch = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const ratio = (a: Rgba, b: Rgba): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const word = document.querySelector<HTMLElement>('.cast-cue-pane .cue-word')!;
    const box = document.querySelector<HTMLElement>('.cast-cue-pane .cue-box')!;
    const fg = parse(getComputedStyle(word).color)[0];
    // Every solid colour or gradient stop painted behind the text, nearest first.
    let backgrounds: Rgba[] = [];
    for (let el: HTMLElement | null = word; el; el = el.parentElement) {
      const style = getComputedStyle(el);
      const stops = parse(style.backgroundImage).filter((c) => c[3] > 0.5);
      const solid = parse(style.backgroundColor).filter((c) => c[3] > 0.5);
      if (stops.length || solid.length) {
        backgrounds = [...stops, ...solid];
        break;
      }
    }
    const worst = backgrounds.length ? Math.min(...backgrounds.map((bg) => ratio(fg, bg))) : 0;
    const boxRect = box.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const children = [...box.querySelectorAll<HTMLElement>('*')].map((el) => el.getBoundingClientRect());
    const outside = children.filter(
      (r) =>
        r.width > 0 &&
        (r.left < boxRect.left - 1 || r.right > boxRect.right + 1 || r.top < boxRect.top - 1 || r.bottom > boxRect.bottom + 1),
    ).length;
    return {
      text: word.textContent,
      fontSize: parseFloat(getComputedStyle(word).fontSize),
      worst,
      backgrounds: backgrounds.length,
      overflowY: box.scrollHeight - box.clientHeight,
      overflowX: box.scrollWidth - box.clientWidth,
      outside,
      wordOnScreen: wordRect.top >= 0 && wordRect.bottom <= innerHeight && wordRect.left >= 0 && wordRect.right <= innerWidth,
    };
  });
  expect(report.backgrounds, 'a background behind the question').toBeGreaterThan(0);
  expect(report.worst, `contrast of "${report.text}"`).toBeGreaterThanOrEqual(4.5);
  expect(report.fontSize).toBeGreaterThanOrEqual(18);
  expect(report.overflowY).toBeLessThanOrEqual(1);
  expect(report.overflowX).toBeLessThanOrEqual(1);
  expect(report.outside, 'elements poking out of the question box').toBe(0);
  expect(report.wordOnScreen).toBe(true);
  await page.screenshot({ path: `test-results/math-cast-fit/cast-${sizeLabel(page)}.png` });
});

test('the three math choices are big, separate, and on screen', async ({ page }, testInfo) => {
  test.skip(!SIZES.includes(testInfo.project.name));
  await openMathCast(page);
  const rects = await page.locator('.cast-choice-key').evaluateAll((keys) =>
    keys.map((key) => {
      const r = key.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }),
  );
  const size = page.viewportSize()!;
  expect(rects).toHaveLength(3);
  for (const r of rects) {
    expect(r.height).toBeGreaterThanOrEqual(48);
    expect(r.width).toBeGreaterThanOrEqual(48);
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.top).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(size.width);
    expect(r.bottom).toBeLessThanOrEqual(size.height);
  }
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap, `choice ${i + 1} overlaps choice ${j + 1}`).toBe(false);
    }
  }
  // Each choice takes its own tap at its centre.
  for (const key of await page.locator('.cast-choice-key').all()) {
    const hit = await key.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && el.contains(top);
    });
    expect(hit).toBe(true);
  }
});

test('both characters show on the select screen without scrolling', async ({ page }, testInfo) => {
  test.skip(!LANDSCAPE_PHONES.includes(testInfo.project.name));
  await page.goto('/');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  for (const name of [/選擇共鳴武者/, /選擇珠算武者/]) {
    await expect(page.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
  }
  for (const heading of ['共鳴武者', '珠算武者']) {
    await expect(page.getByText(heading, { exact: true }).first()).toBeInViewport({ ratio: 1 });
  }
  const scrolled = await page.evaluate(() => ({
    window: window.scrollY,
    screen: document.querySelector('.screen')?.scrollTop ?? 0,
  }));
  expect(scrolled).toEqual({ window: 0, screen: 0 });
  await page.screenshot({ path: `test-results/math-cast-fit/charselect-${sizeLabel(page)}.png` });
});
