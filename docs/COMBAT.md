# Combat

## Module map

Public imports should use **`src/game/combat.ts`**, which re-exports `src/game/battle/`.

| File | Responsibility |
|------|----------------|
| `battle/types.ts` | `CombatState`, `EnemyUnit`, `CombatCard`, `CombatFx`, phases |
| `battle/fx.ts` | `pushFx` / `takePendingFx` queue |
| `battle/piles.ts` | Shuffle, draw (respect max hand), reward id picks |
| `battle/effects.ts` | Ordered effects, damage preview, Vulnerable, Block/draw/Energy/Powers |
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

## First-character combat rules

- 🎯 **易傷 N:** Attack damage ×1.5, rounded down. Add flat card, Power, and
  relic bonuses first; remove enemy Block afterward. Every hit of multi-hit and
  area Attacks benefits. Direct/non-Attack damage does not. Applications add to
  a cap of nine; duration decreases after the enemy phase.
- 🥋 **基礎攻擊:** explicit card tag. `聲波架式` is a true Power and adds
  +2 to every tagged hit for the rest of combat (+3 upgraded).
- 🎵 **初心音叉:** the first resolved Attack hit every player turn gains +1.
  A failed cast does not spend it, a fully blocked hit does, and only the first
  hit/target in a multi-hit or area sequence receives it.
- Live damage previews call `previewCardDamage`, the same modifier ordering used
  by resolution. Once-only first-hit bonuses are shown separately from later hits.

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
3. Correct → `resolveCastSuccess` → ordered effects; ordinary cards discard and Powers enter `powerPile`
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
| Skill / Power | `self` unless explicitly authored otherwise | Hero drop zone |
| Explicit `target` on `CardDef` | overrides default | matching zones |

`cardNeedsEnemyTarget` / `collectDropTargets` drive UI highlights.

On phones, the hand is a full-width horizontal snap carousel and every card keeps
the same fixed height regardless of copy length. A horizontal touch gesture scrolls
the hand, a tap uses the existing tap-to-play path, and only a clear upward gesture
commits to drag targeting. Mouse and larger-screen drag behavior is unchanged.

---

## FX pipeline

1. Battle code `pushFx` during resolution.
2. After combat render, UI drains via `takePendingFx` / `consumeCombatFx` and plays `playCombatFxBatch`.
3. Session flag `combatFxPlaying` blocks destructive remounts.

`CombatFx.playerStrike` carries ordered `PlayerImpact[]` records. Every hit includes
enemy id, hit index, shield before/blocked/after, HP overflow, and kill state. The UI
can therefore clang/crack/break a monster shield before showing HP damage, including
fully blocked hits that previously produced no strike FX.
`baseDamage`, `basicAttackBonus`, `relicBonus`, `vulnerableApplied`, and
`finalDamage` explain why a hit differs from its printed value.

Gameplay waits and Web Animations use `gameplayMs()`. End-turn discards and redraws
are staggered concurrently; 2× halves gameplay movement without changing teaching pauses.

The global pause menu freezes pause-aware teaching timers and cancels current speech.
Resume continues each timer from its remaining duration and replays the current cue
when appropriate. Combat state, turn timing, energy, and effects are not advanced by
opening or closing this transient menu.

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
