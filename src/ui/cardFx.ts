/**
 * Flying-card FX: clones animate between pile/hand anchors.
 * Does not mutate game state — call after combat has applied changes.
 *
 * Draws are sequential (one card fully dealt before the next) so kids
 * can see each 注音 land in the hand.
 */

import type { CombatCard, CombatFx } from '../game/combat';
import { sfx } from '../game/audio';
import {
  gameplayMs,
  loadGameSettings,
  type AnimationSpeed,
} from '../game/settings';

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
  enemiesById?: Map<
    string,
    { emoji: HTMLElement; bar: HTMLElement | null; shield: HTMLElement | null }
  >;
}

export type CardFaceFn = (defId: string) => string;

let activeBatchSpeed: AnimationSpeed | null = null;

function fxMs(ms: number): number {
  return gameplayMs(ms, activeBatchSpeed ?? loadGameSettings().animationSpeed);
}

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
    window.setTimeout(resolve, fxMs(ms));
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
        duration: fxMs(durationMs),
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
        { duration: fxMs(90), easing: 'ease-out' },
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

  await Promise.all(cards.map(async (card, i) => {
    await sleep(i * 75);
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

    await flyOne(faceHtml(card.defId), from, to, 330, 'card-fly-draw');

    if (slot && slot.isConnected) {
      slot.classList.remove('hand-card-hidden');
      slot.classList.add('hand-card-land');
      window.setTimeout(() => slot.classList.remove('hand-card-land'), fxMs(220));
    }
  }));

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

  await Promise.all(cards.map(async (card, i) => {
    await sleep(i * gap);
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
  }));

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
  window.setTimeout(() => flo.remove(), fxMs(720));
}

function impactTarget(enemyId: string, anchors: CardFxAnchors | null) {
  const saved = anchors?.enemiesById?.get(enemyId);
  const slot = document.querySelector<HTMLElement>(`[data-enemy-id="${enemyId}"]`);
  return {
    emoji: saved?.emoji ?? slot?.querySelector<HTMLElement>('[data-enemy]') ?? null,
    bar: saved?.bar ?? slot?.querySelector<HTMLElement>('[data-enemy-bar]') ?? null,
    shield:
      saved?.shield ??
      slot?.querySelector<HTMLElement>(`[data-enemy-shield="${enemyId}"]`) ??
      null,
  };
}

function burstShield(near: HTMLElement, count: number): void {
  const rect = near.getBoundingClientRect();
  near.classList.add('enemy-shield-ring');
  window.setTimeout(() => near.classList.remove('enemy-shield-ring'), fxMs(520));
  for (let i = 0; i < count; i += 1) {
    const shard = document.createElement('span');
    shard.className = 'shield-chip enemy-shield-chip';
    shard.textContent = i % 2 ? '◆' : '✦';
    shard.style.left = `${rect.left + rect.width / 2}px`;
    shard.style.top = `${rect.top + rect.height / 2}px`;
    const angle = (i / count) * Math.PI * 2;
    shard.style.setProperty('--sx', `${Math.cos(angle) * (34 + Math.random() * 30)}px`);
    shard.style.setProperty('--sy', `${Math.sin(angle) * (28 + Math.random() * 30)}px`);
    document.body.appendChild(shard);
    window.setTimeout(() => shard.remove(), fxMs(520));
  }
}

/**
 * Player lands attack(s) on monster(s) — one thump per hit, multi-target aware.
 */
async function playPlayerStrike(
  fx: Extract<CombatFx, { type: 'playerStrike' }>,
  anchors: CardFxAnchors | null,
): Promise<void> {
  for (const impact of fx.impacts) {
    const target = impactTarget(impact.enemyId, anchors);

    if ((impact.echoBonus ?? 0) > 0 || (impact.relicBonus ?? 0) > 0) {
      sfx.fork();
      const bonuses = [
        (impact.echoBonus ?? 0) > 0 ? `🔔+${impact.echoBonus}` : '',
        (impact.relicBonus ?? 0) > 0 ? `🎵+${impact.relicBonus}` : '',
      ].filter(Boolean);
      spawnFloat(target.emoji, bonuses.join(' '), 'strike-float-echo');
      target.emoji?.classList.add('echo-trigger-pop');
      await sleep(140);
    }

    if (impact.blockBefore > 0 && impact.blocked > 0) {
      sfx.enemyShieldClang();
      if (target.shield) {
        const fill = target.shield.querySelector<HTMLElement>('span');
        if (fill) fill.style.width = '100%';
        target.shield.classList.remove('shield-bar-empty');
        target.shield.classList.remove('enemy-shield-crack', 'enemy-shield-break');
        void target.shield.offsetWidth;
        target.shield.classList.add('shield-clang');
      }
      spawnFloat(target.shield ?? target.emoji, `🛡️-${impact.blocked}`, 'strike-float-block');
      await sleep(150);

      if (impact.blockAfter === 0) {
        sfx.enemyShieldBreak();
        if (target.shield) {
          target.shield.classList.add('enemy-shield-break');
          const fill = target.shield.querySelector<HTMLElement>('span');
          if (fill) fill.style.width = '0%';
          burstShield(target.shield, 8);
          window.setTimeout(
            () => target.shield?.classList.add('shield-bar-empty'),
            fxMs(360),
          );
        }
      } else {
        sfx.enemyShieldCrack();
        if (target.shield) {
          target.shield.classList.add('enemy-shield-crack');
          const fill = target.shield.querySelector<HTMLElement>('span');
          if (fill) {
            fill.style.width = `${(impact.blockAfter / impact.blockBefore) * 100}%`;
          }
        }
      }
      await sleep(170);
    }

    if (impact.hpDamage > 0) {
      if (impact.hpDamage >= 5) sfx.enemyHitHeavy();
      else sfx.enemyHit();
      if (target.emoji) {
        target.emoji.classList.remove('enemy-flinch', 'enemy-impact');
        void target.emoji.offsetWidth;
        target.emoji.classList.add('enemy-impact', 'enemy-flinch');
      }
      if (target.bar) {
        target.bar.classList.remove('enemy-bar-flash');
        void target.bar.offsetWidth;
        target.bar.classList.add('enemy-bar-flash');
      }
      spawnFloat(target.emoji, `-${impact.hpDamage}`, 'strike-float-hurt');
      await sleep(impact.killed ? 260 : 180);
    }
  }
}

async function playEnemyStatus(
  fx: Extract<CombatFx, { type: 'enemyStatus' }>,
  anchors: CardFxAnchors | null,
): Promise<void> {
  const target = impactTarget(fx.enemyId, anchors);
  sfx.fork();
  spawnFloat(target.emoji, `🔔 回音 ${fx.turns}`, 'strike-float-echo');
  const slot = document.querySelector<HTMLElement>(
    `[data-enemy-id="${fx.enemyId}"]`,
  );
  slot?.classList.add('enemy-status-pop');
  await sleep(220);
}

async function playPlayerEnergy(
  fx: Extract<CombatFx, { type: 'playerEnergy' }>,
): Promise<void> {
  const energy = document.querySelector<HTMLElement>('.stat-pill.energy');
  sfx.fork();
  spawnFloat(energy, `⚡+${fx.amount}`, 'strike-float-energy');
  energy?.classList.add('energy-gain-pop');
  await sleep(180);
}

async function playPlayerPower(
  fx: Extract<CombatFx, { type: 'playerPower' }>,
): Promise<void> {
  const hero = document.querySelector<HTMLElement>('.hero-actor');
  sfx.relic();
  spawnFloat(hero, `🌱 回音盾 +${fx.amount}`, 'strike-float-energy');
  await sleep(220);
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
    window.setTimeout(() => slot?.classList.remove('enemy-guarding'), fxMs(400));
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
        window.setTimeout(() => chip.remove(), fxMs(480));
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
      { duration: fxMs(260), easing: 'ease-out', fill: 'forwards' },
    );
    window.setTimeout(() => el.remove(), fxMs(280));
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
  const previousSpeed = activeBatchSpeed;
  activeBatchSpeed = loadGameSettings().animationSpeed;
  try {
    for (const fx of batch) {
      if (fx.type === 'playerStrike') {
        await playPlayerStrike(fx, anchors);
      } else if (fx.type === 'playerBlock') {
        await playPlayerBlock(fx, anchors);
      } else if (fx.type === 'playerEnergy') {
        await playPlayerEnergy(fx);
      } else if (fx.type === 'playerPower') {
        await playPlayerPower(fx);
      } else if (fx.type === 'enemyStatus') {
        await playEnemyStatus(fx, anchors);
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
  } finally {
    activeBatchSpeed = previousSpeed;
  }
}

export function queryCombatAnchors(root: ParentNode = document): CardFxAnchors | null {
  const drawPile = root.querySelector<HTMLElement>('[data-pile="draw"]');
  const discardPile = root.querySelector<HTMLElement>('[data-pile="discard"]');
  const hand = root.querySelector<HTMLElement>('[data-hand]');
  if (!drawPile || !discardPile || !hand) return null;

  const enemiesById = new Map<
    string,
    { emoji: HTMLElement; bar: HTMLElement | null; shield: HTMLElement | null }
  >();
  root.querySelectorAll<HTMLElement>('[data-enemy-id]').forEach((slot) => {
    const id = slot.dataset.enemyId;
    if (!id) return;
    const emoji = slot.querySelector<HTMLElement>('[data-enemy]');
    if (!emoji) return;
    enemiesById.set(id, {
      emoji,
      bar: slot.querySelector<HTMLElement>('[data-enemy-bar]'),
      shield: slot.querySelector<HTMLElement>('[data-enemy-shield]'),
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
