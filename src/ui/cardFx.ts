/**
 * Flying-card FX: clones animate between pile/hand anchors.
 * Does not mutate game state — call after combat has applied changes.
 *
 * Draws are sequential (one card fully dealt before the next) so kids
 * can see each 注音 land in the hand.
 */

import type { CombatCard, CombatFx } from '../game/combat';
import { sfx } from '../game/audio';

export interface CardFxAnchors {
  drawPile: HTMLElement;
  discardPile: HTMLElement;
  hand: HTMLElement;
  /** Optional: shield pill for strike FX */
  heroBlock?: HTMLElement | null;
  /** Optional: HP pill for strike FX */
  heroHp?: HTMLElement | null;
  /** Optional: hero HP bar */
  heroBar?: HTMLElement | null;
  /** Optional: primary enemy actor for player strike FX */
  enemy?: HTMLElement | null;
  enemyBar?: HTMLElement | null;
  /** Multi-enemy slots keyed by instance id */
  enemiesById?: Map<string, { emoji: HTMLElement; bar: HTMLElement | null }>;
}

export type CardFaceFn = (defId: string) => string;

function rectCenter(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  // Detached / zero-size nodes yield 0,0 → fly cards pile in the top-left
  if (r.width < 2 && r.height < 2) {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.55,
    };
  }
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Prefer live combat DOM (survives if a caller held stale anchors). */
function liveAnchors(fallback: CardFxAnchors): CardFxAnchors {
  return queryCombatAnchors(document) ?? fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const CARD_W = 120;
const CARD_H = 168;

/** One card flies from A → B (awaits landing). Slight arc via Web Animations. */
function flyOne(
  html: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs: number,
  extraClass = '',
): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `card-fly ${extraClass}`.trim();
    el.innerHTML = html;
    el.style.left = '0';
    el.style.top = '0';
    el.style.opacity = '1';
    document.body.appendChild(el);

    const x0 = from.x - CARD_W / 2;
    const y0 = from.y - CARD_H / 2;
    const x1 = to.x - CARD_W / 2;
    const y1 = to.y - CARD_H / 2;
    const midX = (x0 + x1) / 2;
    const midY = Math.min(y0, y1) - 48;

    el.style.transform = `translate(${x0}px, ${y0}px) scale(0.5) rotate(-14deg)`;
    void el.offsetWidth;

    const anim = el.animate(
      [
        {
          transform: `translate(${x0}px, ${y0}px) scale(0.5) rotate(-14deg)`,
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(${midX}px, ${midY}px) scale(1.08) rotate(6deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${x1}px, ${y1}px) scale(1) rotate(0deg)`,
          opacity: 1,
          offset: 1,
        },
      ],
      {
        duration: durationMs,
        easing: 'cubic-bezier(0.22, 0.9, 0.3, 1)',
        fill: 'forwards',
      },
    );

    anim.onfinish = () => {
      el.style.transform = `translate(${x1}px, ${y1}px) scale(1)`;
      // brief settle pop
      el.animate(
        [
          { transform: `translate(${x1}px, ${y1}px) scale(1.06)` },
          { transform: `translate(${x1}px, ${y1}px) scale(1)` },
        ],
        { duration: 90, easing: 'ease-out' },
      ).onfinish = () => {
        el.remove();
        resolve();
      };
    };
  });
}

function setPileCount(pile: HTMLElement, n: number): void {
  const el = pile.querySelector('.combat-pile-count');
  if (el) el.textContent = String(Math.max(0, n));
}

function pulsePile(pile: HTMLElement): void {
  pile.classList.remove('pile-deal-pulse');
  // reflow so animation restarts
  void pile.offsetWidth;
  pile.classList.add('pile-deal-pulse');
}

/**
 * Deal cards one-by-one: hide new hand slots, fly from deck, reveal each.
 */
async function playDraw(
  cards: CombatCard[],
  anchorsIn: CardFxAnchors,
  faceHtml: CardFaceFn,
): Promise<void> {
  if (cards.length === 0) return;
  const anchors = liveAnchors(anchorsIn);

  let handSlots = [...anchors.hand.querySelectorAll<HTMLElement>('.card')];
  // Newly drawn cards are at the end of the hand (already in DOM from render)
  let newSlots = handSlots.slice(-cards.length);
  for (const slot of newSlots) {
    slot.classList.add('hand-card-hidden');
  }

  // Pile count on screen is already post-draw; show pre-draw and tick down
  const finalDrawCount = Number(
    anchors.drawPile.querySelector('.combat-pile-count')?.textContent ?? '0',
  );
  let pileDisplay = finalDrawCount + cards.length;
  setPileCount(anchors.drawPile, pileDisplay);

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i]!;
    // Re-query each step so we never fly to a detached node after a soft DOM change
    const live = liveAnchors(anchors);
    handSlots = [...live.hand.querySelectorAll<HTMLElement>('.card')];
    newSlots = handSlots.slice(-cards.length);
    const slot = newSlots[i];
    if (slot) slot.classList.add('hand-card-hidden');

    const from = rectCenter(live.drawPile);
    const to = slot ? rectCenter(slot) : rectCenter(live.hand);

    pulsePile(live.drawPile);
    pileDisplay -= 1;
    setPileCount(live.drawPile, pileDisplay);
    sfx.cardPlay();

    await flyOne(faceHtml(card.defId), from, to, 360, 'card-fly-draw');

    if (slot && slot.isConnected) {
      slot.classList.remove('hand-card-hidden');
      slot.classList.add('hand-card-land');
      window.setTimeout(() => slot.classList.remove('hand-card-land'), 220);
    }

    if (i < cards.length - 1) await sleep(55);
  }

  const liveEnd = liveAnchors(anchors);
  setPileCount(liveEnd.drawPile, finalDrawCount);
  liveEnd.drawPile.classList.remove('pile-deal-pulse');
}

async function playDiscard(
  cards: CombatCard[],
  anchorsIn: CardFxAnchors,
  faceHtml: CardFaceFn,
  reason: 'play' | 'fizzle' | 'endTurn',
): Promise<void> {
  if (cards.length === 0) return;
  const anchors = liveAnchors(anchorsIn);

  // End-turn / multi discard: hand already holds the *next* draw — hide it so
  // discarded cards appear to leave, not sit still while clones fly.
  const handCards = [
    ...anchors.hand.querySelectorAll<HTMLElement>('.card'),
  ];
  if (reason === 'endTurn' || cards.length > 1) {
    for (const slot of handCards) {
      slot.classList.add('hand-card-hidden');
    }
  }

  const dur = reason === 'endTurn' ? 240 : 300;
  const gap = reason === 'endTurn' ? 50 : 70;

  const finalDiscard = Number(
    anchors.discardPile.querySelector('.combat-pile-count')?.textContent ?? '0',
  );
  let pileDisplay = Math.max(0, finalDiscard - cards.length);
  setPileCount(anchors.discardPile, pileDisplay);

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i]!;
    const live = liveAnchors(anchors);
    const handCenter = rectCenter(live.hand);
    const discardCenter = rectCenter(live.discardPile);
    const start = {
      x: handCenter.x + (i - (cards.length - 1) / 2) * 28,
      y: handCenter.y - 8,
    };
    sfx.mapStep();
    await flyOne(
      faceHtml(card.defId),
      start,
      discardCenter,
      dur,
      reason === 'fizzle' ? 'card-fly-fizzle' : 'card-fly-discard',
    );
    pileDisplay += 1;
    setPileCount(live.discardPile, pileDisplay);
    pulsePile(live.discardPile);
    if (i < cards.length - 1) await sleep(gap);
  }

  const liveEnd = liveAnchors(anchors);
  setPileCount(liveEnd.discardPile, finalDiscard);
  liveEnd.discardPile.classList.remove('pile-deal-pulse');
  // Draw FX (if any) keeps slots hidden until each card lands
}

function spawnFloat(near: HTMLElement | null, text: string, cls: string): void {
  const flo = document.createElement('div');
  flo.className = `strike-float ${cls}`;
  flo.textContent = text;
  if (near) {
    const r = near.getBoundingClientRect();
    flo.style.left = `${r.left + r.width / 2}px`;
    flo.style.top = `${r.top}px`;
  } else {
    flo.style.left = '50%';
    flo.style.top = '28%';
  }
  document.body.appendChild(flo);
  window.setTimeout(() => flo.remove(), 720);
}

function resolveStrikeTargets(
  fx: Extract<CombatFx, { type: 'playerStrike' }>,
  anchors: CardFxAnchors | null,
): { emoji: HTMLElement | null; bar: HTMLElement | null }[] {
  const ids = fx.targetIds?.filter(Boolean) ?? [];
  if (ids.length && anchors?.enemiesById?.size) {
    const list = ids.map((id) => {
      const slot = anchors.enemiesById!.get(id);
      return {
        emoji: slot?.emoji ?? null,
        bar: slot?.bar ?? null,
      };
    });
    if (list.some((t) => t.emoji)) return list;
  }
  if (ids.length) {
    const list = ids.map((id) => {
      const slot = document.querySelector<HTMLElement>(`[data-enemy-id="${id}"]`);
      return {
        emoji: slot?.querySelector<HTMLElement>('[data-enemy]') ?? null,
        bar:
          slot?.querySelector<HTMLElement>('[data-enemy-bar]') ??
          document.querySelector<HTMLElement>(`[data-enemy-bar-id="${id}"]`),
      };
    });
    if (list.some((t) => t.emoji)) return list;
  }
  const enemy =
    anchors?.enemy ?? document.querySelector<HTMLElement>('[data-enemy]');
  const bar =
    anchors?.enemyBar ?? document.querySelector<HTMLElement>('[data-enemy-bar]');
  return [{ emoji: enemy, bar }];
}

/**
 * Player lands attack(s) on monster(s) — one thump per hit, multi-target aware.
 */
async function playPlayerStrike(
  fx: Extract<CombatFx, { type: 'playerStrike' }>,
  anchors: CardFxAnchors | null,
): Promise<void> {
  const targets = resolveStrikeTargets(fx, anchors);
  const hits = Math.max(1, fx.hits);
  let remaining = fx.damage;
  const base = Math.floor(fx.damage / hits);

  for (let i = 0; i < hits; i += 1) {
    const isLast = i === hits - 1;
    const chunk = isLast ? remaining : base;
    remaining -= chunk;

    // Cycle targets on multi-hit single-card; hit all on multi-target once each beat
    const focus =
      targets.length > 1 && hits === 1
        ? targets
        : [targets[i % targets.length]!];

    const heavy = chunk >= 5 || (isLast && fx.damage >= 8);
    if (heavy) sfx.enemyHitHeavy();
    else sfx.enemyHit();

    for (const t of focus) {
      if (t.emoji) {
        t.emoji.classList.remove('enemy-flinch', 'enemy-impact');
        void t.emoji.offsetWidth;
        t.emoji.classList.add('enemy-impact');
        if (isLast || hits === 1) t.emoji.classList.add('enemy-flinch');
      }
      if (t.bar) {
        t.bar.classList.remove('enemy-bar-flash');
        void t.bar.offsetWidth;
        t.bar.classList.add('enemy-bar-flash');
      }
      spawnFloat(t.emoji, `-${chunk}`, 'strike-float-hurt');
    }
    await sleep(hits > 1 ? 150 : 220);
  }

  if (fx.killed) {
    await sleep(100);
  }
}

async function playPlayerBlock(
  fx: Extract<CombatFx, { type: 'playerBlock' }>,
  anchors: CardFxAnchors | null,
): Promise<void> {
  sfx.block();
  const blockEl =
    anchors?.heroBlock ?? document.querySelector<HTMLElement>('[data-hero-block]');
  const shieldBar = document.querySelector<HTMLElement>('[data-hero-shield-bar]');
  if (blockEl) {
    blockEl.classList.remove('block-pulse', 'shield-raise');
    void blockEl.offsetWidth;
    blockEl.classList.add('shield-raise');
  }
  if (shieldBar) {
    shieldBar.classList.remove('shield-bar-pulse');
    void shieldBar.offsetWidth;
    shieldBar.classList.add('shield-bar-pulse');
  }
  spawnFloat(blockEl, `+${fx.amount}🛡`, 'strike-float-block');
  await sleep(240);
}

async function playEnemyBlock(
  fx: Extract<CombatFx, { type: 'enemyBlock' }>,
  anchors: CardFxAnchors | null,
): Promise<void> {
  sfx.block();
  let near: HTMLElement | null = null;
  if (fx.enemyId) {
    near =
      anchors?.enemiesById?.get(fx.enemyId)?.emoji ??
      document.querySelector<HTMLElement>(
        `[data-enemy-id="${fx.enemyId}"] [data-enemy]`,
      );
    const slot = document.querySelector<HTMLElement>(
      `[data-enemy-id="${fx.enemyId}"]`,
    );
    slot?.classList.add('enemy-guarding');
    window.setTimeout(() => slot?.classList.remove('enemy-guarding'), 400);
  }
  spawnFloat(near, `+${fx.amount}🛡`, 'strike-float-block');
  await sleep(280);
}

/**
 * Enemy hits hero:
 * 1) Shield present → clang + shield flash
 * 2) Overflow damage → shield break, then flesh hit
 * 3) No shield → flesh hit only
 */
async function playEnemyStrike(
  fx: Extract<CombatFx, { type: 'enemyStrike' }>,
  anchors: CardFxAnchors,
): Promise<void> {
  const blockEl =
    anchors.heroBlock ?? document.querySelector<HTMLElement>('[data-hero-block]');
  const hpEl =
    anchors.heroHp ?? document.querySelector<HTMLElement>('[data-hero-hp]');
  const barEl =
    anchors.heroBar ?? document.querySelector<HTMLElement>('[data-hero-bar]');

  // Show which enemy is acting
  if (fx.enemyId) {
    const slot =
      anchors.enemiesById?.get(fx.enemyId)?.emoji ??
      document.querySelector<HTMLElement>(
        `[data-enemy-id="${fx.enemyId}"] [data-enemy]`,
      );
    if (slot) {
      slot.classList.remove('enemy-cast-ok');
      void slot.offsetWidth;
      slot.classList.add('enemy-cast-ok');
    }
  }

  // —— Phase A: hit the shield ——
  if (fx.blocked > 0 && fx.blockBefore > 0) {
    sfx.shieldHit();
    if (blockEl) {
      // Show pre-hit block for the clang beat (render already zeroed it)
      const val = blockEl.querySelector('[data-block-val]');
      if (val) val.textContent = String(fx.blockBefore);
      blockEl.classList.remove('shield-clang', 'shield-break', 'shield-gone', 'shield-spent');
      void blockEl.offsetWidth;
      blockEl.classList.add('shield-clang');
      spawnFloat(blockEl, `🛡${fx.blocked}`, 'strike-float-block');
    }
    await sleep(260);
  }

  // —— Phase B: shield breaks / spends ——
  if (fx.blocked > 0 && fx.blockBefore > 0) {
    sfx.shieldBreak();
    if (blockEl) {
      blockEl.classList.remove('shield-clang');
      void blockEl.offsetWidth;
      blockEl.classList.add(fx.damage > 0 ? 'shield-break' : 'shield-spent');
      const val = blockEl.querySelector('[data-block-val]');
      if (val) val.textContent = '0';
      for (let i = 0; i < (fx.damage > 0 ? 7 : 4); i += 1) {
        const chip = document.createElement('span');
        chip.className = 'shield-chip';
        chip.textContent = i % 2 === 0 ? '✦' : '·';
        const r = blockEl.getBoundingClientRect();
        chip.style.left = `${r.left + r.width / 2}px`;
        chip.style.top = `${r.top + r.height / 2}px`;
        const ang = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
        chip.style.setProperty('--sx', `${Math.cos(ang) * (30 + Math.random() * 28)}px`);
        chip.style.setProperty('--sy', `${Math.sin(ang) * (30 + Math.random() * 28)}px`);
        document.body.appendChild(chip);
        window.setTimeout(() => chip.remove(), 480);
      }
    }
    await sleep(fx.damage > 0 ? 280 : 220);
    if (blockEl) blockEl.classList.add('shield-gone');
  }

  // —— Phase C: unblocked / overflow damage to HP (multi-hit thumps) ——
  if (fx.damage > 0) {
    const hitCount = Math.max(1, fx.hits ?? 1);
    let remaining = fx.damage;
    const base = Math.floor(fx.damage / hitCount);
    for (let i = 0; i < hitCount; i += 1) {
      const isLast = i === hitCount - 1;
      const chunk = isLast ? remaining : Math.max(1, base);
      remaining -= chunk;
      if (chunk <= 0 && !isLast) continue;
      if (chunk >= 5 || (isLast && fx.damage >= 8)) sfx.heavyHit();
      else sfx.hit();
      if (hpEl) {
        hpEl.classList.remove('hero-hit');
        void hpEl.offsetWidth;
        hpEl.classList.add('hero-hit');
      }
      if (barEl) {
        barEl.classList.remove('shake');
        void barEl.offsetWidth;
        barEl.classList.add('shake');
      }
      spawnFloat(hpEl, `-${chunk}`, 'strike-float-hurt');
      await sleep(hitCount > 1 ? 140 : 300);
    }
  } else if (fx.blocked > 0 && fx.damage === 0) {
    sfx.block();
    await sleep(140);
  }
}

async function playShuffle(anchors: CardFxAnchors, count: number): Promise<void> {
  const from = rectCenter(anchors.discardPile);
  const to = rectCenter(anchors.drawPile);
  const n = Math.min(count, 6);
  for (let i = 0; i < n; i += 1) {
    const el = document.createElement('div');
    el.className = 'card-fly card-fly-shuffle';
    el.innerHTML = `<div class="card-fly-back">🃏</div>`;
    el.style.left = '0';
    el.style.top = '0';
    document.body.appendChild(el);
    const x0 = from.x - 28;
    const y0 = from.y - 36;
    const x1 = to.x - 28;
    const y1 = to.y - 36;
    el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(0.65) rotate(0deg)`, opacity: 1 },
        {
          transform: `translate(${x1}px, ${y1}px) scale(0.65) rotate(${(i - n / 2) * 18}deg)`,
          opacity: 1,
        },
      ],
      { duration: 260, easing: 'ease-out', fill: 'forwards' },
    );
    window.setTimeout(() => el.remove(), 280);
    await sleep(55);
  }
  pulsePile(anchors.drawPile);
  await sleep(200);
  anchors.drawPile.classList.remove('pile-deal-pulse');
}

/**
 * Play a batch of combat FX in order.
 * Strike FX still runs if pile anchors are missing (e.g. kill → reward screen).
 */
export async function playCombatFxBatch(
  batch: CombatFx[],
  anchors: CardFxAnchors | null,
  faceHtml: CardFaceFn,
): Promise<void> {
  if (batch.length === 0) return;
  for (const fx of batch) {
    if (fx.type === 'playerStrike') {
      await playPlayerStrike(fx, anchors);
    } else if (fx.type === 'playerBlock') {
      await playPlayerBlock(fx, anchors);
    } else if (fx.type === 'enemyBlock') {
      await playEnemyBlock(fx, anchors);
    } else if (fx.type === 'enemyStrike') {
      await playEnemyStrike(
        fx,
        anchors ??
          ({
            drawPile: document.body,
            discardPile: document.body,
            hand: document.body,
          } as CardFxAnchors),
      );
    } else if (anchors) {
      if (fx.type === 'shuffle') {
        await playShuffle(anchors, fx.count);
      } else if (fx.type === 'draw') {
        await playDraw(fx.cards, anchors, faceHtml);
      } else if (fx.type === 'discard') {
        await playDiscard(fx.cards, anchors, faceHtml, fx.reason);
      }
    }
  }
}

export function queryCombatAnchors(root: ParentNode = document): CardFxAnchors | null {
  const drawPile = root.querySelector<HTMLElement>('[data-pile="draw"]');
  const discardPile = root.querySelector<HTMLElement>('[data-pile="discard"]');
  const hand = root.querySelector<HTMLElement>('[data-hand]');
  if (!drawPile || !discardPile || !hand) return null;

  const enemiesById = new Map<string, { emoji: HTMLElement; bar: HTMLElement | null }>();
  root.querySelectorAll<HTMLElement>('[data-enemy-id]').forEach((slot) => {
    const id = slot.dataset.enemyId;
    if (!id) return;
    const emoji = slot.querySelector<HTMLElement>('[data-enemy]');
    if (!emoji) return;
    enemiesById.set(id, {
      emoji,
      bar: slot.querySelector<HTMLElement>('[data-enemy-bar]'),
    });
  });

  return {
    drawPile,
    discardPile,
    hand,
    heroBlock: root.querySelector<HTMLElement>('[data-hero-block]'),
    heroHp: root.querySelector<HTMLElement>('[data-hero-hp]'),
    heroBar: root.querySelector<HTMLElement>('[data-hero-bar]'),
    enemy: root.querySelector<HTMLElement>('[data-enemy]'),
    enemyBar: root.querySelector<HTMLElement>('[data-enemy-bar]'),
    enemiesById,
  };
}
