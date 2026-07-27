# Character and deck design

## Live character: 共鳴武者

The player-facing character is a young sound-trained martial artist. The
internal `echoMage` key remains only as a save/profile compatibility lineage.

### Signature mechanics

1. **易傷** — Attack damage ×1.5, rounded down.
2. **基礎攻擊 / 練功** — tagged Attacks add combat-long 練功 to every hit.
3. **轉拍** — successful Attack↔Skill alternation within the current turn.
4. **勁** — fully block an enemy attack action to gain 1, cap 9; authored cards
   spend it in fixed or bounded amounts.

The three overlapping draft directions are:

- **聽隙爆發:** apply and exploit 易傷 windows.
- **百鍊連環:** build basic-Attack density and 練功 scaling.
- **聽勁反擊:** solve intents precisely, bank 勁, and convert it later.

轉拍 is the principal bridge between directions, so hybrid decks can chain
setup, defense, and payoff instead of collecting isolated package pieces.

## Starter

The ten-card starter deliberately teaches one concept at a time:

| Copies | Card | Effect |
|---:|---|---|
| 5 | 音波擊 | 1 Energy: deal 3; 基礎攻擊 |
| 4 | 音波盾 | 1 Energy: gain 4 Block |
| 1 | 破綻震 | 2 Energy: deal 5; apply 2 易傷 |

🎵 **初心音叉** adds +1 to the first resolved Attack hit each player turn
before 易傷.

## Catalog and progression

The generated data draft contains all 75 post-cull definitions, but the live
character, rewards, shops, and later acts expose only the 12-card teaching wave.
Character score publishes the reviewed 21-card waves at 300, 1000, and 2000
points. Existing decks and saved offers remain instance-safe when progression
changes.

The exact base catalog, cull ledger, roles, directions, and release gates live
in [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md).

## Upgrade layer

The physical card contract `{ uid, defId, upgradeLevel }`, V1→V2 migration,
and all 75 authored `+` faces are live; 共鳴武者 sets
`upgradesEnabled: true`.

Campfires offer Rest or Smith. Smith upgrades one exact physical copy, while
later-act rewards and shop offers may arrive upgraded according to their
act-specific roll.

The canonical 75-row catalog and reusable migration rules live in
[UPGRADE_BIBLE.md](./UPGRADE_BIBLE.md).

## Evidence gate

The catalog generator can audit 75 unique draft definitions. Only the live
12-card wave is a playable claim. Later card and upgrade waves still require
the cast-on/debug-skip human draft matrix specified in the design-process memo;
implementation is not automatic balance approval.
