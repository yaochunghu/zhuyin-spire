# Roadmap

## Shipped (v0.1.0 baseline)

- Vite + TypeScript SPA; touch-first preschool UI; adult coach strip  
- Full first-syllable 注音 cast (including 聲調); listen mode (Web Speech zh-TW)  
- Practice room + lifetime 📚 badge; large phrase bank + parent packs  
- Modular combat (`game/battle/*`); multi-enemy encounters + roles/intents  
- Drag-and-drop card play (enemy / shield zones); draw/discard FX  
- StS hand rules (draw 5, max hand 10)  
- STS path-first map: 15 floors × 7 lanes × 3 acts; treasure; rest/shop/elite/boss  
- Rebalance: HP 40, rest 40% max HP, no post-combat heal, gold/shop retuned  
- Enlarged cast UI; enlarged StS-style hand cards  
- localStorage mid-run save (stable screens)  
- Debug overlay (skip cast, jump screens, force combat outcomes)  
- Project docs + standalone git (this documentation package)

---

## Natural next steps

Ordered by “resume playtest” value — not a binding schedule:

1. **Full Act I playtest / balance pass** (with and without skip cast)  
2. **Cast screen polish** — optional 1080p stage consistency with combat/map  
3. **Coach on cast** — ensure adult tips don’t cover the hand / cast keys  
4. **FX edge cases** — any remaining float/remount glitches  
5. **More content** — cards, enemies, encounters, phrase packs  
6. **Remote git** — GitHub repo if not yet pushed  
7. Optional later: CI (`npm run build` on PR), more acts polish, audio files instead of procedural only  

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
