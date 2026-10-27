# Next phase — after the 75-card progression

The complete score-gated card pool is implemented. This page records what is
live and what to do next. Keep running both debug-skip and cast-on Act II passes
at each score milestone while balancing the advanced tiers.

## Current version

| Source | Says |
|--------|------|
| `package.json` / `CHANGELOG.md` | **0.4.1** |
| GitHub Releases | Latest published tag is **v0.4.0** (`535af22`). Publish **v0.4.1** from `main` after this version lands. |

## What is live

- One playable character: 共鳴武者 (`echoMage`)
- Act I: 12 teaching designs (starter 5/4/1 + 9 rewards)
- Later acts / shop / treasure: 12 → 33 → 54 → 75 cards at character scores
  0 / 300 / 1,000 / 2,000
- Debug Meta controls can set every score milestone on the active profile
- Smith and later-act `+` rolls for unlocked non-basic cards
- A chest gives gold and one relic. Elites and bosses still offer a card and also drop one relic. When the five relics are already owned, that drop pays 20 gold
- A 3-slot potion belt with six bottles. Event choices that ask for a bottle fill empty slots from that pool
- Act I–III ? rooms and all 30 bible events. A random relic reward draws the relic pool and never replaces 初心音叉. Named event relics are granted by id

## Before expanding content

The 75-card progression remains the baseline. Browser checks stay in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) and [STABILIZATION.md](STABILIZATION.md). The physical-device checklist and the Act I family session are still open; run them from the kit in [PLAYTEST_GATE.md](PLAYTEST_GATE.md#playtest-kit). The relic pool, the first potion belt, and Act I–III events are in the tree.

## Relic pool (0.5)

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
pool. Saves are version 4. A v1 or v2 `relicId` becomes `relicIds`, then a v3
checkpoint gains an empty belt. Event progress is optional on that snapshot,
so a save from before events still loads.

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

Saves are version 4. A v3 checkpoint loads with an empty belt and chance 40.
Events did not need a fifth save version: `eventTrack` stays optional.

## Still gated

- Keys, Act IV, second character, English/math providers
