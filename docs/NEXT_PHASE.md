# Next phase — after the Oct 27 merges

The complete score-gated card pool is implemented. The relic pool, potion belt,
Act I–III events, act-native fights, cast-prompt seed, shop layout fix, and
the 珠算武者 engine seams are on `main`. This page records what is live and
what to do next. Keep running both debug-skip and cast-on Act II passes at
each score milestone while balancing the advanced tiers.

## Current version

| Source | Says |
|--------|------|
| `package.json` | **0.4.2** |
| `CHANGELOG.md` | **[0.4.2] — 2026-10-27** is the published release (#44 and #50–#58). |
| GitHub Releases | **v0.4.2** is the published release, at `027961c`, 2026-10-27 15:00 UTC. |

## What is live

- One playable character: 共鳴武者 (`echoMage`). Character select lists that row only.
- Engine seams for 珠算武者 (first-grade math casting) from #51. `math` and `english` stay reserved ids. The game registry installs 注音 only. No second character, deck, card, or math provider is registered. Practice still builds Zhuyin prompts.
- Act I: 12 teaching designs (starter 5/4/1 + 9 rewards)
- Later acts / shop / treasure: 12 → 33 → 54 → 75 cards at character scores
  0 / 300 / 1,000 / 2,000
- Debug Meta controls can set every score milestone on the active profile
- Smith and later-act `+` rolls for unlocked non-basic cards
- A chest gives gold and one relic. Elites and bosses still offer a card and also drop one relic. When the five relics are already owned, that drop pays 20 gold
- A 3-slot potion belt with six bottles. Event choices that ask for a bottle fill empty slots from that pool
- Act I–III ? rooms and all 30 bible events. A random relic reward draws the relic pool and never replaces 初心音叉. Named event relics are granted by id
- Act-native fights from #52. Each act has a listener, a buffer or scaler, and a summoner. Act II and Act III elites are not recycled Act I fights. Bosses brace, then one heavier hit, then a shield calls one friend that does not act on the turn it appears. The Act III boss gains one point during the brace. A correct cast softens a listener's later attack; the current intent number stays; a fizzle is not punished. Easy-opening quotas and the two-fight anti-repeat are chosen when the map is built. Event moth fights use the act-native 鐘粉蛾. Patterns are in [ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md)
- Each run stores `castSeed` and `castCounter` (#55). Mode rolls, shuffle-bag refills, and distractor banks read that stream. 注音神龕 draws from it too. The question on screen is not stored, so a reload shows the next prompt
- On a phone, each shop offer keeps its card, price, and the remove-card button on screen. Short landscape no longer hides the price (#56)
- #50: searching the discard for a card type no longer deletes cards still in the draw pile. The campfire remove screen can return to rest without deleting a card. Attack damage that is not marked 直傷 respects block and 易傷. Enemy block expires at that enemy's next action

Saves stay on version 4. `eventTrack`, `castSeed`, and `castCounter` are optional, so a checkpoint from before those fields still loads. A missing event record starts empty. A missing seed is filled in and the counter starts at 0. A v1 or v2 `relicId` becomes `relicIds`. A v3 checkpoint loads with an empty belt and chance 40.

## Before expanding content

The 75-card progression remains the baseline. Browser checks stay in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) and [STABILIZATION.md](STABILIZATION.md). The physical-device checklist and the Act I family session are still the recorded open human gates; run them from the kit in [PLAYTEST_GATE.md](PLAYTEST_GATE.md#playtest-kit). Relics, potions, events, and the fight pass are already in this tree. The published v0.4.1 notes still say relic work waits on those two playtests. That sentence describes the tag at #49.

## Relic pool

Chests no longer repeat the card-reward screen. A chest pays its gold and one
relic. An elite or a boss still offers a card and also drops one relic. Normal
fights do not drop relics. The drop pool is five 共鳴 relics:

| Id | Name | Effect |
|----|------|--------|
| `gapThumb` | 尋隙指套 | First Attack hit each turn against an enemy that already has 易傷: +2 before the multiplier |
| `trainingWrap` | 練功護腕 | First 基礎攻擊 hit each turn: +1 before 易傷 |
| `tempoWood` | 換拍木魚 | First successful 轉拍 each turn: +2 Block |
| `listeningHeart` | 聽勁護心 | First 勁 gained in a combat: +3 Block. A full block's shield waits until the next player turn; a card's 勁 grants it immediately |
| `trainingStance` | 練功起勢 | Turn 1 only: 練功 +1, removed when turn 2 starts |

The starter remains 🎵 初心音叉. Each relic can be owned once. When the pool is
exhausted, a chest, elite, or boss drop pays `RELIC_POOL_EXHAUST_GOLD` (20)
instead. An event choice that wants a random relic stays visible and says
沒有新的遺物 once those five are owned. Owned relics show as tappable badges
on the map, in combat, and on the reward screen. No relic skips casting.

The four legacy relics (小盾符, 零錢袋, 晨光火花, 幸運抽) stay in
`src/data/relics.ts` so old saves keep their effects. They are not in the drop
pool.

Event choices that name 口袋節拍器, 月光音樂盒, 雨聲筒, or 合唱緞帶 grant that
relic by id. Choices that ask for a random common, uncommon, or rare relic all
draw one unowned relic from the five-relic pool above.

## Potion belt — first six bottles

Three slots, not an expandable sash. Six bottles is the top of the build-first
4–6 range: one blocked hit, one single-target hit, a small heal, energy, draw,
and a smaller hit on every monster. Echo-only bottles, cleanse, retain,
double-cast, and anything that stops HP 0 from ending the run stay out.

| Id | Name | Effect |
|----|------|--------|
| `guardBubble` | 護盾泡泡 | +8 Block, this turn |
| `soundPebble` | 音波小石 | 6 damage to one enemy. Block absorbs it. Not an Attack and not 直傷 |
| `warmHoney` | 蜂蜜暖茶 | Heal 5. Combat, map, rest, shop, or reward. No drink at full HP |
| `sparkSoda` | 火花汽水 | +2 Energy this turn. Unused energy is gone at end of turn |
| `pageJuice` | 翻頁果汁 | Draw 3. Refuses when that draw would be 0 |
| `chorusBurst` | 合唱爆泡 | 4 damage to each living enemy. Block absorbs each hit. Not an Attack and not 直傷 |

Combat, elite, and boss rewards roll one bottle. The chance starts at 40 each
act, moves by 10, and stays inside 10–80. Treasure does not roll. Every bottle
is equally likely until a real rare exists. A drop lands in the first empty
slot. A full belt stays on the reward screen until the player replaces one
slot or leaves the bottle. Discarding or drinking to open a hole places the
waiting bottle in that hole.

A shop shows two different bottles at 18 gold. A full belt cannot buy one;
the player discards first. Drinking spends no Energy and never opens 注音.
`dealDirect` / 直傷 is only for text that says 直傷. Nothing in this pool does.

Event choices that say `{ op: 'gainPotion' }` fill that many empty slots from
the same six bottles. A choice that needs more free slots than the belt has
stays visible and says 藥水格已滿.

## Next

These four are the current slice. Keys and Act IV stay later. They are not this slice.

1. **珠算武者 playable build.** In progress. First-grade math casting. #51 landed the engine seams only: a casting-task registry, a math binding that no shipped card sets, per-character score buckets, and an attempt model for sequence, three-choice, number pad, and build. The cast screen still draws sequence and single choice. The catalog, deck, cards, and math provider are still to build.
2. **Claude design pass for 珠算武者.** Character select and the answer pad. This page does not do that UI work.
3. **#52's open design questions.** Nine questions in [ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md#questions-for-yao) are still open. They are not decided here:
   - Keep Act II and Act III from rolling Act I elites and Act I normals.
   - Keep one boss per act until each boss has its own portrait.
   - A correct cast soothes a listener; a fizzle does not punish. The current pill stays a promise.
   - New enemies reuse old portraits, for a later art pass.
   - No new strength, soothe, or summon icon, for a later UI pass.
   - Easy quota and anti-repeat stay baked when the map is built.
   - Keep the enemy-block expiry shipped in #50.
   - Act I has four elites after 和聲蛹. Keep four unless the pool must stay at three.
   - 塔守護獸's friend is the shared 軟軟史萊姆. The first heavy is alone; a later heavy can share a turn with the slime if it is still alive.
4. **Full-run v0.4.2 playtest.** Play the published build at `027961c` through a full run. The device checklist and the Act I family session stay in [PLAYTEST_GATE.md](PLAYTEST_GATE.md#playtest-kit). Saves stay on version 4.
