# Character and deck design

> **Live-versus-target note:** this document describes the small playable
> prototype. The proposed expansion is specified in
> [CARD_BIBLE.md](./CARD_BIBLE.md) and [UPGRADE_BIBLE.md](./UPGRADE_BIBLE.md).
> Those bibles preserve all 27 current card IDs and propose 75 base character
> designs; upgraded faces do not increase that count. Do not activate their
> content until the design-review gate is approved.

## Design rule

Cards are designed by the **combat job they solve**, not as isolated combo
packages. A themed card may reward Echo, but it must still attack, defend, draw,
create energy, or provide battle-long scaling on its own. This keeps reward
choices understandable and prevents a child from receiving a card that does
nothing without two other rare cards.

## First character: 回音法師

- **Theme:** mark a monster with 🔔 Echo, then make the first attack against it
  each player turn hit for +2.
- **Learning rhythm:** defend → mark → attack. The sequence is visible and can
  be explained without reading a paragraph.
- **Starting relic:** 🎵 **初心音叉** adds 2 damage to the first damaging
  hit of every combat. It is useful in every opening hand, demonstrates the
  character's sound theme immediately, and does not require drawing a combo.
- **Scaling card:** 共鳴護唱 grants 2 block whenever Echo triggers for the
  rest of that combat. It turns repeated Echo setup into defense without making
  non-Echo attacks unusable.

### Starter deck: 10 cards / 3 designs

| Copies | Card | Cost | Job | Effect |
|---:|---|---:|---|---|
| 5 | 音波擊 | 1 | Immediate single-target damage | Deal 3 |
| 4 | 音波盾 | 1 | Defense | Gain 4 block |
| 1 | 共鳴震 | 2 | Setup + damage | Deal 5; apply Echo for 2 turns |

This is intentionally repetitive. A first-time player can recognize the two
basic actions before learning the one special card.

### Act I reward pool: 9 designs

| Card | Cost | Primary job | Effect |
|---|---:|---|---|
| 響亮一擊 | 1 | Immediate single damage | Deal 6 |
| 日光音波 | 1 | Area damage | Deal 3 to all monsters |
| 厚實音牆 | 1 | Defense | Gain 7 block |
| 雙拍連擊 | 1 | Multi-hit damage | Deal 2 twice |
| 回音針 | 1 | Echo setup | Deal 2; apply Echo for 2 turns |
| 共鳴護唱 | 1 | Battle-long scaling | Echo triggers grant 2 block this combat |
| 翻譜 | 1 | Draw / consistency | Draw 2 |
| 深呼吸 | 0 | Energy / consistency | Gain 1 energy |
| 邊擋邊唱 | 1 | Defense + draw | Gain 3 block; draw 1 |

Normal fights, elites, shops, and Act I treasure rewards draw from these same
nine designs for now. Elite rarity is deliberately postponed until the small
pool has been playtested.

## Upgrade layer (later, not active)

Do not add upgrades until the base twelve designs are readable and balanced.
When upgrades are added:

1. Store an `upgraded` flag on a **deck card instance**, not by changing the
   stable card id. The current run deck is still an id list, so this requires a
   deliberate save migration rather than a quick field addition.
2. Add one authored upgrade definition beside each base card's effects.
3. Improve the card's primary job first: more damage/block, one cheaper cost,
   longer Echo, or stronger draw. Do not turn every upgrade into new rules text.
4. Display a clear `+` name, changed numbers, and preview before confirmation.
5. Decide whether campfires become a three-way choice (heal / remove / upgrade)
   only after testing how much choice load is comfortable for preschool play.

The explicit `effects[]` data used by the twelve cards is already a clean base
for swapping in an upgraded effect list later; no upgrade behavior is silently
active today.

The full target now has a concrete per-copy save migration, Smith flow, reward
upgrade rates, temporary upgrades, preview rules, and one repeat-upgrade
exception in [UPGRADE_BIBLE.md](./UPGRADE_BIBLE.md). That newer proposal
supersedes this section once approved; this section remains the live-runtime
warning until implementation lands.
