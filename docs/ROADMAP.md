# Roadmap

The live version, obtainability rules, and next implementation slice live in
[NEXT_PHASE.md](./NEXT_PHASE.md). This page stays a short resume checklist.

## Shipped on main

`package.json` is 0.4.11. The current GitHub Release is **v0.4.11** (`[0.4.11]`
in [CHANGELOG.md](../CHANGELOG.md), #87). The previous release is
v0.4.10 at `808d08d` (#86), 2026-10-29 12:53 UTC. Two characters are playable. Live detail is [NEXT_PHASE.md](./NEXT_PHASE.md).

- Vite + TypeScript SPA; touch-first preschool UI; adult coach strip  
- Full first-syllable 注音 cast (including 聲調); listen mode (Web Speech zh-TW)  
- Practice room + lifetime 📚 badge; large phrase bank + parent packs  
- Up to four learner profiles with separate runs, teaching progress, tutorials,
  and detailed curriculum settings
- Reusable casting-provider boundary, persistent anti-repeat bags, vowel-family
  lessons, and ambient mana cues
- Modular combat (`game/battle/*`); multi-enemy encounters + roles/intents  
- Drag-and-drop card play (enemy / shield zones); draw/discard FX  
- StS hand rules (draw 5, max hand 10)  
- STS path-first map: 15 climb floors × 7 lanes + boss × 3 acts; floor 15 Rest; treasure/shop/elite
- Rebalance: HP 40, rest 40% max HP, no post-combat heal, gold/shop retuned  
- Enlarged cast UI; enlarged StS-style hand cards  
- localStorage mid-run save (stable screens)  
- Debug overlay (skip cast, jump screens, force combat outcomes)  
- Project docs + standalone git (this documentation package)
- Playable GitHub Pages release build
- 共鳴武者 Act I: 12 reviewed Chinese-facing designs, four signature mechanics,
  physical-copy V2 saves, Smith, later-act `+` rolls, and local playtest telemetry
- 共鳴武者 meta progression: later-act fights, shops, and treasure expand from
  12 → 33 → 54 → 75 cards at scores 0 / 300 / 1,000 / 2,000; debug can set
  every milestone
- Act I–III ? rooms: 30 bible events, once each per run, with act pools and
  shared events. Keys and Act IV are still later
- #50: a discard search keeps the draw pile, campfire remove can return to
  rest, and attack damage that is not marked 直傷 respects block and 易傷
- Five 共鳴 relics from chests, elites, bosses, and random event rewards.
  Starter 初心音叉 stays. A 3-slot belt and 6 bottles. Do not import the
  Echo-era 40/20 bible wholesale
- Act-native fights, including 鐘粉蛾, brace, soothe, and summon. ? rooms that
  become fights use the same easy and hard pools
- `castSeed` and `castCounter` on the run. Saves stay version 4. `eventTrack`,
  `castSeed`, `castCounter`, and `rng` are optional. `rng` (#81) is the saved
  deck, reward, shop, gold, relic, potion, and upgrade streams. A checkpoint
  without `rng` still loads: those streams are derived from `castSeed` and
  every counter starts at 0. Practice questions stay on `castSeed`
- 珠算武者 is playable: 27-card pool, math casting with three choices, and
  its own relic pool. 共鳴武者 stays the 注音 character. `english` is reserved
- #87: that character is shown as 數星人. Cards, counters, and relic names use
  星星 / 星座. The title stays 「數清來招，湊十出拳」. The theme line counts
  stars into a 星座. 橡皮擦 and 星星袋 use the new wording. Ids are unchanged.
  Saves stay version 4
- Phone shop offers keep the card, price, and remove-card button on screen.
  The remove button is disabled when gold is short
- The parent coach no longer covers map dots, and campfire choices fit on
  screen. The math cast and the 注音 cast dock fit at the checked phone
  sizes (#61, #64)
- Save/replay harness: committed v4 checkpoints for both characters, plus a
  seeded choice replay inside `npm test`. Saves stay version 4 (#67)
- v0.4.4 playtest follow-up (#68): hinted docks stay on screen, the tutorial
  banner stays off the slots, and 注音神龕 shows 家長協助 once per event
- Content pass (#70): leading 輕聲, 仔 ㄗㄞˇ, no 公分 in grade 1, cue batch 2,
  and 餘 / 於 / 閒
- Local playtest log records one `cast` per resolved prompt (schema v2) and
  does not store the answer (#69)
- Playtest export is schema v3 (#74): `bossEntry`, `combatEnd` with `hpLost`
  before the boss heal, `actClear`, `shopEnter`, `rest`, `potionUsed`,
  `relicPoolExhaust`, and `sittingStart` / `sittingEnd`.
  `scripts/balance-report.mjs` prints B1–B24. The map is in
  [BALANCE.md](./BALANCE.md). Saves stay version 4
- During a tutorial cast, the lesson banner sits under the combat HUD at
  640×360, 844×390, and 568×320, and also at portrait and desktop sizes. At
  360×740 the open coach no longer covers the spelling keys. The
  math 「語音暫時無法播放…」 note fits at 568×320 and stays after 家長協助
  re-renders the dock. The open coach copy scrolls there instead of clipping (#75, #85)
- Cast fit matrix (#78): combat, event fights, the shrine, and practice in
  the default, hinted, speech-fallback, retry, and correction-card states at
  eight viewports. The correction card uses the compact layout up to 640px
  height, so 繼續 stays on screen at 1024×600. The 640×360 hinted header is
  guarded so the answer does not cover 送出. Saves stay version 4
- Content fixes (#77): shape prompts use 球 ⚽, 魔術方塊的一面 🟦, and 書本 📘.
  三角飯糰 stays 🍙. Make-10 tier 2 asks 「N 和 M 合起來是幾？」, total 2–10,
  about one single-zero question in ten, never 0 and 0. 問 uses 🙋. Saves stay
  version 4
- The public README and page description say 一年級 / 5–7 歲 (#79)
- Kid-safe copy (#83): campfire and map coach say 「休息一下，把心補回來」.
  Act names are 魔法花園, 燈籠書庫, and 星空觀星台; the summit is 塔頂之心;
  the last boss is 終焉王. The Act 3 boss headline is 「🏆 爬到塔頂了！」;
  earlier bosses say 「🏆 過關！」. Math listen speech reads the question as
  words. Saves stay version 4
- Debug-only child-error model for both characters (#71). A normal production
  bundle does not contain it

---

## Natural next steps

Detail: [NEXT_PHASE.md](./NEXT_PHASE.md).

1. **A second boss per act** — approved for after the playtest. This revisits
   the one-boss decision

Yao decided the #52 questions. See
[ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md#questions-for-yao). Keys, Act IV, and a
20-level track stay later. The second boss is item 1 above. Cast-on /
debug-skip passes at each score milestone stay in
[RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md).
Saves stay on version 4.

Smith, physical-copy upgrades, the full 75-card score progression, the relic
pool, the potion belt, Act I–III events, act-native fights, toy-board enemy
art, phone layouts, and CI are already in the tree. Do not re-plan them
as gated.

---

## Known pitfalls (don’t relearn the hard way)

| Issue | Lesson |
|-------|--------|
| Hand “stuck” after shield / cards fly to corner | Don’t remount combat mid-FX; keep drag listeners |
| Dual Vite servers after restarts | Kill old `npm run dev` or use one port |
| README said HP 18 / post-fight heal | Stale docs — trust `balance.ts` |
| Game under home directory git | Use **only** `zhuyin-spire/.git`, never parent `pentestnotes` |
| Cast skip for kids | Debug only |

---

## Non-negotiables (carry forward)

1. Full 注音 cast gate in real play (skip **only** via debug)  
2. Adult co-play / coach strip  
3. Touch-first UI  
4. High-stakes death (HP → 0 ends run)  
5. Vite + TypeScript browser SPA  
