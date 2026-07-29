/**
 * Floating debug panel (body-mounted — survives #app re-renders).
 */

import type { RunState } from '../game/state';
import {
  debugAddEnergy,
  debugAddGold,
  debugResetCastingBags,
  debugDraw,
  debugEndTurn,
  debugEnterAvailable,
  debugFullEnergy,
  debugGoMap,
  debugGoTitle,
  debugInspect,
  debugLoseCombat,
  debugNewRun,
  debugPractice,
  debugResetTutorial,
  debugSetAnimationSpeed,
  debugSetCastingMode,
  debugSetAct,
  debugSetHp,
  debugStartFight,
  debugStartTutorial,
  debugWinCombat,
  listEncounterOptions,
  listEnemyOptions,
} from './debugActions';
import {
  getDebugSkipCast,
  isDebugEnabled,
  setDebugPersisted,
  setDebugSkipCast,
} from './debugFlags';

export interface DebugMountOpts {
  getRun: () => RunState;
  render: () => void;
}

let mounted = false;
let panelOpen = true;
let phoneDebugOpen = false;
let root: HTMLElement | null = null;
let inspectEl: HTMLPreElement | null = null;
let enemySelect: HTMLSelectElement | null = null;
let encSelect: HTMLSelectElement | null = null;

function btn(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `debug-btn ${cls}`.trim();
  b.textContent = label;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return b;
}

function row(label: string, children: HTMLElement[]): HTMLElement {
  const r = document.createElement('div');
  r.className = 'debug-row';
  if (label) {
    const lab = document.createElement('span');
    lab.className = 'debug-row-label';
    lab.textContent = label;
    r.appendChild(lab);
  }
  const actions = document.createElement('div');
  actions.className = 'debug-row-actions';
  for (const c of children) actions.appendChild(c);
  r.appendChild(actions);
  return r;
}

function refreshInspect(getRun: () => RunState): void {
  if (inspectEl) inspectEl.textContent = debugInspect(getRun());
}

function runAction(opts: DebugMountOpts, fn: (s: RunState) => void): void {
  fn(opts.getRun());
  opts.render();
  refreshInspect(opts.getRun);
  paintSkipToggle();
}

let skipToggleBtn: HTMLButtonElement | null = null;
let openPhoneHandler: (() => void) | null = null;
let keyHandler: ((event: KeyboardEvent) => void) | null = null;
let inspectInterval: number | null = null;

function paintSkipToggle(): void {
  if (!skipToggleBtn) return;
  const on = getDebugSkipCast();
  skipToggleBtn.textContent = on ? 'Skip cast ✓ ON' : 'Skip cast ✗ OFF';
  skipToggleBtn.classList.toggle('debug-btn-on', on);
}

function buildPanel(opts: DebugMountOpts): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'debug-panel';
  panel.setAttribute('aria-label', 'Debug panel');

  const head = document.createElement('div');
  head.className = 'debug-head';
  head.innerHTML = `<strong>DEBUG</strong> <span class="debug-sub">測試用</span>`;
  const close = btn('×', () => {
    panelOpen = false;
    phoneDebugOpen = false;
    root?.classList.remove('debug-phone-open');
    paint(opts);
  }, 'debug-btn-icon');
  head.appendChild(close);
  panel.appendChild(head);

  panel.appendChild(
    row('Run', [
      btn('Map', () => runAction(opts, debugGoMap)),
      btn('Title', () => runAction(opts, debugGoTitle)),
      btn('New run', () => runAction(opts, debugNewRun)),
      btn('Practice', () => runAction(opts, debugPractice)),
    ]),
  );

  panel.appendChild(
    row('HP', [
      btn('Full', () =>
        runAction(opts, (s) => debugSetHp(s, s.heroMaxHp)),
      ),
      btn('1', () => runAction(opts, (s) => debugSetHp(s, 1))),
      btn('+10', () =>
        runAction(opts, (s) => debugSetHp(s, s.heroHp + 10)),
      ),
      btn('-10', () =>
        runAction(opts, (s) => debugSetHp(s, s.heroHp - 10)),
      ),
    ]),
  );

  panel.appendChild(
    row('Gold', [
      btn('+50', () => runAction(opts, (s) => debugAddGold(s, 50))),
      btn('+200', () => runAction(opts, (s) => debugAddGold(s, 200))),
      btn('0', () => runAction(opts, (s) => { s.gold = 0; })),
    ]),
  );

  panel.appendChild(
    row('Energy', [
      btn('Full', () => runAction(opts, debugFullEnergy)),
      btn('+1', () => runAction(opts, (s) => debugAddEnergy(s, 1))),
      btn('Draw 5', () => runAction(opts, (s) => debugDraw(s, 5))),
    ]),
  );

  skipToggleBtn = btn('Skip cast', () => {
    setDebugSkipCast(!getDebugSkipCast());
    paintSkipToggle();
    refreshInspect(opts.getRun);
  });
  panel.appendChild(
    row('Cast', [
      skipToggleBtn,
      btn('Bag reset', () => {
        debugResetCastingBags();
        refreshInspect(opts.getRun);
      }),
      btn('See', () => debugSetCastingMode('recognize')),
      btn('Hear', () => debugSetCastingMode('listen')),
      btn('Hard', () => debugSetCastingMode('listenHard')),
    ]),
  );
  paintSkipToggle();

  panel.appendChild(
    row('Tutorial', [
      btn('Reset', () => {
        debugResetTutorial();
        refreshInspect(opts.getRun);
      }),
      btn('Start', () => runAction(opts, debugStartTutorial)),
      btn('1×', () => debugSetAnimationSpeed(1)),
      btn('2×', () => debugSetAnimationSpeed(2)),
    ]),
  );

  panel.appendChild(
    row('Fight', [
      btn('Win', () => runAction(opts, debugWinCombat)),
      btn('Lose', () => runAction(opts, debugLoseCombat)),
      btn('End turn', () => runAction(opts, debugEndTurn)),
    ]),
  );

  enemySelect = document.createElement('select');
  enemySelect.className = 'debug-select';
  for (const o of listEnemyOptions()) {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.label;
    enemySelect.appendChild(opt);
  }

  encSelect = document.createElement('select');
  encSelect.className = 'debug-select';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '(single enemy)';
  encSelect.appendChild(none);
  for (const o of listEncounterOptions()) {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.label;
    encSelect.appendChild(opt);
  }

  panel.appendChild(
    row('Start', [
      enemySelect,
      encSelect,
      btn('Go', () => {
        runAction(opts, (s) => {
          const enemyId = enemySelect!.value || 'slime';
          const encounterId = encSelect!.value || undefined;
          debugStartFight(s, { enemyId, encounterId });
        });
      }),
    ]),
  );

  panel.appendChild(
    row('Map', [
      btn('Rest', () => runAction(opts, (s) => debugEnterAvailable(s, 'rest'))),
      btn('Shop', () => runAction(opts, (s) => debugEnterAvailable(s, 'shop'))),
      btn('💎', () => runAction(opts, (s) => debugEnterAvailable(s, 'treasure'))),
      btn('Fight', () => runAction(opts, (s) => debugEnterAvailable(s, 'fight'))),
    ]),
  );

  panel.appendChild(
    row('Act', [
      btn('I', () => runAction(opts, (s) => debugSetAct(s, 0))),
      btn('II', () => runAction(opts, (s) => debugSetAct(s, 1))),
      btn('III', () => runAction(opts, (s) => debugSetAct(s, 2))),
    ]),
  );

  inspectEl = document.createElement('pre');
  inspectEl.className = 'debug-inspect';
  inspectEl.textContent = debugInspect(opts.getRun());
  panel.appendChild(inspectEl);
  // seed inspect
  refreshInspect(opts.getRun);

  const foot = document.createElement('div');
  foot.className = 'debug-foot';
  foot.appendChild(
    btn('Persist ON', () => {
      setDebugPersisted(true);
    }),
  );
  foot.appendChild(
    btn('Persist OFF', () => {
      setDebugPersisted(false);
    }),
  );
  foot.appendChild(
    btn('Refresh', () => refreshInspect(opts.getRun)),
  );
  panel.appendChild(foot);

  return panel;
}

function paint(opts: DebugMountOpts): void {
  if (!root) return;
  root.innerHTML = '';
  // A closed development panel stays fully out of the game surface. It can be
  // reopened from the pause menu or with the documented keyboard shortcut.
  if (!panelOpen) return;
  root.appendChild(buildPanel(opts));
}

export function mountDebugLayer(opts: DebugMountOpts): void {
  if (!isDebugEnabled() || mounted) return;
  mounted = true;

  root = document.createElement('div');
  root.id = 'zhuyin-debug-root';
  document.body.appendChild(root);
  paint(opts);

  openPhoneHandler = () => {
    phoneDebugOpen = true;
    panelOpen = true;
    root?.classList.add('debug-phone-open');
    paint(opts);
  };
  window.addEventListener('zhuyin-debug-open-phone', openPhoneHandler);

  keyHandler = (e: KeyboardEvent) => {
    if (e.key === '`' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      panelOpen = !panelOpen;
      if (!panelOpen) {
        phoneDebugOpen = false;
        root?.classList.remove('debug-phone-open');
      } else if (phoneDebugOpen) {
        root?.classList.add('debug-phone-open');
      }
      paint(opts);
    }
  };
  window.addEventListener('keydown', keyHandler);

  // Keep inspect fresh after game renders
  const origRender = opts.render;
  // Caller should call refreshDebugInspect after render; we also poll lightly
  inspectInterval = window.setInterval(() => {
    if (panelOpen && inspectEl) refreshInspect(opts.getRun);
  }, 800);

  void origRender;
}

export function unmountDebugLayer(): void {
  if (openPhoneHandler) {
    window.removeEventListener('zhuyin-debug-open-phone', openPhoneHandler);
  }
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  if (inspectInterval !== null) window.clearInterval(inspectInterval);
  root?.remove();
  root = null;
  mounted = false;
  panelOpen = true;
  phoneDebugOpen = false;
  inspectEl = null;
  enemySelect = null;
  encSelect = null;
  skipToggleBtn = null;
  openPhoneHandler = null;
  keyHandler = null;
  inspectInterval = null;
}

export function refreshDebugInspect(getRun: () => RunState): void {
  refreshInspect(getRun);
}
