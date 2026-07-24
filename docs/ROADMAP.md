# Roadmap

## Shipped (v0.2.0)

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
- 共鳴武者 first playable wave: 12 reviewed designs, four signature mechanics,
  physical-copy V2 saves, local playtest telemetry, and a generated 75-card
  implementation draft kept outside live pools

---

## Natural next steps

Ordered by “resume playtest” value — not a binding schedule:

1. **Playtest the 共鳴武者 first wave** — run the cast-on/debug-skip matrix in
   [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md)
   and review 易傷、練功、轉拍、勁 feedback at tablet sizes
2. **Promote cards through human-reviewed waves** — keep the generated
   75-card draft unobtainable until each batch passes the documented matrix
3. **Author upgrades, then enable Smith** — the UID/save layer exists, but
   generated `+` faces and upgraded offers remain gated
4. **Add expanded relics and potions** — keep acquisition and temporary
   upgrades instance-safe; test timing hooks before increasing content volume
5. **Add events and encounters one act at a time** — seeded simulation and
   cast-off/cast-on playtests before enabling the next act
6. **Add the 20-level difficulty track, keys, and Act IV last** — only after the
   base three-act game passes save/load, tablet, and accessibility gates
7. **Remote git / CI** — dedicated GitHub repository and build/test checks if not
   already configured
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
