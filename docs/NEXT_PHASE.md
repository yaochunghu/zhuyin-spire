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
- No potions, no event rooms; a chest gives gold and one relic. Elites and bosses still offer a card and also drop one relic. When the five relics are already owned, that drop pays 20 gold.

## Before expanding content

The 75-card progression remains the baseline. Browser checks stay in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) and [STABILIZATION.md](STABILIZATION.md). The physical-device checklist and the Act I family session are still open; run them from the kit in [PLAYTEST_GATE.md](PLAYTEST_GATE.md#playtest-kit). Relic work may be developed in parallel. Merge that relic work only after both playtests pass. Potions, events, and later content stay deferred.

## Relic pool (0.5) — implemented, waiting on playtest

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
exhausted, that drop pays `RELIC_POOL_EXHAUST_GOLD` (20) instead. Owned relics
show as plain badges on the map, in combat, and on the reward screen; a tap
reads the effect. No relic skips casting.

The four legacy relics (小盾符, 零錢袋, 晨光火花, 幸運抽) stay in
`src/data/relics.ts` so old saves keep their effects. They are not in the drop
pool. Saves move to version 3: a v1 or v2 `relicId` becomes `relicIds`.

Yao kept the chest-for-relic trade and the 20-gold fallback. 練功起勢 lasts
one player turn so it sits with the other limited relics. Boss victories use
the same drop.

Device and family playtests are still required before this content merges.

After that playtest: a 3-slot potion belt with 4–6 potions, then Act I events only.

## Still gated

- Keys, Act IV, second character, English/math providers
