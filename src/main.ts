import './styles/main.css';
import { sfx } from './game/audio';
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
import { openOptions } from './ui/options';
import { cancelSpeech, speakCue } from './game/speech';
import { applyGameSettingsToDocument } from './game/settings';
import { bindUi, session } from './ui/runtime';
import { openDeckViewer } from './ui/deckViewer';
import { teachingTimers } from './ui/pauseTimers';
import { openPhoneMenu } from './ui/phoneMenu';
import { isPhoneLayout } from './ui/responsive';
import {
  renderEnd,
  renderCharacterPick,
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

function globalControls(): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'global-controls';

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'global-control-btn pause-global-control';
  menu.textContent = '☰';
  menu.setAttribute('aria-label', '開啟暫停選單');
  menu.addEventListener('click', (event) => {
    event.stopPropagation();
    sfx.click();
    const noDeckScreens: RunState['screen'][] = [
      'title',
      'relicPick',
      'castCheck',
      'practice',
      'defeat',
      'victory',
    ];
    openPhoneMenu({
      screen: runState.screen,
      canViewDeck:
        runState.deck.length > 0 &&
        !noDeckScreens.includes(runState.screen),
      onPause: () => {
        session.phoneMenuOpen = true;
        teachingTimers.pause();
        cancelSpeech();
      },
      onResume: () => {
        session.phoneMenuOpen = false;
        teachingTimers.resume();
        if (
          (runState.screen === 'castCheck' || runState.screen === 'practice') &&
          runState.cast
        ) {
          speakCue(runState.cast.prompt.cue.speechText);
        }
      },
      onOpenOptions: (onClose) =>
        openOptions({
          allowProfileSwitch: runState.screen === 'title',
          onClose,
        }),
      onOpenDeck: openDeckViewer,
    });
  });
  controls.appendChild(menu);
  return controls;
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
  // Screen entry decides the initial state. Once rendered, the player's toggle
  // must stay authoritative; otherwise early-run tips can never be collapsed.
  if (isPhoneLayout() && session.coachPhoneScreen !== runState.screen) {
    // Combat has its own always-visible scripted guide. The cast screen does
    // not, so keep its tutorial co-play explanation open automatically.
    session.coachCollapsed = !(
      runState.tutorial && runState.screen === 'castCheck'
    );
    session.coachPhoneScreen = runState.screen;
  }
  const collapsed = session.coachCollapsed;

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
  head.setAttribute('aria-expanded', String(!collapsed));
  head.setAttribute('aria-label', collapsed ? '展開家長提示' : '收合家長提示');
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
  document.documentElement.dataset.screen = runState.screen;
  // Pile inspect only valid on combat screen
  if (runState.screen !== 'combat') {
    session.pileViewer = null;
  }

  appEl.innerHTML = '';
  appEl.appendChild(globalControls());

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
      appEl.appendChild(renderCharacterPick());
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

applyGameSettingsToDocument();
window.addEventListener('zhuyin-settings-change', () => {
  applyGameSettingsToDocument();
});
window.addEventListener('zhuyin-profile-change', () => {
  // Profile switching is title-only, so replacing this idle title state cannot
  // interrupt a fight, drag, cast, or animation.
  if (runState.screen === 'title') render();
});

render();

// Vite folds this condition at build time, so ordinary public builds do not
// emit the debug-panel chunk at all.
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true') {
  void import('./debug/debugFlags').then(({ isDebugEnabled }) => {
    if (!isDebugEnabled()) return;
    void import('./debug/debugPanel').then(({ mountDebugLayer }) => {
      mountDebugLayer({
        getRun: () => runState,
        render,
      });
    });
  });
}
