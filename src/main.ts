import './styles/main.css';
import { cycleVolume, sfx, volumeIcon } from './game/audio';
import { coachForScreen, getCompletedRunCount, isEarlyLearningRuns } from './game/coach';
import type { CastMode } from './game/castCheck';
import {
  createNewRun,
  getActiveNode,
  getAvailableMapNodes,
  type RunState,
} from './game/state';
import { playPendingCombatFx, renderCombat } from './ui/combatView';
import { renderCastCheck, renderPractice, submitSpell } from './ui/castView';
import { renderActClear, renderMap } from './ui/mapView';
import { playOutcomeOverlay } from './ui/outcome';
import { bindUi, session } from './ui/runtime';
import {
  renderEnd,
  renderRelicPick,
  renderRemoveCard,
  renderRest,
  renderReward,
  renderShop,
  renderShopRemove,
  renderTitle,
} from './ui/screens';

const appEl = document.querySelector<HTMLDivElement>('#app')!;
const runState: RunState = createNewRun();

function showFlash(msg: string): void {
  runState.flash = msg;
  window.clearTimeout(session.flashTimer);
  session.flashTimer = window.setTimeout(() => {
    runState.flash = null;
    const existing = appEl.querySelector('.flash');
    if (existing) existing.remove();
  }, 900);
  const old = appEl.querySelector('.flash');
  if (old) old.remove();
  const f = document.createElement('div');
  f.className = 'flash';
  f.textContent = msg;
  appEl.appendChild(f);
}

function clearFloatSoon(): void {
  window.clearTimeout(session.floatTimer);
  session.floatTimer = window.setTimeout(() => {
    runState.floatText = null;
    // Never remount combat mid-FX — destroys pile/hand anchors (fly cards → top-left)
    // and leaves hand buttons without drag listeners.
    if (runState.screen !== 'combat') return;
    if (session.combatFxPlaying) {
      appEl.querySelectorAll('.float-num').forEach((n) => n.remove());
      return;
    }
    render();
  }, 700);
}

function muteButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'mute-btn';
  b.type = 'button';
  b.setAttribute('aria-label', '音量：點一下切換 大／小／靜音');
  b.title = '音量：大 → 小 → 靜音';
  b.textContent = volumeIcon();
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleVolume();
    b.textContent = volumeIcon();
    sfx.click();
  });
  return b;
}

function appendCoach(parent: HTMLElement, castMode?: CastMode): void {
  const node = getActiveNode(runState) ?? getAvailableMapNodes(runState)[0] ?? undefined;
  const tip = coachForScreen(runState.screen, {
    node,
    castMode,
    act: runState.actIndex + 1,
  });
  if (!tip.body) return;

  const early = isEarlyLearningRuns();
  const isCombat = runState.screen === 'combat';
  // Combat: always collapsible (never force-open over the hand). Other screens: early runs stay open.
  const collapsed = isCombat
    ? session.coachCollapsed
    : session.coachCollapsed && !early;

  const box = document.createElement('aside');
  box.className =
    'adult-coach' +
    (collapsed ? ' collapsed' : '') +
    (isCombat ? ' adult-coach-float' : '');
  box.setAttribute('aria-label', '家長提示');

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'adult-coach-head';
  head.innerHTML = `<span>👨‍👩‍👧 ${isCombat && collapsed ? '提示' : tip.title}</span><span class="adult-coach-toggle">${collapsed ? '＋' : '－'}</span>`;
  head.addEventListener('click', () => {
    session.coachCollapsed = !session.coachCollapsed;
    render();
  });

  box.appendChild(head);

  if (!collapsed) {
    if (early) {
      const n = getCompletedRunCount();
      const banner = document.createElement('div');
      banner.className = 'adult-coach-early';
      banner.textContent = `前幾次一起玩（已完成 ${n}/3 趟）— 請大人念這段給孩子聽`;
      box.appendChild(banner);
    }
    const body = document.createElement('p');
    body.className = 'adult-coach-body';
    body.textContent = tip.body;
    box.appendChild(body);
  }

  parent.appendChild(box);
}

function render(): void {
  // Pile inspect only valid on combat screen
  if (runState.screen !== 'combat') {
    session.pileViewer = null;
  }

  appEl.innerHTML = '';
  appEl.appendChild(muteButton());

  if (runState.flash) {
    const f = document.createElement('div');
    f.className = 'flash';
    f.textContent = runState.flash;
    appEl.appendChild(f);
  }

  switch (runState.screen) {
    case 'title':
      appEl.appendChild(renderTitle());
      break;
    case 'relicPick':
      appEl.appendChild(renderRelicPick());
      break;
    case 'map':
      appEl.appendChild(renderMap());
      break;
    case 'actClear':
      appEl.appendChild(renderActClear());
      break;
    case 'rest':
      appEl.appendChild(renderRest());
      break;
    case 'removeCard':
      appEl.appendChild(renderRemoveCard());
      break;
    case 'shop':
      appEl.appendChild(renderShop());
      break;
    case 'shopRemove':
      appEl.appendChild(renderShopRemove());
      break;
    case 'combat':
      appEl.appendChild(renderCombat());
      void playPendingCombatFx();
      break;
    case 'castCheck':
      appEl.appendChild(renderCastCheck());
      break;
    case 'practice':
      appEl.appendChild(renderPractice());
      break;
    case 'reward':
      appEl.appendChild(renderReward());
      break;
    case 'defeat':
      appEl.appendChild(renderEnd(false));
      break;
    case 'victory':
      appEl.appendChild(renderEnd(true));
      break;
  }
}

bindUi({
  app: appEl,
  run: runState,
  render,
  showFlash,
  appendCoach,
  clearFloatSoon,
  playOutcomeOverlay,
  submitSpell,
});

render();

// Debug layer (body-mounted; DEV / ?debug=1 / localStorage)
void import('./debug/debugFlags').then(({ isDebugEnabled }) => {
  if (!isDebugEnabled()) return;
  void import('./debug/debugPanel').then(({ mountDebugLayer }) => {
    mountDebugLayer({
      getRun: () => runState,
      render,
    });
  });
});
