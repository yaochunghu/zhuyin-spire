# Architecture

## Stack

| Piece | Choice |
|-------|--------|
| Build | Vite 6 + TypeScript |
| UI | Imperative DOM (no React/Vue) |
| Persist | `localStorage` only |
| Audio | Procedural Web Audio (`game/audio.ts`) + Web Speech `zh-TW` (`game/speech.ts`) |

Entry: `index.html` → `src/main.ts` → styles + render switch.

---

## Layers

```
src/
  main.ts          App shell, flash/coach helpers, screen switch, mount debug
  data/            Static content + generators (cards, enemies, map, balance…)
  game/            Run rules, combat facade, cast, save, coach
  game/battle/     Combat implementation (modular)
  ui/              DOM views + drag/FX (no balance constants of record)
  debug/           Playtest overlay (DEV / ?debug=1)
  styles/main.css  Kid-friendly UI, 1080p stages, debug panel
```

**Rule of thumb:** numbers live in `data/balance.ts` (and content files). Views call `game/state` / combat APIs; they should not invent economy.

---

## Screen state machine

`RunState.screen` is a string union (`src/game/state.ts`):

| Screen | Role |
|--------|------|
| `title` | New run / continue / practice / phrase settings |
| `relicPick` | Weak starter relic |
| `map` | Climb current act web |
| `rest` / `removeCard` | Campfire heal or deck remove |
| `shop` / `shopRemove` | Buy cards / paid remove |
| `combat` | Fight |
| `castCheck` | 注音 cast gate for a played card |
| `practice` | No-HP practice room |
| `reward` | Post-fight card pick or treasure |
| `actClear` | Between acts |
| `defeat` / `victory` | Run end |

Typical climb loop:

```
title → relicPick → map ⇄ (combat → castCheck → combat)* → reward → map
                 ⇄ rest / shop / treasure
                 → boss → actClear → next act map → … → victory
```

---

## RunState (high level)

Owned by `main.ts` as a single mutable object; UI modules reach it via `ui/runtime.ts` (`run()`, `render()`, `bindUi()`).

Important fields:

- **Hero:** `heroHp`, `heroMaxHp`, `deck[]`, `gold`, `relicId`
- **Map:** `runMap` (3 acts), `actIndex`, `currentNodeId`, `activeNodeId`, `visitedIds`, `pathIds`
- **Combat:** `combat: CombatState | null`
- **Cast:** `cast: { prompt, cardDef } | null`
- **Meta UI:** `flash`, `floatText`, shop/reward pending fields

Map navigation helpers: `getAvailableMapNodes`, `selectMapNode`, `getActiveNode`.

---

## Render loop

1. `render()` in `main.ts` clears `#app` and builds the current screen’s root.
2. `bindUi({ render, showFlash, … })` wires `ui/runtime` so views can re-render without circular imports.
3. Combat has a special path: after paint, `playPendingCombatFx` runs the FX queue; **do not full-remount combat while FX plays** (breaks hand drag and pile anchors).

**Debug panel** mounts on `document.body`, not `#app`, because `render()` wipes `#app`.

---

## Combat public API

- UI / state import from `src/game/combat.ts` (stable facade).
- Implementation lives under `src/game/battle/` (see [COMBAT.md](./COMBAT.md)).

Play pipeline (product):

1. Player plays a card (tap or drag-drop) → `tryPlayCard` in `state.ts`.
2. Unless **debug skip cast**, open `castCheck`.
3. Correct spell → `resolveCastSuccess` (effects + discard); wrong → `resolveCastFizzle` (energy already spent).
4. End turn → enemy intents → draw next hand.

---

## Save system

File: `src/game/save.ts`

- Key: `zhuyin-spire-run-v1`
- **Stable screens only** (map, rest, shop, reward, actClear, relicPick, …) — **not** mid-combat or mid-cast
- Title offers continue vs new game; new game clears save

Other localStorage keys (non-run):

| Key | Use |
|-----|-----|
| `zhuyin-spire-phrase-settings-v1` | Parent phrase packs / word lists |
| Practice counters | Lifetime correct + 📚 badge |
| `zhuyin-debug` | Persist debug enable outside DEV |

---

## Teaching stack

| Module | Role |
|--------|------|
| `data/phrases.ts` | Large bank keyed by 注音 |
| `game/phraseSettings.ts` | Parent pack filters |
| `game/castCheck.ts` | Mode pick, prompt build, spell check |
| `game/speech.ts` | Listen mode / 再聽 |
| `game/coach.ts` | Adult tip strip |
| `ui/castView.ts` | Big 注音 keyboard + practice room |

---

## Related

- Map generation: [MAP.md](./MAP.md)
- Balance constants: [BALANCE.md](./BALANCE.md)
- Content authoring: [CONTENT.md](./CONTENT.md)
