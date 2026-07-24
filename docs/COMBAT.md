# Combat

## Module map

Public imports should use **`src/game/combat.ts`**, which re-exports `src/game/battle/`.

| File | Responsibility |
|------|----------------|
| `battle/types.ts` | `CombatState`, `EnemyUnit`, `CombatCard`, `CombatFx`, phases |
| `battle/fx.ts` | `pushFx` / `takePendingFx` queue |
| `battle/piles.ts` | Shuffle, draw (respect max hand), reward id picks |
| `battle/effects.ts` | Target types, primitives, 共鳴 mechanics, and Power triggers |
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

## 共鳴武者 combat rules

- 💥 **易傷:** Attack damage is multiplied by 1.5, rounded down; duration
  decreases at the next player-turn boundary.
- 👊 **基礎攻擊 / 練功:** each hit of a tagged basic Attack adds the current
  combat-long 練功 amount.
- 🥁 **轉拍:** a successful Attack after a Skill, or Skill after an Attack, is
  one 轉拍. Failed casts do not advance it.
- 🥋 **勁:** fully blocking one enemy attack action grants 1 勁, capped at 9.
  Authored spenders consume fixed or bounded amounts.
- 🎵 **初心音叉:** the first resolved Attack hit each player turn gains +1
  before 易傷. `PlayerImpact.relicBonus` keeps the feedback explainable.
- Powers leave draw/discard circulation and remain active for the combat.

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

The combat layer receives a provider-neutral prompt. Character → lesson binding →
provider selection, persistent anti-repeat bags, and future subject rules are in
[CASTING_GATES.md](./CASTING_GATES.md). Combat must not special-case Zhuyin,
English, or math.

Correct casts hold the completed spelling for a two-second teaching beat. A Continue
button appears at 1.2 seconds. This pause and speech are deliberately not affected by
the 2× gameplay setting. Wrong casts still spend the card/energy and reveal the answer.

## First-run fight lesson

An eligible Act I row-0 fight uses `tutorialSlime` (6 HP), a deterministic hand,
and four steps: `shield` → `endTurn` → `attack` → `free`. The shield and
attack prompts gate unrelated cards. After the shield succeeds, End Turn is
highlighted but remaining affordable cards stay playable, so unused energy never
looks broken. If wrong attempts consume the needed card or energy, End Turn becomes
available so the lesson can redraw instead of soft-locking.
Completion is written only in `finishFight` after victory.

---

## Card targeting

| Type | Default target | Drag drop |
|------|----------------|-----------|
| Attack | `singleEnemy` (or `allEnemies` if set) | Enemy unit(s) |
| Self Skill / Power | `self` | Shield / hero drop zone |
| Explicit `target` on `CardDef` | overrides default | matching zones |

`cardNeedsEnemyTarget` / `collectDropTargets` drive UI highlights.

---

## FX pipeline

1. Battle code `pushFx` during resolution.
2. After combat render, UI drains via `takePendingFx` / `consumeCombatFx` and plays `playCombatFxBatch`.
3. Session flag `combatFxPlaying` blocks destructive remounts.

`CombatFx.playerStrike` carries ordered `PlayerImpact[]` records. Every hit includes
enemy id, hit index, shield before/blocked/after, HP overflow, and kill state. The UI
can therefore clang/crack/break a monster shield before showing HP damage, including
fully blocked hits that previously produced no strike FX.
Optional `echoBonus` and `relicBonus` fields explain why a hit was larger than
the printed base number.

Gameplay waits and Web Animations use `gameplayMs()`. End-turn discards and redraws
are staggered concurrently; 2× halves gameplay movement without changing teaching pauses.

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
