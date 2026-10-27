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
- Act I–III ? rooms and all 30 bible events are live. Potions are still gated:
  event choices that want a bottle stay visible and say the belt is not ready.
  Random uncommon and rare relics stay unavailable until a relic pool lands.

## Before expanding content

The 75-card progression remains the baseline. Browser checks stay in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) and [STABILIZATION.md](STABILIZATION.md). The physical-device checklist and the Act I family session are still open; run them from the kit in [PLAYTEST_GATE.md](PLAYTEST_GATE.md#playtest-kit). Relic work may be developed in parallel. Merge that relic work only after both playtests pass. Potions stay deferred. Act I–III events are in.

## Next feature: relic pool (0.5)

Treasure currently duplicates the card-reward screen. Add a small 共鳴-safe
relic pool (3–6 relics) for chests and elites, with inspectable badges. Do not
import the Echo-era 40-relic bible. Keep the starter 初心音叉.

After that: a 3-slot potion belt with 4–6 potions. Act I–III events are already
in the climb; wire potion rewards into the existing `{ op: 'gainPotion' }` hook.

## Still gated

- Keys, Act IV, second character, English/math providers
