# Roadmap

## Implemented on the current v0.3 development line

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
- STS path-first map: 15 floors × 7 lanes × 3 acts; treasure; rest/shop/elite/boss  
- Rebalance: HP 40, rest 40% max HP, no post-combat heal, gold/shop retuned  
- Enlarged cast UI; enlarged StS-style hand cards  
- localStorage mid-run save (stable screens)  
- Debug overlay (skip cast, jump screens, force combat outcomes)  
- Project docs + standalone git (this documentation package)
- Playable GitHub Pages release build
- Dedicated portrait/landscape phone layouts with a scrollable combat hand,
  pause menu, keyboard-safe Options, accessible deck viewer, and phone map panning
- Chromium and WebKit phone regression projects alongside tablet coverage
- V2 physical card copies with safe V1 migration, typed ordered effects,
  Attack/Skill/Power categories, rarity metadata, upgrades, and validation
- Exact-copy deck viewer plus searchable adult designer catalog with effect,
  cue, upgrade, pool, and balance information
- 🧒🥋 共鳴武者 prototype: additive 易傷, tagged basic attacks, true Powers,
  live damage previews, and universal per-turn 初心音叉
- One global pause menu on phones, tablets, and desktop

## StS-informed expansion status

| Phase | Status | Next gate |
|---|---|---|
| Research and design references | Complete, with Echo rows frozen | Rewrite content around the tested Resonance identity |
| Platform, onboarding, responsiveness, release safety | Complete | Keep regression gates green |
| Card/save/effect foundation | Complete | Exercise migration and authoring during playtests |
| Deck and designer viewer | Complete foundation | Add Smith selection states when Smithing begins |
| Resonance Warrior prototype | Implemented | Playtest 易傷/basic-attack numbers before expanding |
| 75 cards and complete upgrades | Design reference only | Re-author and release in small reviewed waves |
| Smithing, relics, and potions | Not implemented beyond five relics | Smith is the next feature phase |
| Events and expanded encounters | Base encounters only | Wait for a stable card pool |
| Difficulty track, keys, and Act IV | Not implemented | Last systems phase |

---

## Natural next steps

Ordered by “resume playtest” value — not a binding schedule:

1. **Playtest the Resonance prototype** — test cast-on and debug-skip runs;
   inspect first-hit previews, Vulnerable duration, and whether basic Attack
   scaling is understandable without adult rules explanation
2. **Add Smith and the approved live upgrades** — use exact-copy UIDs and the
   existing base/upgrade viewer; do not broaden the card pool in the same change
3. **Re-author cards in reviewed waves** — preserve all 27 stable live IDs,
   replace frozen Echo packages deliberately, and review each wave in the
   designer catalog at every phone/tablet viewport
4. **Expand universal relics and add potions** — keep acquisition and temporary
   upgrades instance-safe; test timing hooks before increasing content volume
5. **Add events and encounters one act at a time** — seeded simulation and
   cast-off/cast-on playtests before enabling the next act
6. **Add the 20-level difficulty track, keys, and Act IV last** — only after the
   base three-act game passes save/load, phone/tablet, and accessibility gates
7. **Maintain release gates** — keep unit, responsive browser, production-security,
   and Pages checks green as content volume grows
8. Optional later: second character/theme using a reviewed English or math
   provider contract, plus recorded audio assets

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
