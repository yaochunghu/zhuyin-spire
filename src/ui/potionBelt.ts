/**
 * Minimal potion belt. Reuses the relic token and inspect shell.
 * A later design pass replaces the emoji tokens and the dialog layout.
 */

import { getPotion, potionNeedsEnemy } from '../data/potions';
import { sfx } from '../game/audio';
import { castBusyNote } from '../game/coach';
import {
  discardPotion,
  getActiveCharacter,
  potionChangeBlock,
  previewPotionUse,
  usePotion,
} from '../game/state';
import {
  createModalShell,
  dismissModalShell,
  lockPageScroll,
  showModalShell,
  trapModalFocus,
} from './modal';
import { playBattleEnding, render, run, session, showFlash } from './runtime';

let inspectDialog: HTMLDialogElement | null = null;
let inspectOpener: HTMLElement | null = null;
let inspectScreen: string | null = null;
let releaseScroll: (() => void) | null = null;

function drinkReason(slot: number): string | null {
  const preview = previewPotionUse(run(), slot);
  if (preview === null || preview === 'aim' || preview === 'empty') return null;
  if (preview === 'tutorial') return '先學會出牌';
  if (preview === 'phase') return '現在不能喝';
  if (preview === 'full-hp') return '心已經滿了';
  if (preview === 'no-draw') return '抽不到牌';
  if (preview === 'target') return '沒有怪物';
  return castBlockCopy(run()) ?? '這裡不能喝';
}

function discardReason(): string | null {
  const block = potionChangeBlock(run());
  if (block === null) return null;
  if (block === 'tutorial') return '先學會出牌';
  if (block === 'phase') return '現在不能丟';
  return castBlockCopy(run()) ?? '這裡不能丟';
}

function castBlockCopy(state: ReturnType<typeof run>): string | null {
  if (state.screen !== 'castCheck' && state.screen !== 'practice' && state.screen !== 'eventCast') {
    return null;
  }
  return castBusyNote(state.cast?.prompt.gateId ?? getActiveCharacter(state)?.castingGateId);
}

export function closePotionInspect(): void {
  if (!inspectDialog) return;
  dismissModalShell(inspectDialog);
  inspectDialog = null;
  inspectScreen = null;
  releaseScroll?.();
  releaseScroll = null;
  const opener = inspectOpener;
  inspectOpener = null;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}

export function closePotionInspectIfScreenChanged(screen: string): void {
  if (inspectDialog && inspectScreen !== screen) closePotionInspect();
}

function finishDrink(endedFight: boolean): void {
  const flash = run().flash;
  if (endedFight) {
    if (flash) showFlash(flash);
    void playBattleEnding();
    return;
  }
  render();
  if (flash) showFlash(flash);
}

function drinkSlot(slot: number): void {
  if (session.combatFxPlaying || session.outcomeAnimPlaying || session.battleOutro) return;
  const potionId = run().potions[slot];
  if (!potionId) return;
  const potion = getPotion(potionId);
  if (previewPotionUse(run(), slot) === 'aim' && potionNeedsEnemy(potion)) {
    session.potionAimSlot = slot;
    closePotionInspect();
    render();
    return;
  }
  const result = usePotion(run(), slot);
  session.potionAimSlot = null;
  closePotionInspect();
  if (!result.ok) {
    render();
    return;
  }
  if (potion.heal) sfx.heal();
  else sfx.click();
  finishDrink(result.endedFight);
}

export function drinkAimedPotion(targetId: string): boolean {
  const slot = session.potionAimSlot;
  if (slot === null) return false;
  if (session.combatFxPlaying || session.outcomeAnimPlaying || session.battleOutro) return true;
  const result = usePotion(run(), slot, targetId);
  session.potionAimSlot = null;
  closePotionInspect();
  if (!result.ok) {
    render();
    return true;
  }
  sfx.click();
  finishDrink(result.endedFight);
  return true;
}

function openPotionInspect(slot: number, opener?: HTMLElement): void {
  if (session.combatFxPlaying || session.outcomeAnimPlaying || session.battleOutro) return;
  const potionId = run().potions[slot];
  if (!potionId) return;
  const potion = getPotion(potionId);
  closePotionInspect();
  inspectOpener = opener ?? null;
  inspectScreen = document.documentElement.dataset.screen ?? '';
  releaseScroll = lockPageScroll();
  const dialog = createModalShell(`查看藥水：${potion.name}`);
  dialog.classList.add('relic-inspect-dialog');
  const panel = document.createElement('div');
  panel.className = 'relic-inspect-panel';

  const emoji = document.createElement('p');
  emoji.className = 'relic-inspect-emoji';
  emoji.setAttribute('aria-hidden', 'true');
  emoji.textContent = potion.emoji;
  const name = document.createElement('h2');
  name.className = 'relic-inspect-name';
  name.textContent = potion.name;
  const blurb = document.createElement('p');
  blurb.className = 'relic-inspect-blurb';
  blurb.textContent = potion.blurb;
  const adult = document.createElement('p');
  adult.className = 'adult-text relic-inspect-adult';
  const adultLabel = document.createElement('span');
  adultLabel.className = 'relic-inspect-adult-label';
  adultLabel.textContent = '家長提示';
  adult.append(adultLabel, potion.adultNote);

  const reason = drinkReason(slot);
  const discard = discardReason();
  if (reason || discard) {
    const note = document.createElement('p');
    note.className = 'adult-text';
    note.textContent = reason ?? discard ?? '';
    panel.append(note);
  }

  const actions = document.createElement('div');
  actions.className = 'potion-inspect-actions';
  const use = document.createElement('button');
  use.type = 'button';
  use.className = 'btn-primary';
  const aimingThis = session.potionAimSlot === slot;
  use.textContent = aimingThis ? '取消瞄準' : '使用';
  use.disabled = !aimingThis && !!reason;
  use.addEventListener('click', () => {
    sfx.click();
    if (aimingThis) {
      session.potionAimSlot = null;
      closePotionInspect();
      render();
      return;
    }
    drinkSlot(slot);
  });
  const drop = document.createElement('button');
  drop.type = 'button';
  drop.className = 'btn-secondary';
  drop.textContent = '丟掉';
  drop.disabled = !!discard;
  drop.addEventListener('click', () => {
    sfx.click();
    const ok = discardPotion(run(), slot);
    if (session.potionAimSlot === slot) session.potionAimSlot = null;
    closePotionInspect();
    if (!ok) return;
    const flash = run().flash;
    render();
    if (flash) showFlash(flash);
  });
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'relic-inspect-close';
  close.textContent = '關閉';
  close.setAttribute('aria-label', '關閉藥水說明');
  close.addEventListener('click', () => {
    sfx.click();
    closePotionInspect();
  });
  actions.append(use, drop, close);
  panel.append(emoji, name, blurb, adult, actions);
  dialog.appendChild(panel);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closePotionInspect();
  });
  dialog.addEventListener('keydown', (event) => trapModalFocus(dialog, event));
  inspectDialog = dialog;
  showModalShell(dialog, closePotionInspect);
  (use.disabled ? close : use).focus();
}

/** Three belt slots. Empty loops stay in place. */
export function renderPotionBelt(): HTMLElement {
  const belt = document.createElement('div');
  belt.className = 'potion-belt';
  const names = run().potions
    .map((id) => (id ? getPotion(id).name : '空'))
    .join('、');
  belt.setAttribute('aria-label', `藥水腰帶：${names}`);
  const mark = document.createElement('span');
  mark.className = 'potion-belt-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '🧪';
  belt.appendChild(mark);

  run().potions.forEach((potionId, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'relic-badge potion-slot';
    button.dataset.potionSlot = String(index);
    if (!potionId) {
      button.classList.add('is-empty');
      button.disabled = true;
      button.textContent = '＋';
      button.setAttribute('aria-label', '空藥水格');
    } else {
      const potion = getPotion(potionId);
      button.dataset.potionId = potion.id;
      button.textContent = potion.emoji;
      button.setAttribute('aria-label', `查看藥水：${potion.name}`);
      if (session.potionAimSlot === index) button.classList.add('is-aiming');
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        sfx.click();
        openPotionInspect(index, button);
      });
    }
    belt.appendChild(button);
  });

  if (session.potionAimSlot !== null) {
    const hint = document.createElement('span');
    hint.className = 'adult-text potion-aim-hint';
    hint.textContent = '點一隻怪物';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn-secondary potion-aim-cancel';
    cancel.textContent = '取消';
    cancel.setAttribute('aria-label', '取消藥水瞄準');
    cancel.addEventListener('click', () => {
      sfx.click();
      session.potionAimSlot = null;
      render();
    });
    belt.append(hint, cancel);
  }
  return belt;
}
