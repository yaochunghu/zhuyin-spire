import { mkdir } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';

// P45-14: every cast surface × UI state × viewport. One navigation per
// viewport; each surface is opened in-page and walked through the states.

export const CAST_FIT_VIEWPORTS = [
  'landscape-wide',
  'tablet-landscape',
  'short-landscape',
  'phone-landscape-chromium',
  'phone-landscape-webkit',
  'phone-portrait-webkit',
  'phone-narrow',
  'phone-568x320',
] as const;

const SURFACES = ['combat', 'event', 'shrine', 'practice'] as const;
type CastSurface = (typeof SURFACES)[number];

const STATES = ['default', 'speech', 'retry', 'hinted', 'correction'] as const;
type CastFitState = (typeof STATES)[number];

type Hero = 'echoMage' | 'abacusFist';

interface OpenCast {
  gateId: 'zhuyin' | 'math';
  screen: string;
  hasCombat: boolean;
}

export async function runCastStateMatrix(page: Page, hero: Hero): Promise<void> {
  await mkdir('/opt/cursor/artifacts/cast-fit', { recursive: true });
  await prepareCastFit(page, hero);
  for (const surface of SURFACES) {
    const gate = await openCastSurface(page, surface);
    // Hint spends 再算一次 on a math cast, so math retries before the hint.
    // 注音 measures the hint on a clean cast: that is the pt044 B1 geometry.
    const order: CastFitState[] = gate === 'math'
      ? ['default', 'speech', 'retry', 'hinted', 'correction']
      : ['default', 'speech', 'hinted', 'retry', 'correction'];
    for (const state of order) {
      const label = `${hero} ${surface} ${state}`;
      try {
        await enterCastFitState(page, surface, state);
        await expectCastControlsFit(page, label, state);
      } catch (error) {
        const size = page.viewportSize();
        const name = `${hero}-${surface}-${state}-${size?.width ?? 0}x${size?.height ?? 0}`;
        await page.screenshot({
          path: `/opt/cursor/artifacts/cast-fit/${name}.png`,
          fullPage: false,
        }).catch(() => undefined);
        throw error;
      }
    }
    await dismissReveal(page);
  }
}

async function prepareCastFit(page: Page, hero: Hero): Promise<void> {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: '開始爬塔' }).click();
  const pick = hero === 'echoMage' ? /選擇共鳴武者/ : /選擇珠算武者/;
  await page.getByRole('button', { name: pick }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
  const fold = page.locator('.debug-panel .debug-head .debug-btn-icon');
  if (await fold.isVisible()) await fold.click();
  await expect(page.locator('.debug-panel')).toBeHidden();
}

async function openCastSurface(page: Page, surface: CastSurface): Promise<'zhuyin' | 'math'> {
  const opened = await page.evaluate(async (which) => {
    const { run, render, session } = await import('/src/ui/runtime.ts');
    const { teachingTimers } = await import('/src/ui/pauseTimers.ts');
    const {
      debugStartEncounter,
      tryPlayCard,
      enterPractice,
      chooseEventChoice,
      confirmEventChoice,
      startEventCombat,
    } = await import('/src/game/state.ts');
    const { debugOpenEvent } = await import('/src/debug/debugActions.ts');

    teachingTimers.resume('fit');
    teachingTimers.clear(session.autoSubmitTimer);
    session.spellAttempt = [];
    session.spellUsedBankIdx = [];
    session.hintSpell = null;
    session.castLocked = false;
    session.castSpeechPlayedForOpen = true;
    session.outcomeAnimPlaying = false;
    document.querySelector('.spell-reveal-overlay')?.remove();

    const state = run();
    state.tutorial = null;
    state.flash = null;

    const pinZhuyin = (): void => {
      const prompt = state.cast?.prompt;
      if (prompt?.gateId === 'zhuyin') prompt.mode = 'recognize';
    };

    const playFirstCard = (): void => {
      const combat = state.combat;
      if (!combat) throw new Error('no combat');
      const card = combat.hand[0];
      if (!card) throw new Error('empty hand');
      tryPlayCard(state, card.uid, [combat.enemies[0].id]);
      pinZhuyin();
    };

    if (which === 'combat') {
      debugStartEncounter(state, 'slime');
      playFirstCard();
    } else if (which === 'event') {
      debugOpenEvent(state, 'event_a2_moth_rehearsal');
      chooseEventChoice(state, 'join');
      confirmEventChoice(state);
      startEventCombat(state);
      if (state.screen !== 'combat') {
        throw new Error(`event fight did not start (${state.screen} ${state.eventTrack.active?.phase ?? ''})`);
      }
      playFirstCard();
    } else if (which === 'shrine') {
      debugOpenEvent(state, 'event_shared_phonetic_shrine');
      chooseEventChoice(state, 'practice');
      confirmEventChoice(state);
      pinZhuyin();
      if (state.screen !== 'eventCast' || !state.cast) {
        throw new Error(`shrine cast did not open (${state.screen})`);
      }
    } else {
      enterPractice(state);
      pinZhuyin();
    }

    render();
    const prompt = state.cast?.prompt;
    if (!prompt) throw new Error(`${which} opened without a cast`);
    return {
      gateId: prompt.gateId,
      screen: state.screen,
      hasCombat: !!state.combat,
    } satisfies OpenCast;
  }, surface);

  const key = opened.gateId === 'math' ? '.cast-choice-key' : '.cast-dock .spell-key';
  await expect(page.locator(key).first()).toBeVisible();
  await page.waitForTimeout(200);
  return opened.gateId === 'math' ? 'math' : 'zhuyin';
}

async function enterCastFitState(page: Page, surface: CastSurface, state: CastFitState): Promise<void> {
  if (state === 'default') return;

  if (state === 'speech') {
    await page.evaluate(async () => {
      const { run } = await import('/src/ui/runtime.ts');
      const { speakCue } = await import('/src/game/speech.ts');
      const text = run().cast!.prompt.cue.speechText;
      const synth = window.speechSynthesis;
      const previous = synth.getVoices.bind(synth);
      Object.defineProperty(synth, 'getVoices', { configurable: true, value: () => [] });
      try {
        speakCue(text);
      } finally {
        Object.defineProperty(synth, 'getVoices', { configurable: true, value: previous });
      }
    });
    const note = page.locator('.cast-cue-pane .speech-fallback-note');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/仍需選出答案|仍需拼出完整注音/);
    await expect(note).toBeInViewport({ ratio: 1 });
    return;
  }

  if (state === 'retry') {
    const kind = await page.evaluate(async () => {
      const { run, render, session } = await import('/src/ui/runtime.ts');
      const state = run();
      const prompt = state.cast?.prompt;
      if (!prompt) return 'missing';
      if (prompt.gateId === 'math' && state.combat && state.screen === 'castCheck') return 'math-combat';
      if (prompt.gateId === 'math') {
        state.cast = { prompt: { ...prompt, retry: true }, cardDef: state.cast!.cardDef };
        render();
        return 'math-flag';
      }
      if (state.combat && state.screen === 'castCheck') {
        session.hintSpell = null;
        state.tutorial = { step: 'shield', wrongAttempts: 1 };
        // A cast-only patch would leave the lesson banner off the board.
        document.querySelector('.combat-casting > .combat-stage > .cast-screen')?.remove();
        render();
        return 'zhuyin-tutorial';
      }
      session.hintSpell = null;
      render();
      return 'zhuyin-plain';
    });

    if (kind === 'math-combat') {
      await missMathChoice(page);
      await expect(page.locator('.cast-kid-prompt')).toContainText('再數數看');
      await expect(page.locator('.adult-coach-head')).toContainText('再算一次');
    } else if (kind === 'math-flag') {
      await expect(page.locator('.cast-kid-prompt')).toContainText('再數數看');
    } else if (kind === 'zhuyin-tutorial') {
      await expect(page.locator('.tutorial-guide')).toContainText('再試一次');
    }
    return;
  }

  if (state === 'hinted') {
    // element.click does not scroll a clipped control into view first.
    const revealed = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('.cast-dock .hint-btn');
      button?.click();
      return !!document.querySelector('.spell-hint-reveal');
    });
    expect(revealed, 'hint control shows the answer').toBe(true);
    return;
  }

  const gate = await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    return run().cast?.prompt.gateId ?? run().screen;
  });

  // Pause the reveal clock when 繼續 appears, before its fade and before the
  // card dismisses itself. The observer runs in the same turn as the class change.
  await page.evaluate(async () => {
    const { teachingTimers } = await import('/src/ui/pauseTimers.ts');
    const hold = window as Window & {
      __fitTimers?: { pause: (reason?: string) => void };
      __fitObs?: MutationObserver;
    };
    hold.__fitTimers = teachingTimers;
    hold.__fitObs?.disconnect();
    hold.__fitObs = new MutationObserver(() => {
      const overlay = document.querySelector('.spell-reveal-correction.can-continue');
      if (!overlay || overlay.classList.contains('spell-reveal-out')) return;
      hold.__fitTimers?.pause('fit');
    });
    hold.__fitObs.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });
  });

  if (surface === 'shrine') {
    await page.evaluate(async () => {
      const { run } = await import('/src/ui/runtime.ts');
      const { playSpellReveal } = await import('/src/ui/castView.ts');
      const cast = run().cast!;
      playSpellReveal(
        { word: cast.prompt.cue.text, emoji: cast.prompt.cue.emoji, spell: cast.prompt.correctionText },
        () => undefined,
        'correction',
      );
    });
  } else if (gate === 'math') {
    await missMathChoice(page);
  } else {
    await page.evaluate(async () => {
      const { run } = await import('/src/ui/runtime.ts');
      const correct = run().cast!.prompt.answerTokens;
      for (let i = 0; i < correct.length; i += 1) {
        const keys = [...document.querySelectorAll<HTMLButtonElement>('.cast-dock .spell-key:not([disabled])')];
        const key = keys.find((button) => (button.textContent ?? '').trim() !== correct[i]) ?? keys[0];
        key?.click();
      }
    });
  }

  await page.waitForFunction(() => {
    const overlay = document.querySelector('.spell-reveal-correction');
    const button = overlay?.querySelector<HTMLElement>('.spell-reveal-continue');
    if (!overlay || !button || overlay.classList.contains('spell-reveal-out')) return false;
    if (!overlay.classList.contains('can-continue')) return false;
    const hold = (window as Window & { __fitTimers?: { pause: (reason?: string) => void } }).__fitTimers;
    hold?.pause('fit');
    const style = getComputedStyle(button);
    const fading = style.visibility !== 'visible'
      || Number(style.opacity) < 0.99
      || button.getAnimations().some((animation) => animation.playState === 'running');
    if (fading) {
      delete button.dataset.fitReady;
      return false;
    }
    // Stay opaque briefly. A single computed-opacity read can report the
    // transition's end value before WebKit starts the fade.
    const started = Number(button.dataset.fitReady || 0);
    if (!started) {
      button.dataset.fitReady = String(performance.now());
      return false;
    }
    return performance.now() - started >= 80;
  });
}

async function missMathChoice(page: Page): Promise<void> {
  const clicked = await page.evaluate(async () => {
    const { run } = await import('/src/ui/runtime.ts');
    const correct = run().cast!.prompt.answerTokens[0];
    const button = [...document.querySelectorAll<HTMLButtonElement>('.cast-choice-key')].find(
      (candidate) => (candidate.textContent ?? '').trim() !== correct,
    );
    button?.click();
    return !!button;
  });
  expect(clicked, 'a wrong math choice').toBe(true);
}

async function dismissReveal(page: Page): Promise<void> {
  const open = await page.locator('.spell-reveal-overlay').count();
  if (open > 0) {
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('.spell-reveal-continue')?.click();
    });
  }
  // finish() schedules the card's removal on the same clock the fit check paused.
  await page.evaluate(async () => {
    const { teachingTimers } = await import('/src/ui/pauseTimers.ts');
    const hold = window as Window & { __fitObs?: MutationObserver };
    hold.__fitObs?.disconnect();
    teachingTimers.resume('fit');
  });
  if (open > 0) await expect(page.locator('.spell-reveal-overlay')).toHaveCount(0);
}

async function expectCastControlsFit(page: Page, label: string, state: CastFitState): Promise<void> {
  const problems = await page.evaluate((which) => {
    const issues: string[] = [];
    const shown = (selector: string): HTMLElement[] =>
      [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });

    const inspect = (el: HTMLElement, kind: 'confirm' | 'key' | 'hint'): void => {
      const box = el.getBoundingClientRect();
      const name = `${kind} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 12)}"`;
      const width = Math.round(box.width * 100) / 100;
      const height = Math.round(box.height * 100) / 100;
      if (kind === 'key' && (width < 48 || height < 48)) {
        issues.push(`${name} is ${width}×${height}, under 48px`);
      }
      if (box.left < -0.5 || box.top < -0.5 || box.right > innerWidth + 0.5 || box.bottom > innerHeight + 0.5) {
        issues.push(
          `${name} is outside the viewport (${Math.round(box.left)},${Math.round(box.top)}–${Math.round(box.right)},${Math.round(box.bottom)} in ${innerWidth}×${innerHeight})`,
        );
      }
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) {
        issues.push(`${name} centre is outside the viewport`);
        return;
      }
      const top = document.elementFromPoint(x, y);
      if (!top || (top !== el && !el.contains(top))) {
        const hit = top instanceof HTMLElement ? top.className || top.tagName : 'nothing';
        issues.push(`${name} centre hits ${hit}`);
      }
    };

    if (which === 'correction') {
      const confirms = shown('.spell-reveal-continue');
      if (confirms.length === 0) {
        const detail = [...document.querySelectorAll('.spell-reveal-continue')].map((el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return `opacity=${style.opacity} visibility=${style.visibility} display=${style.display} ${Math.round(box.width)}×${Math.round(box.height)} parent=${el.parentElement?.parentElement?.className ?? ''}`;
        });
        issues.push(`correction card has no 繼續 button (${detail.join('; ') || 'missing from the document'})`);
      }
      for (const button of confirms) inspect(button, 'confirm');
      return issues;
    }

    const keys = shown('.cast-dock .spell-key');
    const hints = shown('.cast-dock .hint-btn');
    const confirms = shown('.cast-dock .spell-submit');
    if (keys.length === 0) issues.push('no answer key is shown');
    if (hints.length === 0) issues.push('no hint control is shown');
    const choiceGrid = document.querySelector('.cast-choice-grid');
    if (choiceGrid && shown('.cast-choice-key').length !== 3) {
      issues.push(`expected 3 math choices, saw ${shown('.cast-choice-key').length}`);
    }
    if (document.querySelector('.cast-dock .spell-slots') && confirms.length === 0) {
      issues.push('confirm button ✓ is not shown');
    }
    for (const key of keys) inspect(key, 'key');
    for (const hint of hints) inspect(hint, 'hint');
    for (const confirm of confirms) inspect(confirm, 'confirm');
    return issues;
  }, state);

  expect(problems, label).toEqual([]);
}
