# Combat

## Module map

Public imports should use **`src/game/combat.ts`**, which re-exports `src/game/battle/`.

| File | Responsibility |
|------|----------------|
| `battle/types.ts` | `CombatState`, `EnemyUnit`, `CombatCard`, `CombatFx`, phases |
| `battle/fx.ts` | `pushFx` / `takePendingFx` queue |
| `battle/piles.ts` | Shuffle, draw (respect max hand), reward id picks |
| `battle/effects.ts` | Target types, `executeEffects` (damage/block/draw) |
| `battle/playerHandler.ts` | `canPlay`, `beginPlay`, cast success/fizzle, end-turn discard |
| `battle/enemyHandler.ts` | Spawn, select, intents, enemy turn |
| `battle/battleManager.ts` | `createCombat`, `endTurn` |
| `battle/index.ts` | Barrel exports |

UI:

| File | Responsibility |
|------|----------------|
| `ui/combatView.ts` | Stage, enemies, hand, energy, end turn, bind drag |
| `ui/dragPlay.ts` | Pointer drag ghosts, drop zones (enemy / all / self-shield) |
| `ui/cardFx.ts` | Fly cards draw/discard; batch FX player |
| `ui/cards.ts` | Card face HTML + descriptions |

Orchestration of play + cast gate: **`game/state.ts`** (`tryPlayCard`, fight finish).

---

## Hand rules (StS-aligned)

From `data/balance.ts`:

- **Draw per turn:** `DRAW_PER_TURN = 5`
- **Max hand:** `MAX_HAND_SIZE = 10` (extra draws do not enter hand)

Energy is per-combat; end turn discards remaining hand then enemy acts then redraw.

---

## Multi-enemy model

- `CombatState.enemies: EnemyUnit[]` with per-unit HP, block, intent index, instance id
- Selection: `selectedEnemyId` / `selectEnemy`
- Intents: `attack` | `heavy` | `multi` | `block` (see `data/enemies.ts`)
- Multi-hit damage is **per hit × hits**; UI should show total where kids need it
- Legacy “primary” fields sync via `syncPrimaryEnemy` for older callers

Encounters (1–3 enemies) come from `data/encounters.ts` or single-enemy node fields on the map.

---

## Cast gate (product non-negotiable)

Normal path:

1. `beginPlay` spends energy, holds pending card
2. Screen → `castCheck` with prompt from `buildCastPrompt`
3. Correct → `resolveCastSuccess` → effects + discard FX
4. Wrong → `resolveCastFizzle` (card still consumed / energy spent)

**Debug only:** `getDebugSkipCast()` in `tryPlayCard` may resolve success without opening cast. Never enable this for real kid play. See [DEBUG.md](./DEBUG.md).

Cast spelling rule: **full first syllable** (聲母 + 韻母/介音 + 聲調 when not first tone). Example: 爸爸 → `ㄅㄚˋ`, not just `ㄅ`.

---

## Card targeting

| Type | Default target | Drag drop |
|------|----------------|-----------|
| Attack | `singleEnemy` (or `allEnemies` if set) | Enemy unit(s) |
| Block / self skill | `self` | Shield / hero drop zone |
| Explicit `target` on `CardDef` | overrides default | matching zones |

`cardNeedsEnemyTarget` / `collectDropTargets` drive UI highlights.

---

## FX pipeline

1. Battle code `pushFx` during resolution.
2. After combat render, UI drains via `takePendingFx` / `consumeCombatFx` and plays `playCombatFxBatch`.
3. Session flag `combatFxPlaying` blocks destructive remounts.

### Known footgun

**Do not full `render()` remount combat mid-FX or mid-float clear.** That:

- Destroys pile/hand DOM anchors → fly cards jump to top-left
- Leaves hand buttons without drag listeners (“stuck hand”)

`main.ts` `clearFloatSoon` deliberately skips remount when FX is playing.

---

## Fight finish

Win: all enemies HP ≤ 0 → reward path (gold, optional card pick; **no** post-combat heal — `HEAL_AFTER_COMBAT = 0`).  
Lose: hero HP ≤ 0 → `defeat`.

Debug can force win/lose via `debugActions.ts`.
