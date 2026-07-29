import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4180';
const outputRoot = path.resolve(
  'design/reviews/next-stage/screenshots',
);

const viewports = [
  { id: 'tablet-1024x768', width: 1024, height: 768 },
  { id: 'phone-portrait-390x844', width: 390, height: 844 },
  { id: 'phone-landscape-844x390', width: 844, height: 390 },
];

const states = [
  { id: '01-title', screen: 'title' },
  { id: '02-character', screen: 'relicPick' },
  { id: '03-map', screen: 'map', options: { actIndex: 0 } },
  { id: '04-rest', screen: 'rest', options: { actIndex: 0 } },
  { id: '05-smith', screen: 'smith', options: { actIndex: 0 } },
  { id: '06-remove-card', screen: 'removeCard', options: { actIndex: 0 } },
  { id: '07-shop', screen: 'shop', options: { actIndex: 1 } },
  { id: '08-shop-remove', screen: 'shopRemove', options: { actIndex: 1 } },
  {
    id: '09-combat',
    screen: 'combat',
    options: { actIndex: 2, enemyCount: 5, handCount: 10 },
  },
  { id: '10-cast-check', screen: 'castCheck', options: { actIndex: 1 } },
  { id: '11-practice', screen: 'practice' },
  { id: '12-reward', screen: 'reward', options: { actIndex: 1 } },
  { id: '13-act-clear', screen: 'actClear', options: { actIndex: 0 } },
  { id: '14-defeat', screen: 'defeat', options: { actIndex: 2 } },
  { id: '15-victory', screen: 'victory', options: { actIndex: 2 } },
];

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch();
const audit = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const viewportDir = path.join(outputRoot, viewport.id);
  await mkdir(viewportDir, { recursive: true });

  for (const state of states) {
    await page.evaluate(
      async ({ screen, options }) => {
        await window.__zhuyinVisualReview(screen, options);
      },
      { screen: state.screen, options: state.options ?? {} },
    );
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-art-key] img')].every(
        (image) => image.complete,
      ),
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(state.screen === 'actClear' ? 900 : 320);

    const metrics = await page.evaluate(() => {
      const controls = [
        ...document.querySelectorAll(
          'button:not([hidden]), [role="button"]:not([hidden])',
        ),
      ].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute('aria-label') ??
            element.textContent?.trim().slice(0, 40) ??
            '',
          width: rect.width,
          height: rect.height,
          clipped: (() => {
            const clippedX = rect.left < 0 || rect.right > window.innerWidth;
            let parent = element.parentElement;
            while (parent) {
              const overflowX = getComputedStyle(parent).overflowX;
              if (overflowX === 'auto' || overflowX === 'scroll') return false;
              parent = parent.parentElement;
            }
            return clippedX;
          })(),
        };
      });
      return {
        pageOverflowX: Math.max(
          0,
          document.documentElement.scrollWidth - window.innerWidth,
        ),
        missingImages: [
          ...document.querySelectorAll('[data-art-key].is-error'),
        ].map((element) => element.getAttribute('data-art-key')),
        clippedControls: controls.filter((control) => control.clipped),
      };
    });

    const file = path.join(viewportDir, `${state.id}.png`);
    await page.screenshot({
      path: file,
      fullPage: false,
      animations: 'disabled',
    });
    audit.push({
      viewport: viewport.id,
      state: state.id,
      file: path.relative(process.cwd(), file),
      ...metrics,
    });
  }

  for (const [id, actIndex] of [
    ['garden-to-library', 0],
    ['library-to-observatory', 1],
  ]) {
    await page.evaluate(
      async ({ index }) => {
        await window.__zhuyinVisualReview('actClear', { actIndex: index });
      },
      { index: actIndex },
    );
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-art-key] img')].every(
        (image) => image.complete,
      ),
    );
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(viewportDir, `transition-${id}.png`),
      fullPage: false,
      animations: 'disabled',
    });
  }

  audit.push({
    viewport: viewport.id,
    state: 'console',
    consoleErrors,
  });
  await context.close();
}

await browser.close();
await writeFile(
  path.join(outputRoot, 'visual-audit.json'),
  `${JSON.stringify(audit, null, 2)}\n`,
);
