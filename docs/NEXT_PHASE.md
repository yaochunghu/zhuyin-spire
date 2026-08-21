# Next phase — after v0.4.0 Wave 2

Wave 2 is implemented. This page records what is live and what to do next.
Do not start relics, potions, events, or Waves 3–4 until the Wave 1–2 playtest
matrix has at least one debug-skip and one cast-on Act II pass.

## Current version

| Source | Says |
|--------|------|
| `package.json` / `CHANGELOG.md` | **0.4.0** |
| GitHub Releases | Latest published tag may still be **v0.2.2** until an owner cuts a release |

## What is live

- One playable character: 共鳴武者 (`echoMage`)
- Act I: 12 reviewed designs (starter 5/4/1 + 9 rewards)
- Later acts / shop / treasure: Wave 1 plus **13 Wave 2 Commons** after
  character score 300 (`LIVE_REVIEWED_WAVE = 2`)
- Score UI still counts catalog rows (12 → 33 at 300); that is not the offer set
- Smith and later-act `+` rolls for reviewed non-basic cards
- No potions, no event rooms; treasure is gold + cards

Wave 2 ids: `de ne ji qi xi zhi chi zi ci wu yu si a`.

## Next feature: relic pool (0.5)

Treasure currently duplicates the card-reward screen. Add a small 共鳴-safe
relic pool (3–6 relics) for chests and elites, with inspectable badges. Do not
import the Echo-era 40-relic bible. Keep the starter 初心音叉.

After that: a 3-slot potion belt with 4–6 potions, then Act I events only.

## Still gated

- Score-300 Uncommons/Rares (`o`, `e`, `rw_b019`, `rw_b024`, `rw_b028`,
  `rw_b030`, `rw_b040`, `rw_b041`)
- All `unlockScore` 1000 and 2000 rows
- Keys, Act IV, second character, English/math providers
