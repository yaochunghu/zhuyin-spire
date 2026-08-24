# Roadmap

The live version, obtainability rules, and next implementation slice live in
[NEXT_PHASE.md](./NEXT_PHASE.md). This page stays a short resume checklist.

## Shipped (through v0.4.0)

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

---

## Natural next steps

Ordered by “resume playtest” value — not a binding schedule. Detail:
[NEXT_PHASE.md](./NEXT_PHASE.md).

1. **Playtest Waves 1–2** — cast-on / debug-skip matrix in
   [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md)
2. **Relic pool (chest + elite), then a small potion belt** — do not import the
   Echo-era 40/20 bible wholesale
3. **Act I events, then encounter rewrites one act at a time**
4. **Waves 3–4 (Uncommons, then Rares)** after human drafts
5. **Keys, Act IV, and a 20-level track last**
6. Optional later: second character using a reviewed English or math provider,
   plus recorded audio

Smith, physical-copy upgrades, toy-board enemy art, phone layouts, CI, and
Wave 2 obtainability are already in the tree. Do not re-plan them as gated.

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
