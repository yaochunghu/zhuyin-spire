import { expect, test, type Page } from '@playwright/test';
import { CAST_FIT_VIEWPORTS, runCastStateMatrix } from './castFitMatrix';

// The 共鳴武者 注音 dock must show a readable word inside its box, every slot,
// key, and control as a separate full-size tap target on screen without
// scrolling, and the speech-fallback note in full, in both recognize and
// listen modes.

const SIZES = [
  'landscape-wide',
  'tablet-landscape',
  'short-landscape',
  'phone-landscape-chromium',
  'phone-landscape-webkit',
  'phone-portrait-webkit',
  'phone-narrow',
];
// 640×360, 844×390, 568×320, plus the other small fit sizes.
const TUTORIAL_BANNER_SIZES = [
  'phone-landscape-chromium',
  'phone-landscape-webkit',
  'phone-568x320',
  'phone-narrow',
  'phone-portrait-webkit',
  'short-landscape',
];
const MODES = ['recognize', 'listen'] as const;
const TARGETS = [
  '.cast-dock .spell-slot',
  '.cast-dock .spell-key',
  '.cast-dock .spell-ctrl',
  '.cast-dock .replay-btn',
  '.cast-dock .hint-btn',
].join(', ');

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('zhuyin-cast-fit-keep')) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('zhuyin-cast-fit-keep', '1');
  });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

function sizeLabel(page: Page): string {
  const size = page.viewportSize()!;
  return `${size.width}x${size.height}`;
}

async function openZhuyinCast(page: Page, mode: (typeof MODES)[number]): Promise<void> {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
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
  await page.evaluate(async (castMode) => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { tryPlayCard } = await import('/src/game/state.ts');
    const state = run();
    const combat = state.combat!;
    tryPlayCard(state, combat.hand[0].uid, [combat.enemies[0].id]);
    // The mode is drawn at random; pin it so both layouts are measured.
    state.cast!.prompt.mode = castMode;
    render();
  }, mode);
  await expect(page.locator('.cast-dock:not(.cast-math) .spell-key').first()).toBeVisible();
  await expect(page.locator('.cast-cue-pane .cue-word')).toBeVisible();
  await expect(page.locator('.cast-dock .replay-btn')).toHaveCount(mode === 'listen' ? 1 : 0);
  await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    window.dispatchEvent(
      new CustomEvent('zhuyin-speech-fallback', { detail: { text: run().cast!.prompt.cue.speechText } }),
    );
  });
  await expect(page.locator('.cast-cue-pane .speech-fallback-note')).toBeVisible();
  // Let the dock's open transition settle before measuring.
  await page.waitForTimeout(600);
}

for (const mode of MODES) {
  test(`${mode}: the 注音 word is high-contrast and fits inside its box`, async ({ page }, testInfo) => {
    test.skip(!SIZES.includes(testInfo.project.name));
    await openZhuyinCast(page, mode);
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
      const emoji = box.querySelector<HTMLElement>('.cue-emoji');
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
      const emojiRect = emoji?.getBoundingClientRect();
      const children = [...box.querySelectorAll<HTMLElement>('*')].map((el) => el.getBoundingClientRect());
      const outside = children.filter(
        (r) =>
          r.width > 0 &&
          (r.left < boxRect.left - 1 || r.right > boxRect.right + 1 || r.top < boxRect.top - 1 || r.bottom > boxRect.bottom + 1),
      ).length;
      const emojiOverlapsWord =
        !!emojiRect &&
        emojiRect.left < wordRect.right - 1 &&
        wordRect.left < emojiRect.right - 1 &&
        emojiRect.top < wordRect.bottom - 1 &&
        wordRect.top < emojiRect.bottom - 1;
      return {
        text: word.textContent,
        fontSize: parseFloat(getComputedStyle(word).fontSize),
        worst,
        backgrounds: backgrounds.length,
        overflowY: box.scrollHeight - box.clientHeight,
        overflowX: box.scrollWidth - box.clientWidth,
        outside,
        emojiOverlapsWord,
        wordOnScreen: wordRect.top >= 0 && wordRect.bottom <= innerHeight && wordRect.left >= 0 && wordRect.right <= innerWidth,
      };
    });
    expect(report.backgrounds, 'a background behind the word').toBeGreaterThan(0);
    expect(report.worst, `contrast of "${report.text}"`).toBeGreaterThanOrEqual(4.5);
    expect(report.fontSize).toBeGreaterThanOrEqual(24);
    expect(report.overflowY).toBeLessThanOrEqual(1);
    expect(report.overflowX).toBeLessThanOrEqual(1);
    expect(report.outside, 'elements poking out of the word box').toBe(0);
    expect(report.emojiOverlapsWord, 'emoji overlapping the word').toBe(false);
    expect(report.wordOnScreen).toBe(true);
    await page.screenshot({ path: `test-results/zhuyin-cast-fit/cast-${mode}-${sizeLabel(page)}.png` });
  });

  test(`${mode}: every slot, key, and control is big, separate, and on screen`, async ({ page }, testInfo) => {
    test.skip(!SIZES.includes(testInfo.project.name));
    await openZhuyinCast(page, mode);
    const targets = page.locator(TARGETS);
    const rects = await targets.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        const label = `${el.className.split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 4)}"`;
        return { label, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      }),
    );
    const slots = await page.locator('.cast-dock .spell-slot').count();
    expect(slots).toBeGreaterThanOrEqual(2);
    expect(slots).toBeLessThanOrEqual(4);
    expect(await page.locator('.cast-dock .spell-ctrl').count()).toBe(3);
    expect(await page.locator('.cast-dock .hint-btn').count()).toBe(1);
    const size = page.viewportSize()!;
    for (const r of rects) {
      expect(r.width, `${r.label} width`).toBeGreaterThanOrEqual(48);
      expect(r.height, `${r.label} height`).toBeGreaterThanOrEqual(48);
      expect(r.left, `${r.label} left`).toBeGreaterThanOrEqual(0);
      expect(r.top, `${r.label} top`).toBeGreaterThanOrEqual(0);
      expect(r.right, `${r.label} right`).toBeLessThanOrEqual(size.width);
      expect(r.bottom, `${r.label} bottom`).toBeLessThanOrEqual(size.height);
    }
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `${a.label} overlaps ${b.label}`).toBe(false);
      }
    }
    // Nothing in the dock needs scrolling to reach.
    const scroll = await page.locator('.cast-dock').evaluate((dock) => {
      const style = getComputedStyle(dock);
      const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const borderX = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      // A border-box dock can report its walnut edge as scroll even when every
      // child sits inside the padding box. Ignore that edge, not real overflow.
      const rawY = dock.scrollHeight - dock.clientHeight;
      const rawX = dock.scrollWidth - dock.clientWidth;
      return {
        y: Math.abs(rawY - borderY) <= 1 ? 0 : rawY,
        x: Math.abs(rawX - borderX) <= 1 ? 0 : rawX,
      };
    });
    expect(scroll.y).toBeLessThanOrEqual(1);
    expect(scroll.x).toBeLessThanOrEqual(1);
    // Each target takes its own tap at its centre.
    for (const target of await targets.all()) {
      const hit = await target.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && el.contains(top);
      });
      expect(hit).toBe(true);
    }
  });

  test(`${mode}: the speech-fallback note is fully visible`, async ({ page }, testInfo) => {
    test.skip(!SIZES.includes(testInfo.project.name));
    await openZhuyinCast(page, mode);
    const note = page.locator('.cast-cue-pane .speech-fallback-note');
    await expect(note).toContainText('仍需拼出完整注音');
    await expect(note).toBeInViewport({ ratio: 1 });
    const clippedBy = await note.evaluate((el) => {
      const r = el.getBoundingClientRect();
      for (let p = el.parentElement; p; p = p.parentElement) {
        const style = getComputedStyle(p);
        // A display: contents pane has no box of its own, so it cannot clip.
        if (style.display === 'contents') continue;
        if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
        const c = p.getBoundingClientRect();
        if (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1) {
          return p.className || p.tagName;
        }
      }
      return null;
    });
    expect(clippedBy, 'container clipping the note').toBeNull();
  });

  test(`${mode}: a hint keeps 送出 on screen with the speech note`, async ({ page }, testInfo) => {
    test.skip(!SIZES.includes(testInfo.project.name));
    await openZhuyinCast(page, mode);
    await page.locator('.cast-dock .hint-btn').click();
    await expect(page.locator('.spell-hint-reveal')).toBeVisible();
    await page.evaluate(async () => {
      const { run } = await import('/src/ui/runtime.ts');
      window.dispatchEvent(
        new CustomEvent('zhuyin-speech-fallback', { detail: { text: run().cast!.prompt.cue.speechText } }),
      );
    });
    await expect(page.locator('.speech-fallback-note')).toContainText('仍需拼出完整注音');
    const size = page.viewportSize()!;
    for (const selector of ['.cast-dock .spell-ctrl', '.cast-dock .hint-btn']) {
      for (const target of await page.locator(selector).all()) {
        const box = await target.boundingBox();
        expect(box, selector).toBeTruthy();
        expect(box!.width).toBeGreaterThanOrEqual(48);
        expect(box!.height).toBeGreaterThanOrEqual(48);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
        expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
        const hit = await target.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!top && el.contains(top);
        });
        expect(hit, selector).toBe(true);
      }
    }
    const revealInside = await page.evaluate(() => {
      const reveal = document.querySelector('.spell-hint-reveal')!;
      const dock = document.querySelector('.cast-dock')!;
      const r = reveal.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      return r.top >= d.top - 1 && r.bottom <= d.bottom + 1 && r.left >= d.left - 1 && r.right <= d.right + 1;
    });
    expect(revealInside, 'hinted answer inside the dock').toBe(true);
    await expect(page.locator('.speech-fallback-note')).toBeInViewport({ ratio: 1 });
  });
}

async function foldDebug(page: Page): Promise<void> {
  const fold = page.locator('.debug-panel .debug-head .debug-btn-icon');
  if (await fold.isVisible()) await fold.click();
  await expect(page.locator('.debug-panel')).toBeHidden();
}

async function showSpeechFallback(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    window.dispatchEvent(
      new CustomEvent('zhuyin-speech-fallback', { detail: { text: run().cast!.prompt.cue.speechText } }),
    );
  });
}

/** The box is inside the viewport and no overflow ancestor cuts it off. */
async function expectFullyShown(page: Page, selector: string): Promise<void> {
  const viewportHeight = page.viewportSize()!.height;
  const rows = await page.locator(selector).evaluateAll((els, height) => {
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      let clippedBy: string | null = null;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === 'contents') continue;
        if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
        const box = parent.getBoundingClientRect();
        if (r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.right > box.right + 1) {
          clippedBy = parent.id || parent.className || parent.tagName;
          break;
        }
      }
      return { top: r.top, bottom: r.bottom, past: r.bottom - height, clippedBy };
    });
  }, viewportHeight);
  expect(rows.length, selector).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.top, `${selector} starts above the fold`).toBeGreaterThanOrEqual(0);
    expect(row.past, `${selector} extends past the fold`).toBeLessThanOrEqual(0);
    expect(row.clippedBy, `${selector} is cut off`).toBeNull();
  }
}

async function expectTappable(page: Page, selector: string): Promise<void> {
  const size = page.viewportSize()!;
  const targets = page.locator(selector);
  expect(await targets.count(), selector).toBeGreaterThan(0);
  for (const target of await targets.all()) {
    const box = await target.boundingBox();
    expect(box, selector).toBeTruthy();
    // WebKit can report a 48px key as 47.99998. A hundredth is still 48.
    expect(Math.round(box!.width * 100) / 100, selector).toBeGreaterThanOrEqual(48);
    expect(Math.round(box!.height * 100) / 100, selector).toBeGreaterThanOrEqual(48);
    expect(box!.x, selector).toBeGreaterThanOrEqual(0);
    expect(box!.y, selector).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, selector).toBeLessThanOrEqual(size.width);
    expect(box!.y + box!.height, selector).toBeLessThanOrEqual(size.height);
    const hit = await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && el.contains(top);
    });
    expect(hit, selector).toBe(true);
  }
}

test('practice cast controls stay on screen, including after the answer is shown', async ({ page }, testInfo) => {
  test.skip(!SIZES.includes(testInfo.project.name));
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  await foldDebug(page);
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { enterPractice } = await import('/src/game/state.ts');
    enterPractice(run());
    run().cast!.prompt.mode = 'recognize';
    render();
  });
  await expect(page.locator('.practice-screen .spell-key').first()).toBeVisible();
  await showSpeechFallback(page);
  await page.waitForTimeout(400);
  await expectTappable(page, '.practice-screen .spell-key');
  await expectTappable(page, '.practice-screen .spell-ctrl');
  await expectTappable(page, '.practice-screen .hint-btn');
  await expectTappable(page, '.practice-screen .practice-leave-btn');
  await expect(page.locator('.speech-fallback-note')).toBeInViewport({ ratio: 1 });
  const toneOverlap = await page.evaluate(() => {
    const label = document.querySelector('.tone-row-label');
    if (!label || getComputedStyle(label).display === 'none') return false;
    const box = label.getBoundingClientRect();
    return [...document.querySelectorAll('.spell-key')].some((key) => {
      const k = key.getBoundingClientRect();
      return box.left < k.right && k.left < box.right && box.top < k.bottom && k.top < box.bottom && k.width > 0;
    });
  });
  expect(toneOverlap, '聲調 label overlapping tone marks').toBe(false);
  await page.locator('.practice-screen .hint-btn').click();
  await expect(page.locator('.spell-hint-reveal')).toBeVisible();
  await showSpeechFallback(page);
  await expectTappable(page, '.practice-screen .spell-submit');
  await expectTappable(page, '.practice-screen .hint-btn');
  await expectTappable(page, '.practice-screen .practice-leave-btn');
  await expect(page.locator('.speech-fallback-note')).toBeInViewport({ ratio: 1 });
  if (testInfo.project.name === 'phone-portrait-webkit') {
    await expectFullyShown(page, '.practice-screen .spell-ctrl');
    await expectFullyShown(page, '.practice-screen .hint-btn');
    await expectFullyShown(page, '.practice-screen .practice-leave-btn');
    await expectFullyShown(page, '.speech-fallback-note');
  }
});

test('shrine cast keeps 家長協助 tappable, including after the hint', async ({ page }, testInfo) => {
  test.skip(!SIZES.includes(testInfo.project.name));
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  await page.getByRole('button', { name: /選擇共鳴武者/ }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  await foldDebug(page);
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugOpenEvent } = await import('/src/debug/debugActions.ts');
    const { chooseEventChoice, confirmEventChoice } = await import('/src/game/state.ts');
    debugOpenEvent(run(), 'event_shared_phonetic_shrine');
    render();
    chooseEventChoice(run(), 'practice');
    confirmEventChoice(run());
    if (run().cast) run().cast.prompt.mode = 'recognize';
    render();
  });
  await expect(page.locator('.cast-dock .hint-btn')).toBeVisible();
  await showSpeechFallback(page);
  await page.waitForTimeout(400);
  await expectTappable(page, '.cast-dock .hint-btn');
  await expectTappable(page, '.cast-dock .spell-ctrl');
  await expectTappable(page, '.cast-dock .spell-key');
  const toneOverlap = await page.evaluate(() => {
    const label = document.querySelector('.tone-row-label');
    if (!label || getComputedStyle(label).display === 'none') return false;
    const box = label.getBoundingClientRect();
    return [...document.querySelectorAll('.spell-key')].some((key) => {
      const k = key.getBoundingClientRect();
      return box.left < k.right && k.left < box.right && box.top < k.bottom && k.top < box.bottom && k.width > 0;
    });
  });
  expect(toneOverlap, '聲調 label overlapping tone marks').toBe(false);
  await page.locator('.cast-dock .hint-btn').click();
  await expect(page.locator('.spell-hint-reveal')).toBeVisible();
  await showSpeechFallback(page);
  await expectTappable(page, '.cast-dock .spell-submit');
  await expectTappable(page, '.cast-dock .hint-btn');
  await expect(page.locator('.speech-fallback-note')).toBeInViewport({ ratio: 1 });
  if (testInfo.project.name === 'phone-portrait-webkit') {
    await expectFullyShown(page, '.cast-dock .hint-btn');
    await expectFullyShown(page, '.cast-dock .spell-ctrl');
    await expectFullyShown(page, '.cast-dock .spell-key');
    await expectFullyShown(page, '.speech-fallback-note');
  }
});

test('shrine 家長協助 shows the full spelling once per event', async ({ page }, testInfo) => {
  test.skip(!['landscape-wide', 'phone-portrait-webkit'].includes(testInfo.project.name));
  await page.goto('/?debug=1');
  await foldDebug(page);
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { startRun, pickCharacter } = await import('/src/game/state.ts');
    const { openEvent } = await import('/src/game/eventEngine.ts');
    const st = run();
    startRun(st);
    pickCharacter(st, 'echoMage');
    openEvent(st, 'qa-shrine', 'event_shared_phonetic_shrine');
    st.screen = 'event';
    render();
  });
  await page.getByRole('button', { name: /練習三題/ }).click();
  await page.getByRole('button', { name: '確定', exact: true }).click();
  const hint = page.locator('.cast-dock .hint-btn');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('本事件一次');
  await hint.click();
  const answer = page.locator('.spell-hint-reveal .spell-answer');
  await expect(answer).toBeVisible();
  const spelling = (await answer.innerText()).trim();
  expect(spelling.length).toBeGreaterThan(0);
  await expect(hint).toContainText('家長協助已用完');
  await expect(hint).toBeDisabled();
  await hint.click({ force: true });
  await expect(answer).toHaveText(spelling);
  if (testInfo.project.name === 'phone-portrait-webkit') {
    await showSpeechFallback(page);
    await expectFullyShown(page, '.cast-dock .hint-btn');
    await expectFullyShown(page, '.cast-dock .spell-ctrl');
    await expectFullyShown(page, '.speech-fallback-note');
  }
});

test('tutorial cast keeps the lesson banner visible and clear of slots', async ({ page }, testInfo) => {
  test.skip(!TUTORIAL_BANNER_SIZES.includes(testInfo.project.name));
  await page.goto('/?debug=1');
  await page.evaluate(async () => {
    const { run, render } = await import('/src/ui/runtime.ts');
    const { debugStartTutorial } = await import('/src/debug/debugActions.ts');
    debugStartTutorial(run());
    render();
  });
  await foldDebug(page);
  await expect(page.locator('.tutorial-step-shield')).toBeVisible();
  await expect(page.getByRole('button', { name: '注音 ㄇ', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '注音 ㄇ', exact: true }).click();
  await expect(page.locator('.cast-dock .spell-slot').first()).toBeVisible();
  await page.waitForTimeout(400);
  const bannerFit = await page.evaluate(() => {
    const banner = document.querySelector('.tutorial-guide')!;
    const rect = banner.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(banner).borderTopLeftRadius) || 0;
    // The rounded corners are transparent, so sample inside the painted box.
    const inset = Math.min(radius + 2, rect.width / 4, rect.height / 4);
    let hidden = 0;
    let samples = 0;
    const step = 4;
    for (let y = rect.top + inset; y < rect.bottom - inset; y += step) {
      for (let x = rect.left + inset; x < rect.right - inset; x += step) {
        samples += 1;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) {
          hidden += 1;
          continue;
        }
        const top = document.elementFromPoint(x, y);
        if (!top || (top !== banner && !banner.contains(top))) hidden += 1;
      }
    }
    const dock = document.querySelector('.cast-dock')!.getBoundingClientRect();
    const hud = document.querySelector('.combat-hud-strip')!.getBoundingClientRect();
    return {
      text: (banner.textContent ?? '').replace(/\s+/g, ''),
      inView: rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight + 0.5 && rect.right <= innerWidth + 0.5,
      hidden,
      samples,
      area: rect.width * rect.height,
      // Stays in the battlefield column: left of the cast dock.
      inBattlefieldColumn: rect.right <= dock.left + 1,
      belowHud: rect.top >= hud.bottom - 1,
    };
  });
  expect(bannerFit.text).toContain('先看怪物');
  expect(bannerFit.area).toBeGreaterThan(0);
  expect(bannerFit.samples).toBeGreaterThan(0);
  expect(bannerFit.inView, 'lesson banner leaves the viewport').toBe(true);
  expect(bannerFit.hidden, 'lesson banner is covered').toBe(0);
  if (['phone-landscape-chromium', 'phone-landscape-webkit', 'phone-568x320'].includes(testInfo.project.name)) {
    expect(bannerFit.inBattlefieldColumn, 'lesson banner leaves the battlefield column').toBe(true);
    expect(bannerFit.belowHud, 'lesson banner sits behind the top bar').toBe(true);
  }
  const slots = await page.evaluate(() => {
    const banner = document.querySelector('.tutorial-guide')!.getBoundingClientRect();
    return [...document.querySelectorAll('.cast-dock .spell-slot')].map((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        text: (el.textContent ?? '').trim(),
        overlap: r.left < banner.right && banner.left < r.right && r.top < banner.bottom && banner.top < r.bottom,
        shown: !!top && (el.contains(top) || top === el),
      };
    });
  });
  expect(slots.length).toBeGreaterThan(0);
  for (const slot of slots) {
    expect(slot.overlap, `lesson banner covers slot ${slot.text}`).toBe(false);
    expect(slot.shown, `lesson banner hides slot ${slot.text}`).toBe(true);
  }
  await page.locator('.cast-dock .hint-btn').click();
  await expect(page.locator('.spell-hint-reveal')).toBeVisible();
  const reveal = await page.evaluate(() => {
    const el = document.querySelector('.spell-hint-reveal')!;
    const banner = document.querySelector('.tutorial-guide')!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      text: (el.textContent ?? '').trim(),
      overlap: r.left < banner.right && banner.left < r.right && r.top < banner.bottom && banner.top < r.bottom,
      shown: !!top && el.contains(top),
    };
  });
  expect(reveal.text.length).toBeGreaterThan(0);
  expect(reveal.overlap, 'lesson banner covers the hinted answer').toBe(false);
  expect(reveal.shown, 'lesson banner hides the hinted answer').toBe(true);
});

test('combat, event, shrine, and practice casts fit in every UI state', async ({ page }, testInfo) => {
  test.skip(!CAST_FIT_VIEWPORTS.includes(testInfo.project.name as (typeof CAST_FIT_VIEWPORTS)[number]));
  test.setTimeout(90_000);
  await runCastStateMatrix(page, 'echoMage');
});
