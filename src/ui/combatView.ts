import { getCard, resolveCard } from '../data/cards';
import {
  ENEMIES,
  intentIsUrgent,
  intentLabel,
  intentMultiHint,
  intentNextHint,
  intentTotalDamage,
  intentTotalLabel,
} from '../data/enemies';
import {
  canPlay,
  intentForUnit,
  livingEnemies,
  nextIntentForUnit,
  type CombatCard,
  type CombatState,
  type EnemyUnit,
} from '../game/combat';
import { cardTargetType } from '../game/battle/effects';
import {
  canTutorialEndTurn,
  canTutorialPlayCard,
  consumeCombatFx,
  playerEndTurn,
  selectCombatEnemy,
  tryPlayCard,
} from '../game/state';
import { sfx } from '../game/audio';
import { playCombatFxBatch, queryCombatAnchors } from './cardFx';
import { cardFaceHtml } from './cards';
import { bindCardDrag, cleanupDragUi, collectDropTargets } from './dragPlay';
import { teachingTimers } from './pauseTimers';
import { isPhoneLayout } from './responsive';
import {
  appendCoach,
  app,
  clearFloatSoon,
  playOutcomeOverlay,
  render,
  run,
  session,
  showFlash,
} from './runtime';

/** Group pile cards by defId for a compact grid (×N badge). */
/** Inspect draw or discard pile (kid-friendly grid). */
function renderPileViewer(kind: 'draw' | 'discard', cards: CombatCard[]): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'deck-viewer pile-viewer';
  overlay.setAttribute('role', 'dialog');
  const title = kind === 'draw' ? '📚 抽牌' : '🗑️ 棄牌';
  overlay.setAttribute('aria-label', title);

  const head = document.createElement('div');
  head.className = 'deck-viewer-head';
  head.innerHTML = `
    <div class="kid-prompt">${title} ×${cards.length}</div>
    <p class="adult-text">${
      kind === 'draw'
        ? '接下來會抽到的牌（順序會洗牌，這裡只是內容）'
        : '已經用過、棄掉的牌'
    }</p>
  `;
  overlay.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'deck-viewer-grid';
  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'adult-text center';
    empty.textContent = '（空的）';
    grid.appendChild(empty);
  } else {
    for (const card of cards) {
      const def = resolveCard(card.defId, card.upgradeLevel);
      const cell = document.createElement('div');
      cell.className = `deck-viewer-card card ${def.type}`;
      cell.innerHTML = cardFaceHtml(def);
      grid.appendChild(cell);
    }
  }
  overlay.appendChild(grid);

  const close = document.createElement('button');
  close.className = 'btn-primary btn-kid-main';
  close.innerHTML = `<span class="btn-emoji">✅</span>`;
  close.setAttribute('aria-label', '關閉');
  close.addEventListener('click', () => {
    sfx.click();
    session.pileViewer = null;
    render();
  });
  overlay.appendChild(close);
  return overlay;
}

export async function playPendingCombatFx(): Promise<void> {
  const batch = consumeCombatFx(run());
  if (batch.length === 0 || session.combatFxPlaying) return;

  // Wait for 1080p stage scale + layout so pile/hand rects are real (not 0,0)
  await new Promise<void>((r) => {
    requestAnimationFrame(() => requestAnimationFrame(() => r()));
  });
  const anchors = queryCombatAnchors(app());

  session.combatFxPlaying = true;
  app().querySelectorAll<HTMLButtonElement>('.hand .card, .end-turn-btn').forEach((b) => {
    b.disabled = true;
  });
  app().querySelector('.combat-screen')?.classList.add('fx-playing');

  try {
    await playCombatFxBatch(batch, anchors, (defId) => cardFaceHtml(getCard(defId)));
  } finally {
    session.combatFxPlaying = false;
    app().querySelector('.combat-screen')?.classList.remove('fx-playing');
    // Full re-render rebinds drag listeners (disabled-during-FX path had no binds)
    if (run().screen === 'combat' && run().combat) {
      render();
    }
  }
}

function playCardFromUi(uid: string, targetIds: string[] = []): void {
  if (session.combatFxPlaying || session.outcomeAnimPlaying) return;
  // Always scrub drag ghosts before leaving combat UI
  cleanupDragUi();
  sfx.cardPlay();
  tryPlayCard(run(), uid, targetIds);
  if (run().screen === 'castCheck') {
    session.hintSpell = null;
    session.spellAttempt = [];
    session.spellUsedBankIdx = [];
    session.castLocked = false;
    session.castSpeechPlayedForOpen = false;
    teachingTimers.clear(session.autoSubmitTimer);
    cleanupDragUi();
    render();
  } else if (run().flash) {
    showFlash(run().flash as string);
    render();
  }
}

function renderEnemySlot(
  unit: EnemyUnit,
  combat: CombatState,
  opts: { damaged: boolean; castOk: boolean },
): HTMLElement {
  const def = ENEMIES[unit.defId] ?? ENEMIES.slime!;
  const intent = intentForUnit(unit);
  const nextIntent = nextIntentForUnit(unit);
  const multiHint = intentMultiHint(intent);
  const intentTitle = intentLabel(intent);
  const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const selected = combat.selectedEnemyId === unit.id && unit.alive;
  const dead = !unit.alive || unit.hp <= 0;
  const urgent = !dead && intentIsUrgent(intent, combat.heroHp, combat.block);
  const nextUrgent =
    !dead && intentIsUrgent(nextIntent, combat.heroHp, combat.block);
  // Cap shield bar display relative to maxHp for readability
  const shieldPct = Math.min(100, (unit.block / Math.max(unit.maxHp, 1)) * 100);

  const slot = document.createElement('div');
  slot.className =
    'enemy-slot' +
    (selected ? ' enemy-selected' : '') +
    (dead ? ' enemy-dead' : '') +
    (opts.damaged && !dead ? ' enemy-hurt' : '') +
    (unit.block > 0 && !dead ? ' has-block' : '') +
    (urgent ? ' enemy-intent-urgent' : '');
  slot.dataset.enemyId = unit.id;
  if (!dead) {
    slot.dataset.drop = 'enemy';
    slot.setAttribute('role', 'button');
    slot.tabIndex = 0;
    slot.setAttribute(
      'aria-label',
      `${def.name} ❤️${unit.hp}${unit.block > 0 ? ` 盾${unit.block}` : ''}${unit.vulnerableTurns > 0 ? ` 易傷${unit.vulnerableTurns}回合` : ''} ${intentTitle}${urgent ? '（危險）' : ''}${selected ? '（已選）' : ''}`,
    );
  }

  slot.innerHTML = `
    <div class="enemy-intent-stack">
      ${
        dead
          ? ''
          : `<div class="intent intent-now intent-pulse intent-${intent.kind}${urgent ? ' intent-urgent' : ''}" title="本回合：${intentTitle}${urgent ? ' · 建議擋' : ''}">
        <span class="intent-badge adult-text">${urgent ? '⚠ 本回合' : '本回合'}</span>
        <span class="intent-total">${intentTotalLabel(intent)}</span>
        ${multiHint ? `<span class="intent-multi-hint adult-text">${multiHint}</span>` : ''}
      </div>
      <div class="intent intent-next intent-${nextIntent.kind}${nextUrgent ? ' intent-urgent-soft' : ''}" title="${intentNextHint(nextIntent)}">
        <span class="intent-badge adult-text">下回合</span>
        <span class="intent-total intent-next-total">${intentTotalLabel(nextIntent)}</span>
      </div>`
      }
    </div>
    <div class="enemy-emoji${opts.damaged && !dead ? ' enemy-flinch enemy-impact' : ''}${opts.castOk && !opts.damaged && !dead ? ' enemy-cast-ok' : ''}${dead ? ' enemy-poof' : ''}" data-enemy>${dead ? '💨' : def.emoji}</div>
    <div class="adult-text enemy-name-adult">${def.name}${def.isElite ? ' · 菁英' : ''}${def.isBoss ? ' · BOSS' : ''}</div>
    ${
      !dead && unit.vulnerableTurns > 0
        ? `<button type="button" class="enemy-status vulnerable-status" data-enemy-status="${unit.id}" aria-expanded="${session.enemyStatusHelpId === unit.id}" title="易傷：攻擊傷害變成 1.5 倍">🎯 易傷 ${unit.vulnerableTurns}</button>
          ${session.enemyStatusHelpId === unit.id ? '<div class="enemy-status-help" role="status">攻擊傷害 ×1.5，無條件捨去小數。怪物行動後少 1 回合。</div>' : ''}`
        : ''
    }
    <div class="enemy-bars">
      <div class="bar" data-enemy-bar data-enemy-bar-id="${unit.id}"><span style="width:${dead ? 0 : hpPct}%"></span></div>
      <div class="bar shield-bar enemy-shield-bar${!unit.block || dead ? ' shield-bar-empty' : ''}" data-enemy-shield="${unit.id}">
        <span style="width:${dead || !unit.block ? 0 : shieldPct}%"></span>
      </div>
    </div>
    <div class="kid-hp-num">${dead ? '—' : `❤️ ${unit.hp}${unit.block > 0 ? ` · 🛡️${unit.block}` : ''}`}</div>
  `;

  if (!dead) {
    const status = slot.querySelector<HTMLButtonElement>('[data-enemy-status]');
    status?.addEventListener('click', (event) => {
      event.stopPropagation();
      sfx.click();
      session.enemyStatusHelpId = session.enemyStatusHelpId === unit.id ? null : unit.id;
      render();
    });
    const pick = (): void => {
      if (session.combatFxPlaying || session.outcomeAnimPlaying) return;
      if (run().tutorial) return;
      sfx.click();
      selectCombatEnemy(run(), unit.id);
      render();
    };
    slot.addEventListener('click', pick);
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick();
      }
    });
  }

  return slot;
}

export function renderCombat(): HTMLElement {
  // Scrub any orphaned drag ghosts from a previous frame
  cleanupDragUi();

  const c = run().combat!;
  const living = livingEnemies(c);
  const el = document.createElement('div');
  el.className = `screen combat-screen${run().tutorial ? ' tutorial-active' : ''}`;

  const enemyDamaged =
    !!run().floatText?.startsWith('-') &&
    !run().flash?.includes('💨') &&
    run().screen === 'combat';
  const heroDamaged = !!run().flash?.includes('💥');
  const blockGained = !!run().floatText?.startsWith('+');
  const castOkFlash = !!run().flash?.includes('✨') && !enemyDamaged;

  const stage = document.createElement('div');
  stage.className = 'combat-stage';
  stage.setAttribute('data-combat-stage', '');

  const tutorial = run().tutorial;
  if (tutorial) {
    const guide = document.createElement('aside');
    guide.className = `tutorial-guide tutorial-step-${tutorial.step}`;
    guide.setAttribute('role', 'status');
    const copy = {
      shield: ['1 / 3　先看怪物', '牠要攻擊！點亮起來的 🛡️ 牌，再完成注音。'],
      endTurn: [
        '2 / 3　試試護盾',
        '還有能量可以出牌。準備好就按 ✋，看護盾擋住攻擊。',
      ],
      attack: ['3 / 3　換你攻擊', '點亮起來的 ⚔️ 牌。只有一隻怪物，會自動瞄準。'],
      free: ['你學會了！', '現在自己打倒練習史萊姆吧。'],
    }[tutorial.step];
    guide.innerHTML = `<strong>${copy[0]}</strong><span>${copy[1]}</span>`;
    if (tutorial.wrongAttempts > 0 && tutorial.step !== 'free') {
      guide.innerHTML += '<small>沒關係，答案已經給你看了。照著亮圈再試一次！</small>';
    }
    stage.appendChild(guide);
  }

  // —— Enemy row (1–3) ——
  const enemyRow = document.createElement('div');
  enemyRow.className = 'enemy-row combat-top';
  enemyRow.dataset.drop = 'all';
  if (run().flash?.includes('💨')) enemyRow.classList.add('shake');
  if (castOkFlash) enemyRow.classList.add('pulse-ok');

  for (const unit of c.enemies) {
    const isPrimary =
      unit.id === c.selectedEnemyId ||
      (living.length > 0 && unit.id === living[0]!.id);
    enemyRow.appendChild(
      renderEnemySlot(unit, c, {
        damaged: enemyDamaged && (isPrimary || c.enemies.length === 1),
        castOk: castOkFlash,
      }),
    );
  }

  if (enemyDamaged && run().floatText && c.enemies.length === 1) {
    const flo = document.createElement('div');
    flo.className = 'float-num enemy-float';
    flo.textContent = run().floatText;
    enemyRow.appendChild(flo);
    clearFloatSoon();
  }
  stage.appendChild(enemyRow);

  // —— Piles + turn ——
  const pileRow = document.createElement('div');
  pileRow.className = 'combat-pile-row';

  const makePileBtn = (
    kind: 'draw' | 'discard',
    emoji: string,
    label: string,
    count: number,
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'combat-pile combat-pile-btn';
    btn.dataset.pile = kind;
    btn.setAttribute('aria-label', `${label} ${count} 張，點開查看`);
    btn.innerHTML = `
      <div class="combat-pile-stack" aria-hidden="true">${emoji}</div>
      <div class="combat-pile-count">${count}</div>
      <div class="adult-text combat-pile-label">${label}</div>
    `;
    btn.disabled = session.combatFxPlaying || !!tutorial;
    btn.addEventListener('click', () => {
      if (session.combatFxPlaying || session.outcomeAnimPlaying) return;
      sfx.click();
      session.pileViewer = session.pileViewer === kind ? null : kind;
      render();
    });
    return btn;
  };

  pileRow.appendChild(makePileBtn('draw', '📚', '抽牌', c.drawPile.length));
  const turn = document.createElement('div');
  turn.className = 'combat-turn adult-text';
  const incoming = living.reduce(
    (sum, u) => sum + intentTotalDamage(intentForUnit(u)),
    0,
  );
  const turnBits = [`第 ${c.turn} 回合`];
  if (living.length > 1) turnBits.push(`${living.length} 隻`);
  if (incoming > 0) turnBits.push(`本回合 ⚔️${incoming}`);
  turn.textContent = turnBits.join(' · ');
  if (incoming >= 7 || (incoming > 0 && incoming - c.block >= Math.max(4, c.heroHp * 0.35))) {
    turn.classList.add('combat-turn-danger');
  }
  pileRow.appendChild(turn);
  pileRow.appendChild(makePileBtn('discard', '🗑️', '棄牌', c.discardPile.length));
  stage.appendChild(pileRow);

  // —— Large hero drop zone (shield / self skills) ——
  const heroZone = document.createElement('div');
  heroZone.className =
    'hero-drop-zone combat-mid' +
    (blockGained ? ' block-pulse-zone' : '') +
    (heroDamaged ? ' hero-zone-hit' : '');
  heroZone.dataset.drop = 'self';
  heroZone.setAttribute('aria-label', '自己：拖盾牌或技能到這裡');

  const heroLow = c.heroHp <= 5;
  const heroPct = Math.max(0, (c.heroHp / c.heroMaxHp) * 100);
  // Shield bar: full at ~half max HP for readable fill
  const shieldRef = Math.max(8, Math.floor(c.heroMaxHp / 2));
  const shieldPct = Math.min(100, (c.block / shieldRef) * 100);

  const heroBarCls =
    'bar hero' + (heroDamaged ? ' shake' : '') + (blockGained ? ' hero-block-glow' : '');
  const shieldBarCls =
    'bar shield-bar hero-shield-bar' +
    (c.block <= 0 ? ' shield-bar-empty' : '') +
    (blockGained ? ' shield-bar-pulse' : '');

  heroZone.innerHTML = `
    <div class="hero-actor" aria-hidden="true">${run().characterId === 'echoMage' ? '🧒🥋' : '🧒'}</div>
    <div class="hero-vitals">
      <div class="hero-vital-row">
        <div class="stat-pill hero-stat${heroLow ? ' danger-hp' : ''}${heroDamaged ? ' hero-hit' : ''}" data-hero-hp>❤️ ${c.heroHp}/${c.heroMaxHp}</div>
        <div class="stat-pill block-pill${blockGained ? ' block-pulse' : ''}${c.block <= 0 ? ' shield-empty' : ''}" data-hero-block>🛡️ <span data-block-val>${c.block}</span></div>
        <div class="stat-pill energy hero-energy" title="能量 ${c.energy}/${c.maxEnergy}" aria-label="能量 ${c.energy} / ${c.maxEnergy}">
          <span class="energy-readout">⚡ ${c.energy}/${c.maxEnergy}</span>
          <span class="energy-orbs" data-energy-orbs></span>
        </div>
      </div>
      <div class="hero-bars">
        <div class="${heroBarCls}" data-hero-bar><span style="width:${heroPct}%"></span></div>
        <div class="${shieldBarCls}" data-hero-shield-bar><span style="width:${c.block <= 0 ? 0 : shieldPct}%"></span></div>
      </div>
      <div class="hero-combat-powers">
        ${c.firstAttackBonusDamage > 0 ? `<span class="combat-power relic-ready${c.firstAttackBonusReady ? '' : ' status-used'}" title="初心音叉：每回合第一次攻擊 +${c.firstAttackBonusDamage}">🎵 首擊 +${c.firstAttackBonusDamage}${c.firstAttackBonusReady ? '' : ' ✓'}</span>` : ''}
        ${c.training > 0 ? `<span class="combat-power" title="練功：基礎攻擊每一下追加傷害">🥋 基礎攻擊 +${c.training}</span>` : ''}
      </div>
    </div>
  `;

  const orbsEl = heroZone.querySelector('[data-energy-orbs]')!;
  // Show one orb per max energy (cap visual at 8; number always shows true max)
  const orbCount = Math.min(c.maxEnergy, 8);
  for (let i = 0; i < orbCount; i += 1) {
    const orb = document.createElement('span');
    orb.className = 'orb' + (i < c.energy ? ' on' : '');
    orbsEl.appendChild(orb);
  }
  if (c.maxEnergy > 8) {
    const more = document.createElement('span');
    more.className = 'energy-orbs-more adult-text';
    more.textContent = `+${c.maxEnergy - 8}`;
    orbsEl.appendChild(more);
  }
  stage.appendChild(heroZone);

  if (blockGained && run().floatText) {
    const flo = document.createElement('div');
    flo.className = 'float-num block-float';
    flo.textContent = run().floatText;
    heroZone.appendChild(flo);
    clearFloatSoon();
  }

  // Compact combat log (single line under hero)
  const log = document.createElement('div');
  log.className = 'log adult-text combat-log';
  log.textContent = c.log.slice(-1)[0] ?? '';
  stage.appendChild(log);

  // Floating coach (collapsed by default — does not take layout space)
  appendCoach(stage);

  // —— Bottom dock: full hand plus a phone-friendly action bar ——
  const bottom = document.createElement('div');
  bottom.className = 'combat-bottom-row';

  const hand = document.createElement('div');
  hand.className = 'hand' + (c.hand.length >= 7 ? ' hand-fan' : '');
  if (c.hand.length >= 9) hand.classList.add('hand-fan-tight');
  hand.setAttribute('data-hand', '');
  hand.dataset.count = String(c.hand.length);
  const livingIds = living.map((e) => e.id);

  for (const card of c.hand) {
    const def = resolveCard(card.defId, card.upgradeLevel);
    const btn = document.createElement('button');
    btn.className = `card ${def.type}`;
    // Energy/phase only — bind drag even during FX so post-FX enable works;
    // playCardFromUi still gates on combatFxPlaying.
    const energyPlayable = canPlay(c, card.uid);
    const tutorialPlayable = canTutorialPlayCard(run(), card.uid);
    const locked = session.combatFxPlaying || session.outcomeAnimPlaying;
    if (!energyPlayable || !tutorialPlayable) btn.classList.add('unplayable');
    if (
      tutorial &&
      tutorialPlayable &&
      ((tutorial.step === 'shield' && def.id === 'mo') ||
        (tutorial.step === 'attack' && def.id === 'bo'))
    ) {
      btn.classList.add('tutorial-focus');
    }
    btn.innerHTML = cardFaceHtml(def);
    btn.disabled = !energyPlayable || !tutorialPlayable || locked;
    btn.dataset.uid = card.uid;
    btn.setAttribute('aria-label', `注音 ${def.zhuyin}`);
    const scrollableHand = isPhoneLayout();
    btn.style.touchAction = scrollableHand ? 'pan-x' : 'none';

    const defaultTargets = (): string[] => {
      const t = cardTargetType(def);
      if (t === 'allEnemies') return livingIds;
      if (t === 'singleEnemy') {
        if (c.selectedEnemyId && livingIds.includes(c.selectedEnemyId)) {
          return [c.selectedEnemyId];
        }
        return livingIds[0] ? [livingIds[0]] : [];
      }
      return [];
    };

    bindCardDrag({
      cardEl: btn,
      def,
      enabled: energyPlayable && tutorialPlayable,
      allowHorizontalScroll: scrollableHand,
      getTargets: () => collectDropTargets(stage, def, livingIds),
      onPlay: (targetIds) => playCardFromUi(card.uid, targetIds),
      onTap: () => playCardFromUi(card.uid, defaultTargets()),
    });

    hand.appendChild(btn);
  }
  bottom.appendChild(hand);

  const actionBar = document.createElement('div');
  actionBar.className = 'combat-action-bar';
  const actionEnergy = document.createElement('div');
  actionEnergy.className = 'combat-action-energy';
  actionEnergy.setAttribute('aria-label', `能量 ${c.energy} / ${c.maxEnergy}`);
  actionEnergy.innerHTML = `<span aria-hidden="true">⚡</span><strong>${c.energy}/${c.maxEnergy}</strong>`;
  actionBar.appendChild(actionEnergy);

  const end = document.createElement('button');
  end.className = 'btn-secondary btn-kid-main end-turn-btn';
  end.innerHTML = `<span class="btn-emoji">✋</span><span class="end-turn-label">結束回合</span>`;
  end.setAttribute('aria-label', '結束回合（過牌）');
  end.title = '結束回合';
  const tutorialEndAllowed = canTutorialEndTurn(run());
  end.disabled =
    session.combatFxPlaying || c.status !== 'playing' || !tutorialEndAllowed;
  if (tutorial && tutorialEndAllowed) end.classList.add('tutorial-focus');
  end.addEventListener('click', () => {
    if (session.outcomeAnimPlaying || session.combatFxPlaying) return;
    cleanupDragUi();
    sfx.click();
    const live = run().combat;
    if (!live || live.status !== 'playing') return;
    playerEndTurn(run());
    if (run().screen === 'defeat') {
      render();
      playOutcomeOverlay('faint', { emoji: '🧒🥋' }, () => {
        render();
      });
      return;
    }
    render();
  });
  actionBar.appendChild(end);
  bottom.appendChild(actionBar);
  stage.appendChild(bottom);

  if (session.pileViewer === 'draw') {
    stage.appendChild(renderPileViewer('draw', c.drawPile));
  } else if (session.pileViewer === 'discard') {
    stage.appendChild(renderPileViewer('discard', c.discardPile));
  }

  el.appendChild(stage);

  return el;
}
