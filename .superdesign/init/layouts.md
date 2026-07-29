# Shared layouts

## Root application shell — `src/main.ts`

The application is a single state-driven screen. `#app` is cleared and exactly one screen renderer is mounted; global pause/menu controls and the adult co-play coach are then layered around that screen. There is no router or canvas.

```ts
const appEl = document.querySelector<HTMLDivElement>('#app')!;
let runState = createNewRun();

function appendGlobalControls(): void {
  if (runState.screen === 'title') return;
  const controls = document.createElement('div');
  controls.className = 'global-controls';
  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'global-control-btn pause-global-control';
  menu.setAttribute('aria-label', '開啟暫停選單');
  menu.textContent = '☰';
  menu.addEventListener('click', () => openGlobalMenu());
  controls.appendChild(menu);
  appEl.appendChild(controls);
}

export function render(): void {
  cancelPendingCombatFx();
  cancelPendingOutcomeFx();
  appEl.innerHTML = '';

  switch (runState.screen) {
    case 'title': appEl.appendChild(renderTitle()); break;
    case 'relicPick': appEl.appendChild(renderCharacterPick()); break;
    case 'map': appEl.appendChild(renderMap()); break;
    case 'actClear': appEl.appendChild(renderActClear()); break;
    case 'rest': appEl.appendChild(renderRest()); break;
    case 'smith': appEl.appendChild(renderSmith()); break;
    case 'removeCard': appEl.appendChild(renderRemoveCard()); break;
    case 'shop': appEl.appendChild(renderShop()); break;
    case 'shopRemove': appEl.appendChild(renderShopRemove()); break;
    case 'combat':
      appEl.appendChild(renderCombat());
      playPendingCombatFx();
      break;
    case 'castCheck': appEl.appendChild(renderCastCheck()); break;
    case 'practice': appEl.appendChild(renderPractice()); break;
    case 'reward': appEl.appendChild(renderReward()); break;
    case 'defeat': appEl.appendChild(renderEnd(false)); break;
    case 'victory': appEl.appendChild(renderEnd(true)); break;
  }

  appendGlobalControls();
}
```

## Shared UI runtime — `src/ui/runtime.ts`

View modules share render/run/show-flash/coach/outcome/casting callbacks through one binding object. This preserves the imperative renderer while avoiding circular imports. Session-only UI state includes pause/menu visibility, deck dialogs, map selection feedback, enemy help, combat FX, casting attempts, and timers.

## Layout invariants

- `#app`: full dynamic viewport height, centered, safe-area padding, no horizontal page overflow.
- `.screen`: one flex-column screen at a time.
- `.global-controls`: menu/pause control available outside the title.
- `.adult-coach`: collapsible adult co-play guidance that must not cover child controls.
- Dialogs: fixed backdrop, real DOM dialog semantics, locked body scroll, trapped focus.
- Combat: enemy stage + HUD + hand region; cards stay horizontally scrollable.
- Map: real DOM nodes over an SVG route layer; buttons remain directly interactive.
- Casting: prompt, real Zhuyin input keys, attempts, and feedback remain DOM controls.
