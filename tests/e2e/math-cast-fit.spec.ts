import { expect, test, type Page } from '@playwright/test';

// Playtest PR #61 (A3, A4, A10): the 珠算武者 question must be readable and
// fully inside its box, its three answers must be big separate tap targets on
// screen, and both characters must show on the select screen without scrolling.

const SIZES = [
  'landscape-wide',
  'tablet-landscape',
  'short-landscape',
  'phone-landscape-chromium',
  'phone-landscape-webkit',
  'phone-portrait-webkit',
  'phone-narrow',
];
const LANDSCAPE_PHONES = ['phone-landscape-chromium', 'phone-landscape-webkit'];
// The speech note is also checked at 568×320, which is shorter than the
// supported phones and is where the note used to leave the viewport.
const SPEECH_NOTE_SIZES = [...SIZES, 'phone-568x320'];

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

test('a hint and the speech note leave the three answers on screen', async ({ page }, testInfo) => {
  test.skip(!SPEECH_NOTE_SIZES.includes(testInfo.project.name));
  await openMathCast(page);
  await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    window.dispatchEvent(
      new CustomEvent('zhuyin-speech-fallback', { detail: { text: run().cast!.prompt.cue.speechText } }),
    );
  });
  await expect(page.locator('.speech-fallback-note')).toContainText('語音暫時無法播放');
  await expect(page.locator('.speech-fallback-note')).toContainText('仍需選出答案');
  await page.locator('.cast-dock .hint-btn').click();
  await expect(page.locator('.spell-hint-reveal')).toBeVisible();
  await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    window.dispatchEvent(
      new CustomEvent('zhuyin-speech-fallback', { detail: { text: run().cast!.prompt.cue.speechText } }),
    );
  });
  const size = page.viewportSize()!;
  const choices = page.locator('.cast-choice-key');
  expect(await choices.count()).toBe(3);
  for (const key of await choices.all()) {
    const box = await key.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    const hit = await key.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && el.contains(top);
    });
    expect(hit).toBe(true);
  }
  const hint = page.locator('.cast-dock .hint-btn');
  const hintBox = await hint.boundingBox();
  expect(hintBox).toBeTruthy();
  expect(hintBox!.width).toBeGreaterThanOrEqual(48);
  expect(hintBox!.height).toBeGreaterThanOrEqual(48);
  expect(hintBox!.y + hintBox!.height).toBeLessThanOrEqual(size.height);
  const hintHit = await hint.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && el.contains(top);
  });
  expect(hintHit).toBe(true);
  const note = page.locator('.speech-fallback-note');
  await expect(note).toBeInViewport({ ratio: 1 });
  const clippedBy = await note.evaluate((el) => {
    const r = el.getBoundingClientRect();
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      // The fight is position:fixed and wider than the 1024px app frame.
      // That frame does not clip it.
      if (parent.id === 'app') break;
      const style = getComputedStyle(parent);
      if (style.display === 'contents') continue;
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
      const box = parent.getBoundingClientRect();
      if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) {
        return parent.className || parent.tagName;
      }
    }
    return null;
  });
  expect(clippedBy, 'container clipping the speech note').toBeNull();
  const wordOnScreen = await page.locator('.cast-cue-pane .cue-word').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  });
  expect(wordOnScreen).toBe(true);
});

test('focusing 繼續 on a short phone does not scroll the math correction away', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-landscape-chromium');
  await openMathCast(page);
  const answer = await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    return run().cast!.prompt.answerTokens[0];
  });
  const miss = async (): Promise<void> => {
    await page.evaluate((correct) => {
      const button = [...document.querySelectorAll<HTMLButtonElement>('.cast-choice-key')].find(
        (candidate) => candidate.textContent?.trim() !== correct,
      );
      button?.click();
    }, answer);
  };
  await miss();
  await expect(page.locator('.cast-kid-prompt')).toContainText('再數數看');
  await miss();
  const report = await page.waitForFunction(() => {
    const overlay = document.querySelector('.spell-reveal-overlay');
    const card = document.querySelector<HTMLElement>('.spell-reveal-card');
    const wordEl = document.querySelector('.spell-reveal-word');
    const spellEl = document.querySelector('.spell-reveal-spell');
    if (!overlay?.classList.contains('can-continue') || !card || !wordEl || !spellEl) return null;
    const word = wordEl.getBoundingClientRect();
    const spell = spellEl.getBoundingClientRect();
    const onScreen = (r: DOMRect) => r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
    return {
      scrollTop: card.scrollTop,
      wordOn: onScreen(word),
      spellOn: onScreen(spell),
      active: document.activeElement?.className ?? '',
    };
  }).then((handle) => handle.jsonValue());
  expect(report.scrollTop).toBe(0);
  expect(report.wordOn).toBe(true);
  expect(report.spellOn).toBe(true);
  expect(report.active).toContain('spell-reveal-continue');
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
