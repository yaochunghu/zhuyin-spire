# Screen and route map

There is one URL (`/`) and no routing library. `RunState.screen` is the internal route.

| Internal screen | Renderer | Source | Purpose |
|---|---|---|---|
| `title` | `renderTitle` | `src/ui/screens.ts` | Profile, continue/new run, practice, privacy |
| `relicPick` | `renderCharacterPick` | `src/ui/screens.ts` | Character and starting relic selection |
| `map` | `renderMap` | `src/ui/mapView.ts` | Branching three-act tower map |
| `actClear` | `renderActClear` | `src/ui/mapView.ts` | Act transition |
| `rest` | `renderRest` | `src/ui/screens.ts` | Heal, remove, or smith choice |
| `smith` | `renderSmith` | `src/ui/screens.ts` | Upgrade a card |
| `removeCard` | `renderRemoveCard` | `src/ui/screens.ts` | Remove a card at rest |
| `shop` | `renderShop` | `src/ui/screens.ts` | Buy cards or removal |
| `shopRemove` | `renderShopRemove` | `src/ui/screens.ts` | Paid card removal |
| `combat` | `renderCombat` | `src/ui/combatView.ts` | Enemy stage, HUD, hand, turn controls |
| `castCheck` | `renderCastCheck` | `src/ui/castView.ts` | Required Zhuyin cast before a card resolves |
| `practice` | `renderPractice` | `src/ui/castView.ts` | No-HP learning mode |
| `reward` | `renderReward` | `src/ui/screens.ts` | Post-room card choice and rewards |
| `defeat` | `renderEnd(false)` | `src/ui/screens.ts` | Run loss and score |
| `victory` | `renderEnd(true)` | `src/ui/screens.ts` | Run win and score |

## Router contract — `src/game/state.ts`

```ts
export type Screen =
  | 'title'
  | 'relicPick'
  | 'map'
  | 'rest'
  | 'smith'
  | 'removeCard'
  | 'shop'
  | 'shopRemove'
  | 'combat'
  | 'castCheck'
  | 'practice'
  | 'reward'
  | 'actClear'
  | 'defeat'
  | 'victory';
```

Transitions are game-state operations, not URL changes. The redesign must not change `RunState`, save keys, state transitions, combat APIs, cast bindings, progression, or game balance.
