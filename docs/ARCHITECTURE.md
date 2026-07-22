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
  styles/main.css  Kid-friendly responsive stages, options, debug panel
```

**Rule of thumb:** numbers live in `data/balance.ts` (and content files). Views call `game/state` / combat APIs; they should not invent economy.

---

## Screen state machine

`RunState.screen` is a string union (`src/game/state.ts`):

| Screen | Role |
|--------|------|
| `title` | New run / continue / practice |
| `relicPick` | Character selection (legacy internal name kept for v1 saves) |
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
title → character pick (`relicPick`) → map ⇄ (combat → castCheck → combat)* → reward → map
                 ⇄ rest / shop / treasure
                 → boss → actClear → next act map → … → victory
```

---

## RunState (high level)

Owned by `main.ts` as a single mutable object; UI modules reach it via `ui/runtime.ts` (`run()`, `render()`, `bindUi()`).

Important fields:

- **Hero:** `heroHp`, `heroMaxHp`, `deck[]`, `gold`, `characterId`, `relicId`
- **Map:** `runMap` (3 acts), `actIndex`, `currentNodeId`, `activeNodeId`, `visitedIds`, `pathIds`
- **Combat:** `combat: CombatState | null`
- **Cast:** `cast: { prompt, cardDef } | null`
- **Meta UI:** `flash`, `floatText`, shop/reward pending fields
- **Tutorial (ephemeral):** `tutorial`, plus optional saved `tutorialEligibleRun` so old saves are not retrofitted

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

The first-run tutorial is an ephemeral state machine in `state.ts`. Only the active
row-0 fight is replaced; generated/saved map encounter data and the player's deck
remain unchanged. Completion belongs to the active learner profile outside the run save.

---

## Save system

File: `src/game/save.ts`

- Key: `zhuyin-spire-run-v1:<profile-id>`; the first profile mirrors the old
  `zhuyin-spire-run-v1` key for migration compatibility
- **Stable screens only** (map, rest, shop, reward, actClear, relicPick, …) — **not** mid-combat or mid-cast
- Title offers continue vs new game; new game clears save

Other localStorage keys (non-run):

| Key | Use |
|-----|-----|
| `zhuyin-spire-learner-profiles-v1` | Per-child curriculum, learning, tutorial, badges, and profile list |
| `zhuyin-spire-game-settings-v1` | Device-global 1×/2× gameplay motion + migration field |
| Legacy phrase/tutorial/practice keys | Read into the first learner on migration |
| `zhuyin-debug` | Enable debug only inside a debug-capable build; inert in the public build |

Saved runs and learner stores are size-bounded and parsed through allowlists
before use. Persisted display text is rendered as text, never interpreted as
HTML. The Options privacy section can delete every `zhuyin-spire-*` key without
touching unrelated site data.

The public build has a restrictive Content Security Policy, no third-party
runtime requests, and no production debug bundle. There is no application
backend; speech uses the browser's built-in speech service for fixed authored
words and never requests microphone permission.

---

## Teaching stack

| Module | Role |
|--------|------|
| `data/phrases.ts` | Topic-tagged core/broad Zhuyin phrase bank |
| `game/profiles.ts` | Learners, curriculum, results, persistent shuffle state |
| `game/casting/*` | Subject-neutral contract, registry, and Zhuyin provider |
| `game/castCheck.ts` | Compatibility facade used by run state |
| `game/speech.ts` | Listen mode / 再聽 |
| `game/coach.ts` | Adult tip strip |
| `ui/castView.ts` | Big 注音 keyboard + practice room |
| `ui/options.ts` | Body-mounted global, accessible Options dialog |

Full contract and future-provider checklist: [CASTING_GATES.md](./CASTING_GATES.md).

---

## Related

- Map generation: [MAP.md](./MAP.md)
- Balance constants: [BALANCE.md](./BALANCE.md)
- Content authoring: [CONTENT.md](./CONTENT.md)
