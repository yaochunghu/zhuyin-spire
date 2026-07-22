import { getCard } from '../data/cards';
import { PLAYABLE_CHARACTER_IDS, getCharacter } from '../data/characters';
import { getRelic } from '../data/relics';
import { sfx, startMusic, warmAudio } from '../game/audio';
import { getActiveProfile } from '../game/profiles';
import { warmSpeech } from '../game/speech';
import {
  PRACTICE_BADGE_THRESHOLD,
  SHOP_REMOVE_PRICE,
  applyRestHeal,
  restHealAmount,
  beginRestRemove,
  beginShopRemove,
  buyShopCard,
  cancelShopRemove,
  confirmShopRemove,
  enterPractice,
  getPracticeLifetimeCorrect,
  hasClearedOnce,
  hasEarBadge,
  hasPracticeBadge,
  hasSavedRun,
  leaveShop,
  pickCharacter,
  pickReward,
  removeCardFromDeck,
  resumeSavedRun,
  skipRemoveCard,
  startRun,
} from '../game/state';
import { cardFaceHtml } from './cards';
import { openOptions } from './options';
import { createConfettiLayer } from './outcome';
import { appendCoach, render, run, session, showFlash } from './runtime';

export function renderTitle(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen title-screen';
  const profile = getActiveProfile();
  const canContinue = hasSavedRun();
  const badges: string[] = [];
  if (hasClearedOnce()) badges.push('<div class="badge" title="通關">🏅</div>');
  if (hasEarBadge()) badges.push('<div class="badge ear" title="聽力">👂</div>');
  if (hasPracticeBadge()) badges.push('<div class="badge practice" title="練習">📚</div>');
  const practiceN = getPracticeLifetimeCorrect();
  el.innerHTML = `
    <div class="hero-preview">🧙‍♂️🗼</div>
    <div class="title-zhuyin-row" aria-hidden="true">
      <span>ㄓ</span><span>ㄨ</span><span>ˋ</span>
      <span>ㄧ</span><span>ㄣ</span>
    </div>
    <p class="kid-prompt">${
      canContinue ? '👆 ▶️ 繼續 · 🆕 新遊戲 · 📚 練習' : '👆 點 ▶️ 開始 · 📚 練習'
    }</p>
    <div class="badge-row">${badges.join('')}</div>
    ${
      practiceN > 0 && !hasPracticeBadge()
        ? `<p class="adult-text center practice-progress">練習進度 ${practiceN}/${PRACTICE_BADGE_THRESHOLD}</p>`
        : ''
    }
  `;

  const profileButton = document.createElement('button');
  profileButton.type = 'button';
  profileButton.className = 'profile-title-button';
  const profileAvatar = document.createElement('span');
  profileAvatar.className = 'profile-title-avatar';
  profileAvatar.textContent = profile.avatar;
  const profileLabel = document.createElement('span');
  const profileName = document.createElement('strong');
  profileName.textContent = profile.name;
  const profileHint = document.createElement('small');
  profileHint.textContent = '切換小玩家';
  profileLabel.append(profileName, profileHint);
  profileButton.append(profileAvatar, profileLabel);
  profileButton.setAttribute('aria-label', `目前是${profile.name}，切換小玩家`);
  profileButton.addEventListener('click', () => {
    sfx.click();
    openOptions({ allowProfileSwitch: true, focusProfiles: true });
  });
  el.prepend(profileButton);
  appendCoach(el);

  const row = document.createElement('div');
  row.className = 'title-actions';

  if (canContinue) {
    const cont = document.createElement('button');
    cont.className = 'btn-primary btn-kid-main';
    cont.innerHTML = `<span class="btn-emoji">▶️</span>`;
    cont.setAttribute('aria-label', '繼續爬塔');
    cont.addEventListener('click', () => {
      warmAudio();
      warmSpeech();
      startMusic();
      sfx.click();
      session.coachCollapsed = false;
      session.goldSfxForPending = -1;
      if (!resumeSavedRun(run())) {
        showFlash('💨');
        startRun(run());
      }
      render();
    });
    row.appendChild(cont);

    const fresh = document.createElement('button');
    fresh.className = 'btn-secondary btn-kid-main';
    fresh.innerHTML = `<span class="btn-emoji">🆕</span>`;
    fresh.setAttribute('aria-label', '新遊戲');
    fresh.addEventListener('click', () => {
      warmAudio();
      warmSpeech();
      startMusic();
      sfx.click();
      session.coachCollapsed = false;
      session.goldSfxForPending = -1;
      startRun(run());
      render();
    });
    row.appendChild(fresh);
  } else {
    const start = document.createElement('button');
    start.className = 'btn-primary btn-kid-main';
    start.innerHTML = `<span class="btn-emoji">▶️</span>`;
    start.setAttribute('aria-label', '開始爬塔');
    start.addEventListener('click', () => {
      warmAudio();
      warmSpeech();
      startMusic();
      sfx.click();
      session.coachCollapsed = false;
      session.goldSfxForPending = -1;
      startRun(run());
      render();
    });
    row.appendChild(start);
  }

  const practice = document.createElement('button');
  practice.className = 'btn-secondary btn-kid-main practice-enter-btn';
  practice.innerHTML = `<span class="btn-emoji">📚</span>`;
  practice.setAttribute('aria-label', '練習注音');
  practice.addEventListener('click', () => {
    warmAudio();
    warmSpeech();
    startMusic();
    sfx.click();
    session.coachCollapsed = false;
    session.hintSpell = null;
    session.spellAttempt = [];
    session.spellUsedBankIdx = [];
    session.castLocked = false;
    session.castSpeechPlayedForOpen = false;
    enterPractice(run());
    render();
  });
  row.appendChild(practice);
  el.appendChild(row);

  const adultTitle = document.createElement('p');
  adultTitle.className = 'adult-text center';
  adultTitle.textContent = canContinue
    ? '有進度：▶️ 繼續 · 🆕 新遊戲會覆蓋 · 📚 練習 · 點名字可切換小玩家'
    : '注音之塔 · ▶️ 爬塔 · 📚 無生命練習 · 每位小玩家各有自己的進度';
  el.appendChild(adultTitle);

  return el;
}

export function renderCharacterPick(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen relic-screen character-screen';
  el.innerHTML = `
    <div class="kid-prompt">🧙 選角色</div>
    <div class="adult-text center">角色決定起始牌組、打法主題和起始遺物</div>
  `;
  appendCoach(el);

  const row = document.createElement('div');
  row.className = 'relic-choices character-choices';
  for (const id of PLAYABLE_CHARACTER_IDS) {
    const character = getCharacter(id);
    const relic = getRelic(character.startingRelicId);
    const btn = document.createElement('button');
    btn.className = 'relic-card character-card';
    btn.innerHTML = `
      <div class="relic-emoji character-emoji">${character.emoji}</div>
      <div class="character-name">${character.name}</div>
      <div class="adult-text character-title">${character.title}</div>
      <div class="character-theme">🎶 ${character.theme}</div>
      <div class="starter-deck-summary" aria-label="起始牌組：五張攻擊、四張防守、一張回音攻擊">
        <span>⚔️ 1⚡ ×5</span>
        <span>🛡️ 1⚡ ×4</span>
        <span>🔔 2⚡ ×1</span>
      </div>
      <div class="starting-relic">
        <span class="starting-relic-emoji">${relic.emoji}</span>
        <span><strong>起始遺物：${relic.name}</strong><br>${relic.blurb}</span>
      </div>
      <div class="character-pick-cta">選這個角色 ▶️</div>
    `;
    btn.setAttribute('aria-label', `選擇${character.name}，起始遺物${relic.name}`);
    btn.addEventListener('click', () => {
      sfx.relic();
      pickCharacter(run(), id);
      render();
    });
    row.appendChild(btn);
  }
  el.appendChild(row);
  return el;
}

export function renderRest(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen rest-screen';
  el.innerHTML = `
    <div class="rest-fire">🔥</div>
    <div class="kid-prompt">選一個</div>
    <div class="kid-status"><span class="kid-stat">🧙❤️${run().heroHp}/${run().heroMaxHp}</span></div>
  `;
  appendCoach(el);

  const row = document.createElement('div');
  row.className = 'rest-choices';

  const healAmt = restHealAmount(run().heroMaxHp);
  const heal = document.createElement('button');
  heal.className = 'rest-choice';
  heal.innerHTML = `
    <div class="rest-choice-emoji">❤️</div>
    <div class="kid-prompt" style="font-size:1.2rem">+${healAmt}</div>
    <div class="adult-text">休息回復約四成生命</div>
  `;
  heal.addEventListener('click', () => {
    if (run().screen !== 'rest') return;
    sfx.heal();
    const ok = applyRestHeal(run());
    if (!ok) return;
    const msg = run().flash ?? '❤️✨';
    // Must re-render so map / HP bars pick up new heroHp (and leave rest UI)
    render();
    showFlash(msg);
  });

  const remove = document.createElement('button');
  remove.className = 'rest-choice';
  remove.innerHTML = `
    <div class="rest-choice-emoji">🗑️</div>
    <div class="kid-prompt" style="font-size:1.2rem">刪牌</div>
    <div class="adult-text">丟掉一張牌（牌組更精簡）</div>
  `;
  remove.disabled = run().deck.length <= 1;
  remove.addEventListener('click', () => {
    if (run().screen !== 'rest') return;
    sfx.click();
    const ok = beginRestRemove(run());
    if (!ok) {
      if (run().flash === '🃏×') showFlash('🃏×');
      return;
    }
    render();
  });

  row.appendChild(heal);
  row.appendChild(remove);
  el.appendChild(row);
  return el;
}

export function renderRemoveCard(): HTMLElement {
  return renderRemovePicker('rest');
}

export function renderShopRemove(): HTMLElement {
  return renderRemovePicker('shop');
}

function renderRemovePicker(mode: 'rest' | 'shop'): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen remove-screen';
  const isShop = mode === 'shop';
  el.innerHTML = `
    <div class="kid-prompt">🗑️ 丟一張</div>
    <div class="kid-status">
      ${isShop ? `<span class="kid-stat">🪙${run().gold}</span><span class="kid-stat adult-text">−${SHOP_REMOVE_PRICE}</span>` : ''}
      <span class="kid-stat">🧙❤️${run().heroHp}/${run().heroMaxHp}</span>
    </div>
    ${isShop ? `<p class="adult-text center">花 🪙${SHOP_REMOVE_PRICE} 刪掉一張弱牌（本店一次）</p>` : ''}
  `;
  appendCoach(el);

  const row = document.createElement('div');
  row.className = 'reward-cards';
  run().deck.forEach((id, index) => {
    const def = getCard(id);
    const btn = document.createElement('button');
    btn.className = `card ${def.type}`;
    btn.innerHTML = cardFaceHtml(def);
    btn.addEventListener('click', () => {
      if (isShop && run().screen !== 'shopRemove') return;
      if (!isShop && run().screen !== 'removeCard') return;
      row.querySelectorAll('button').forEach((b) => {
        (b as HTMLButtonElement).disabled = true;
      });
      sfx.removeCard();
      const ok = isShop
        ? confirmShopRemove(run(), index)
        : removeCardFromDeck(run(), index);
      if (!ok) {
        render();
        const f = run().flash;
        if (f) showFlash(f);
        return;
      }
      const msg = run().flash ?? '🗑️✨';
      render();
      showFlash(msg);
    });
    row.appendChild(btn);
  });
  el.appendChild(row);

  const skip = document.createElement('button');
  skip.className = 'btn-secondary';
  skip.innerHTML = isShop
    ? `<span class="btn-emoji">↩️</span><span class="adult-text"> 回商店</span>`
    : `<span class="btn-emoji">↩️</span><span class="adult-text"> 回營火</span>`;
  skip.setAttribute('aria-label', isShop ? '回商店' : '回營火再選');
  skip.addEventListener('click', () => {
    sfx.click();
    if (isShop) cancelShopRemove(run());
    else skipRemoveCard(run());
    render();
  });
  el.appendChild(skip);
  return el;
}

export function renderShop(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen shop-screen';
  const canRemove =
    !run().shopRemoveUsed &&
    run().deck.length > 1 &&
    run().gold >= SHOP_REMOVE_PRICE;
  el.innerHTML = `
    <div class="kid-prompt">🏪 商店</div>
    <div class="kid-status">
      <span class="kid-stat">🪙${run().gold}</span>
      <span class="kid-stat">🃏${run().deck.length}</span>
    </div>
  `;
  appendCoach(el);

  const row = document.createElement('div');
  row.className = 'shop-row';
  run().shopOffers.forEach((offer, i) => {
    const def = getCard(offer.cardId);
    const btn = document.createElement('button');
    btn.className = `card ${def.type} shop-card` + (offer.sold ? ' sold' : '');
    btn.disabled = offer.sold || run().gold < offer.price;
    btn.innerHTML = `
      ${cardFaceHtml(def)}
      <div class="shop-price">${offer.sold ? '✅' : `🪙${offer.price}`}</div>
    `;
    btn.addEventListener('click', () => {
      sfx.click();
      buyShopCard(run(), i);
      const f = run().flash;
      render();
      if (f === '🛒✨') sfx.shopBuy();
      else if (f === '🪙×') sfx.shopDeny();
      if (f) showFlash(f);
    });
    row.appendChild(btn);
  });
  el.appendChild(row);

  const services = document.createElement('div');
  services.className = 'shop-services';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-secondary shop-remove-btn';
  removeBtn.innerHTML = run().shopRemoveUsed
    ? `<span class="btn-emoji">🗑️</span><span class="adult-text"> 已刪過</span>`
    : `<span class="btn-emoji">🗑️</span><span class="adult-text"> 刪牌 🪙${SHOP_REMOVE_PRICE}</span>`;
  removeBtn.setAttribute('aria-label', `刪除一張牌，花費 ${SHOP_REMOVE_PRICE} 金幣`);
  removeBtn.disabled = run().shopRemoveUsed || run().deck.length <= 1;
  removeBtn.addEventListener('click', () => {
    sfx.click();
    const ok = beginShopRemove(run());
    if (!ok) {
      const f = run().flash;
      if (f === '🪙×') sfx.shopDeny();
      if (f) showFlash(f);
      return;
    }
    render();
  });
  if (!canRemove && !run().shopRemoveUsed) {
    removeBtn.classList.add('shop-remove-dim');
  }
  services.appendChild(removeBtn);
  el.appendChild(services);

  const leave = document.createElement('button');
  leave.className = 'btn-primary btn-kid-main';
  leave.innerHTML = `<span class="btn-emoji">👋</span>`;
  leave.setAttribute('aria-label', '離開商店');
  leave.addEventListener('click', () => {
    sfx.click();
    leaveShop(run());
    render();
  });
  el.appendChild(leave);
  return el;
}

export function renderReward(): HTMLElement {
  if (run().pendingGold > 0 && run().pendingGold !== session.goldSfxForPending) {
    session.goldSfxForPending = run().pendingGold;
    sfx.gold();
  }
  const el = document.createElement('div');
  el.className = 'screen reward-screen';
  const isTreasure = run().rewardSource === 'treasure';
  const healBit =
    run().pendingHeal > 0
      ? `<div class="kid-stat heal-gain">❤️+${run().pendingHeal}</div>`
      : '';
  const goldBit =
    run().pendingGold > 0
      ? `<div class="kid-stat gold-gain">🪙+${run().pendingGold}</div>`
      : '';
  const title = isTreasure
    ? '💎 寶箱 · 選一張'
    : run().rewardTier === 'elite'
      ? '⭐ 選一張'
      : '🎉 選一張';
  el.innerHTML = `
    <div class="kid-prompt">${title}</div>
    <div class="reward-gains">${healBit}${goldBit}</div>
    <div class="kid-status"><span class="kid-stat">🧙❤️${run().heroHp}/${run().heroMaxHp}</span><span class="kid-stat">🪙${run().gold}</span></div>
  `;
  appendCoach(el);

  const row = document.createElement('div');
  row.className = 'reward-cards';
  for (const id of run().rewardOptions) {
    const def = getCard(id);
    const btn = document.createElement('button');
    btn.className = `card ${def.type}`;
    btn.innerHTML = cardFaceHtml(def);
    btn.setAttribute('aria-label', `注音 ${def.zhuyin}`);
    btn.addEventListener('click', () => {
      sfx.click();
      pickReward(run(), id);
      render();
    });
    row.appendChild(btn);
  }
  el.appendChild(row);

  const skip = document.createElement('button');
  skip.className = 'btn-secondary';
  skip.innerHTML = `<span class="btn-emoji">⏭️</span><span class="adult-text"> 跳過</span>`;
  skip.addEventListener('click', () => {
    sfx.click();
    pickReward(run(), null);
    render();
  });
  el.appendChild(skip);
  return el;
}

export function renderEnd(won: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = `screen end-screen ${won ? 'victory' : 'defeat'}`;

  if (won) el.appendChild(createConfettiLayer());

  const body = document.createElement('div');
  body.className = 'end-body';
  body.innerHTML = won
    ? `
      <div class="end-emoji bounce-in">🏆✨</div>
      <div class="kid-prompt">好棒！</div>
      ${run().listenSuccesses > 0 ? `<div class="kid-prompt">👂×${run().listenSuccesses}</div>` : ''}
    `
    : `
      <div class="end-emoji soft-sway">💫🧙</div>
      <div class="kid-prompt">再試一次！</div>
      <p class="adult-text center">法師只是累了，沒有受傷喔</p>
    `;
  el.appendChild(body);
  appendCoach(el);

  const again = document.createElement('button');
  again.className = 'btn-primary btn-kid-main';
  again.innerHTML = `<span class="btn-emoji">▶️</span>`;
  again.setAttribute('aria-label', '再玩一次');
  again.addEventListener('click', () => {
    warmSpeech();
    sfx.click();
    session.coachCollapsed = false;
    startRun(run());
    render();
  });
  const home = document.createElement('button');
  home.className = 'btn-secondary';
  home.innerHTML = `<span class="btn-emoji">🏠</span>`;
  home.setAttribute('aria-label', '回標題');
  home.addEventListener('click', () => {
    sfx.click();
    run().screen = 'title';
    render();
  });
  el.appendChild(again);
  el.appendChild(home);
  return el;
}
