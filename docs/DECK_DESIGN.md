# Character and deck design
## Live first character: 共鳴武者

The internal id remains `echoMage` so existing saves continue to load. The
player-facing identity is **🧒🥋 共鳴武者**: a young sound martial artist who
listens for an opening, marks it with 易傷, and improves disciplined basic
attacks.

The character's learning rhythm is intentionally simple:

1. defend against the shown intent;
2. mark a monster's weakness;
3. attack during the 易傷 window.

### Live rules

- **易傷 N:** Attack damage is multiplied by 1.5 and rounded down. Flat
  bonuses are added first; enemy Block is removed afterward. Duration adds to a
  cap of nine and decreases after the enemy phase. Non-Attack damage ignores it.
- **基礎攻擊:** an explicit card tag. `聲波架式` adds damage to every hit of
  tagged cards for the rest of combat.
- **初心音叉:** universal starter relic. The first resolved Attack hit each
  player turn gains +1. A failed cast does not consume it; a fully blocked hit
  does; a multi-hit or area sequence receives it only once.

### Starter deck: 10 physical cards / 3 designs

| Copies | Card | Type | Cost | Base | Upgrade |
|---:|---|---|---:|---|---|
| 5 | 音波擊 | Attack · 基礎攻擊 | 1 | Deal 3 | Deal 5 |
| 4 | 音波盾 | Skill | 1 | Gain 4 Block | Gain 6 |
| 1 | 破綻震 | Attack | 2 | Deal 5; apply 易傷 2 | Deal 7; 易傷 2 |

Each owned copy is a `DeckCardV2 { uid, defId, upgradeLevel }`; duplicates are
never grouped for removal, upgrades, or designer inspection.

### Live Act I reward pool: 9 designs

The existing pool stays intentionally small during the prototype. The identity
anchors are:

- `弱點標記`: low damage plus inexpensive 易傷 setup.
- `聲波架式`: true Power; leaves draw/discard circulation and gives tagged
  basic attacks +2 per hit this combat (+3 upgraded).
- `響亮一擊`, `日光音波`, `厚實音牆`, `雙拍連擊`, `翻譜`, `深呼吸`, and
  `邊擋邊唱` retain their current effects until playtesting supports changes.

## Expansion boundary

The old 75-card Echo Mage roster is frozen reference material, not an active
implementation target. Rebuild it in reviewed waves around 易傷, basic-attack
training, martial rhythm, defense, and sound utility. Do not mechanically
replace the word “Echo” in all old rows.

Smithing, broader authored upgrades, potions, events, difficulty levels, keys,
and Act IV remain later roadmap phases. Relic mechanics must stay useful to any
character and must not require this character's signature status or tags.
