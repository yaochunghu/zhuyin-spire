# Roadmap

The live version, obtainability rules, and next implementation slice live in
[NEXT_PHASE.md](./NEXT_PHASE.md). This page stays a short resume checklist.

## Shipped on main

`package.json` is 0.4.2. The published GitHub Release is still `v0.4.1` at
`46f6486` (#49). **v0.4.2** is the release in progress (`[0.4.2]` in
[CHANGELOG.md](../CHANGELOG.md), #44 and #50–#58). It is not tagged yet.
Live detail is [NEXT_PHASE.md](./NEXT_PHASE.md).

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
  `castSeed`, and `castCounter` are optional
- Engine seams for 珠算武者. The character, deck, and math provider are not
  registered. 共鳴武者 is still the only playable character
- Phone shop offers keep the card, price, and remove-card button on screen

---

## Natural next steps

Detail: [NEXT_PHASE.md](./NEXT_PHASE.md).

1. **Claude UI polish pass** — in progress separately. Do not start it here
2. **珠算武者 playable build** — first-grade math casting. Engine seams are in.
   The character, deck, and math provider are not
3. **#52's nine open questions** in
   [ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md#questions-for-yao)
4. **The v0.4.2 release** — this is the release in progress. `package.json`
   is 0.4.2 and `[0.4.2]` covers #44 and #50–#58. The published tag is still
   `v0.4.1` at #49. Tagging and the GitHub Release are still open. Saves stay
   on version 4

Keys, Act IV, and a 20-level track stay later. Cast-on / debug-skip passes at
each score milestone stay in
[RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md).

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
