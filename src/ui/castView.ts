import { ENEMIES } from '../data/enemies';
import { getEnemy, livingEnemies } from '../game/combat';
import { sfx } from '../game/audio';
import { cancelSpeech, speakCue, speakCueWithAutoReplay } from '../game/speech';
import { isCastAnswerCorrect } from '../game/castCheck';
import {
  LEARNING_REVEAL_CONTINUE_MS,
  LEARNING_REVEAL_TOTAL_MS,
} from '../game/settings';
import {
  answerCast,
  answerPractice,
  getPracticeLifetimeCorrect,
  leavePractice,
  nextPracticePrompt,
  useParentHint,
} from '../game/state';
import { playPendingCombatFx } from './combatView';
import { teachingTimers } from './pauseTimers';
import {
  appendCoach,
  playOutcomeOverlay,
  render,
  run,
  session,
  showFlash,
} from './runtime';

export function playSpellReveal(
  info: { word: string; emoji: string; spell: string },
  onDone: () => void,
  kind: 'success' | 'correction' = 'success',
): void {
  const overlay = document.createElement('div');
  overlay.className = `spell-reveal-overlay spell-reveal-${kind}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', kind === 'success' ? '答對了' : '正確答案');
  const symbols = [...info.spell]
    .map(
      (symbol, index) =>
        `<span class="spell-reveal-symbol" style="--symbol-index:${index}">${symbol}</span>`,
    )
    .join('');
  overlay.innerHTML = `
    <div class="spell-reveal-card">
      <div class="spell-reveal-emoji">${info.emoji}</div>
      <div class="spell-reveal-word adult-read-aloud">${info.word}</div>
      <div class="spell-reveal-spell" aria-label="${info.spell}">${symbols}</div>
      <div class="spell-reveal-ok kid-prompt">${kind === 'success' ? '✨ 答對了！' : '💡 正確答案'}</div>
      <button type="button" class="btn-primary spell-reveal-continue">繼續 ▶</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const continueButton = overlay.querySelector<HTMLButtonElement>('.spell-reveal-continue')!;
  let finished = false;
  let removeTimer = 0;
  let revealContinueTimer = 0;
  let autoTimer = 0;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    teachingTimers.clear(autoTimer);
    teachingTimers.clear(revealContinueTimer);
    overlay.classList.add('spell-reveal-out');
    removeTimer = teachingTimers.set(() => {
      overlay.remove();
      onDone();
    }, 180);
  };
  continueButton.addEventListener('click', () => {
    sfx.click();
    finish();
  });
  revealContinueTimer = teachingTimers.set(() => {
    if (finished) return;
    overlay.classList.add('can-continue');
    continueButton.focus();
  }, kind === 'success' ? LEARNING_REVEAL_CONTINUE_MS : 800);
  autoTimer = teachingTimers.set(
    finish,
    kind === 'success' ? LEARNING_REVEAL_TOTAL_MS - 180 : 1320,
  );
  overlay.addEventListener('remove', () => teachingTimers.clear(removeTimer));
}

export function submitSpell(): void {
  const cast = run().cast;
  if (session.castLocked || !cast || session.outcomeAnimPlaying) return;
  session.castLocked = true;
  teachingTimers.clear(session.autoSubmitTimer);
  cancelSpeech();
  const attempt = [...session.spellAttempt];
  const correct = isCastAnswerCorrect(cast.prompt, attempt);

  // Capture cue + foe before combat/cast is cleared
  const cue = cast.prompt.cue;
  const spell = cast.prompt.correctionText;
  const isPractice = run().screen === 'practice';

  if (isPractice) {
    answerPractice(run(), attempt);
    session.spellAttempt = [];
    session.spellUsedBankIdx = [];
    session.hintSpell = null;
    session.castSpeechPlayedForOpen = false;

    if (correct) {
      sfx.castOk();
      showFlash('✨');
    } else {
      sfx.fizzle();
      showFlash('💨');
    }

    const afterPractice = (): void => {
      nextPracticePrompt(run());
      session.castLocked = false;
      render();
    };

    if (correct) {
      playSpellReveal({ word: cue.text, emoji: cue.emoji, spell }, afterPractice);
    } else {
      teachingTimers.set(afterPractice, 320);
    }
    return;
  }

  const combat = run().combat;
  // Prefer a just-defeated unit for kill poof; else selected/primary
  const deadUnit = combat?.enemies.find((e) => !e.alive || e.hp <= 0);
  const primaryUnit =
    combat &&
    (combat.enemies.find((e) => e.id === combat.selectedEnemyId) ||
      livingEnemies(combat)[0] ||
      combat.enemies[0]);
  const foeDef = deadUnit
    ? ENEMIES[deadUnit.defId]
    : primaryUnit
      ? ENEMIES[primaryUnit.defId]
      : combat
        ? getEnemy(combat)
        : null;
  const enemyEmoji = foeDef?.emoji ?? '🟢';
  const isBoss = !!foeDef?.isBoss;
  const isElite = !!foeDef?.isElite;

  answerCast(run(), attempt);
  session.spellAttempt = [];
  session.spellUsedBankIdx = [];
  session.hintSpell = null;
  session.castSpeechPlayedForOpen = false;

  if (correct) {
    // Magic success first — meaty hit/block SFX play in combat FX after reveal
    sfx.castOk();
    showFlash('✨');
  } else {
    sfx.fizzle();
    showFlash('💨');
  }

  const afterReveal = (): void => {
    void (async () => {
      // Kill path: still play impact FX before poof so the hit is never missed
      if (run().screen === 'reward' || run().screen === 'victory') {
        await playPendingCombatFx();
        playOutcomeOverlay('kill', { emoji: enemyEmoji, isBoss, isElite }, () => {
          session.castLocked = false;
          render();
        });
        return;
      }

      if (run().screen === 'defeat') {
        playOutcomeOverlay('faint', { emoji: '🧙' }, () => {
          session.castLocked = false;
          render();
        });
        return;
      }

      session.castLocked = false;
      // Combat render → playPendingCombatFx: discard + playerStrike + block + draws
      render();
    })();
  };

  playSpellReveal(
    { word: cue.text, emoji: cue.emoji, spell },
    afterReveal,
    correct ? 'success' : 'correction',
  );
}

export function renderPractice(): HTMLElement {
  return renderCastCheck(true);
}

export function renderCastCheck(isPractice = false): HTMLElement {
  const cast = run().cast!;
  const mode = cast.prompt.mode;
  const el = document.createElement('div');
  el.className = `screen cast-screen mode-${mode}${isPractice ? ' practice-screen' : ''}`;

  const cueWord = cast.prompt.cue.text;
  const cueEmoji = cast.prompt.cue.emoji;
  const parts = cast.prompt.answerTokens;
  const maxLen = parts.length;

  let cueInner = '';
  if (mode === 'recognize') {
    cueInner = `
      <div class="cue-emoji">${cueEmoji}</div>
      <div class="cue-word adult-read-aloud">${cueWord}</div>
      <p class="kid-prompt cast-kid-prompt">👉 拼注音</p>
    `;
  } else if (mode === 'listen') {
    cueInner = `
      <div class="cue-emoji">${cueEmoji}</div>
      <div class="cue-word listen-hidden">？</div>
      <p class="kid-prompt cast-kid-prompt">👂 拼注音</p>
    `;
  } else {
    cueInner = `
      <div class="cue-emoji">👂</div>
      <div class="cue-word listen-hidden">？</div>
      <p class="kid-prompt cast-kid-prompt">👂 拼注音</p>
    `;
  }

  const practiceHud = isPractice
    ? `<div class="practice-hud kid-status">
        <span class="kid-stat">📚✨${run().practiceSessionCorrect}</span>
        <span class="kid-stat">🔥${run().practiceStreak}</span>
        <span class="kid-stat adult-text">總${getPracticeLifetimeCorrect()}</span>
      </div>`
    : '';

  const header = document.createElement('div');
  header.className = 'cast-header';
  header.innerHTML = `
    ${practiceHud}
    ${cast.prompt.speechFallback ? '<div class="warn-banner adult-text">此裝置沒有語音，請大人念出圖的意思</div>' : ''}
    <div class="mana-condition mana-${cast.prompt.ambientMana.id}" aria-label="空氣中的魔力狀態：${cast.prompt.ambientMana.label}">
      <span>${cast.prompt.ambientMana.icon}</span>
      <span>${cast.prompt.ambientMana.label}</span>
      <span class="mana-focus">魔法音 ${cast.prompt.focusGlyph}</span>
    </div>
  `;
  el.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'cast-layout';
  const cuePane = document.createElement('div');
  cuePane.className = 'cast-cue-pane';
  cuePane.innerHTML = `<div class="cue-box">${cueInner}</div>`;
  const answerPane = document.createElement('div');
  answerPane.className = 'cast-answer-pane';
  layout.append(cuePane, answerPane);
  el.appendChild(layout);

  if (mode === 'listen' || mode === 'listenHard') {
    if (!session.castSpeechPlayedForOpen) {
      sfx.listenOpen();
      teachingTimers.set(() => speakCueWithAutoReplay(cast.prompt.cue.speechText), 220);
      session.castSpeechPlayedForOpen = true;
    }
    const replay = document.createElement('button');
    replay.className = 'btn-primary replay-btn btn-kid-main replay-btn-big';
    replay.innerHTML = `<span class="btn-emoji">🔊</span><span class="replay-label">再聽</span>`;
    replay.setAttribute('aria-label', '再聽一次');
    replay.addEventListener('click', () => {
      sfx.click();
      cancelSpeech();
      speakCue(cast.prompt.cue.speechText);
    });
    cuePane.appendChild(replay);
  } else if (!session.castSpeechPlayedForOpen) {
    // Recognize: soft read-aloud once (helps adult + kid pairing)
    teachingTimers.set(() => speakCue(cast.prompt.cue.speechText), 150);
    session.castSpeechPlayedForOpen = true;
  }

  appendCoach(cuePane, mode);

  if (session.hintSpell) {
    const reveal = document.createElement('div');
    reveal.className = 'spell-hint-reveal';
    reveal.innerHTML = `<span class="adult-text">答案：</span><span class="spell-answer">${session.hintSpell}</span>`;
    answerPane.appendChild(reveal);
  }

  if (cast.prompt.inputMode === 'singleChoice') {
    const choices = document.createElement('div');
    choices.className = 'cast-choice-grid';
    for (const token of cast.prompt.choiceTokens) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spell-key cast-choice-key';
      button.textContent = token;
      button.disabled = session.castLocked;
      button.addEventListener('click', () => {
        if (session.castLocked) return;
        session.spellAttempt = [token];
        submitSpell();
      });
      choices.appendChild(button);
    }
    answerPane.appendChild(choices);
  } else {
    // Answer slots (how many symbols needed)
    const slots = document.createElement('div');
    slots.className = 'spell-slots';
    slots.setAttribute('aria-label', '拼寫區');
    for (let i = 0; i < maxLen; i += 1) {
      const slot = document.createElement('div');
      const ch = session.spellAttempt[i] ?? '';
      slot.className = 'spell-slot' + (ch ? ' filled' : '');
      if (!ch && i === session.spellAttempt.length) slot.classList.add('next');
      if (ch === 'ˊ' || ch === 'ˇ' || ch === 'ˋ' || ch === '˙') slot.classList.add('tone');
      slot.textContent = ch || '·';
      slots.appendChild(slot);
    }
    answerPane.appendChild(slots);

    const bankWrap = document.createElement('div');
    bankWrap.className = 'spell-bank-wrap';

  const bankMain = document.createElement('div');
  bankMain.className = 'spell-bank';
  const bankTones = document.createElement('div');
  bankTones.className = 'spell-bank spell-bank-tones';

  cast.prompt.choiceTokens.forEach((sym, idx) => {
    const b = document.createElement('button');
    const isTone = sym === 'ˊ' || sym === 'ˇ' || sym === 'ˋ' || sym === '˙';
    b.className = 'spell-key' + (isTone ? ' tone-key' : '');
    b.textContent = sym;
    b.setAttribute('aria-label', isTone ? `聲調 ${sym}` : sym);
    const consumed = session.spellUsedBankIdx.includes(idx);
    b.disabled = consumed || session.castLocked || session.spellAttempt.length >= maxLen;
    if (consumed) b.classList.add('used');
    b.addEventListener('click', () => {
      if (session.castLocked || consumed) return;
      if (session.spellAttempt.length >= maxLen) return;
      sfx.spellKey();
      session.spellAttempt.push(sym);
      session.spellUsedBankIdx.push(idx);
      if (session.spellAttempt.length >= maxLen) {
        render();
        teachingTimers.clear(session.autoSubmitTimer);
        session.autoSubmitTimer = teachingTimers.set(() => {
          if (!session.castLocked && session.spellAttempt.length === maxLen) submitSpell();
        }, 380);
      } else {
        render();
      }
    });
    if (isTone) bankTones.appendChild(b);
    else bankMain.appendChild(b);
  });
  bankWrap.appendChild(bankMain);
  if (bankTones.childElementCount > 0) {
    const toneLabel = document.createElement('div');
    toneLabel.className = 'adult-text tone-row-label';
    toneLabel.textContent = '聲調 ˊ ˇ ˋ ˙';
    bankWrap.appendChild(toneLabel);
    bankWrap.appendChild(bankTones);
  }
    answerPane.appendChild(bankWrap);

  // Controls: backspace + submit
  const controls = document.createElement('div');
  controls.className = 'spell-controls';

  const back = document.createElement('button');
  back.className = 'btn-secondary spell-ctrl';
  back.innerHTML = '⌫';
  back.setAttribute('aria-label', '倒退');
  back.disabled = session.spellAttempt.length === 0 || session.castLocked;
  back.addEventListener('click', () => {
    if (session.castLocked) return;
    teachingTimers.clear(session.autoSubmitTimer);
    sfx.click();
    session.spellAttempt.pop();
    session.spellUsedBankIdx.pop();
    render();
  });

  const clear = document.createElement('button');
  clear.className = 'btn-secondary spell-ctrl';
  clear.innerHTML = '🗑️';
  clear.setAttribute('aria-label', '清空');
  clear.disabled = session.spellAttempt.length === 0 || session.castLocked;
  clear.addEventListener('click', () => {
    if (session.castLocked) return;
    teachingTimers.clear(session.autoSubmitTimer);
    sfx.click();
    session.spellAttempt = [];
    session.spellUsedBankIdx = [];
    render();
  });

  const ok = document.createElement('button');
  ok.className =
    'btn-primary spell-ctrl spell-submit' +
    (session.spellAttempt.length === maxLen && !session.castLocked ? ' ready' : '');
  ok.innerHTML = '✓';
  ok.setAttribute('aria-label', '送出');
  ok.disabled = session.spellAttempt.length !== maxLen || session.castLocked;
  ok.addEventListener('click', () => {
    teachingTimers.clear(session.autoSubmitTimer);
    sfx.click();
    submitSpell();
  });

  controls.appendChild(back);
  controls.appendChild(clear);
  controls.appendChild(ok);
    answerPane.appendChild(controls);
  }

  const hint = document.createElement('button');
  hint.className = 'hint-btn';
  if (isPractice) {
    hint.innerHTML =
      '<span>💡</span><span class="adult-text"> 顯示答案（練習可多次）</span>';
    hint.disabled = false;
  } else {
    const used = run().tutorial ? false : run().combat?.parentHintUsed;
    hint.innerHTML = used
      ? '<span class="adult-text">家長協助已用完</span>'
      : `<span>💡</span><span class="adult-text"> 家長協助（顯示完整拼法${run().tutorial ? '，教學可重複' : '，本場一次'}）</span>`;
    hint.disabled = !!used;
  }
  hint.addEventListener('click', () => {
    const ans = useParentHint(run());
    if (ans) {
      sfx.click();
      session.hintSpell = ans;
      render();
    }
  });
  answerPane.appendChild(hint);

  if (isPractice) {
    const leave = document.createElement('button');
    leave.className = 'btn-secondary practice-leave-btn';
    leave.innerHTML = `<span class="btn-emoji">🏠</span><span class="adult-text"> 回標題</span>`;
    leave.setAttribute('aria-label', '回標題');
    leave.addEventListener('click', () => {
      sfx.click();
      cancelSpeech();
      teachingTimers.clear(session.autoSubmitTimer);
      session.spellAttempt = [];
      session.spellUsedBankIdx = [];
      session.hintSpell = null;
      session.castSpeechPlayedForOpen = false;
      session.castLocked = false;
      leavePractice(run());
      render();
    });
    answerPane.appendChild(leave);
  }

  return el;
}
