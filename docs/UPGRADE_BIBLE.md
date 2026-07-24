# Upgrade Bible: 共鳴武者

> **Status:** physical-copy foundation implemented; card upgrades not released.
> The V1→V2 save model and dormant Smith/offer plumbing use this contract.
> Generated `+` faces are an engineering draft and must not be treated as
> authored or balanced content.

## Locked rules

- A future collectible card upgrade will be permanent and non-repeatable.
- Status and Curse cards cannot be upgraded.
- Upgrades preserve the card's 注音 family, role, direction, and physical-copy UID.
- The live campfire remains Rest or Remove; Smith is gated off.
- Live reward and shop offers always use upgrade level 0.
- Proposed later-act upgrade rates require a separate approval and playtest.
- Temporary, relic-driven, and event-driven upgrade sources are deferred.

## Runtime contract

```ts
interface DeckCard {
  uid: string;
  defId: string;
  upgradeLevel: 0 | 1;
}
```

Deck order and duplicate copies survive V1→V2 migration. Reward and shop
instances serialize an upgrade level for forward compatibility, but the current
character only creates level-zero offers.

## Generated draft catalog (not live)

| Runtime ID | Card | Base | Upgraded |
|---|---|---|---|
| `bo` | B001 音波擊 | Deal 3 damage. This is a 基礎攻擊. | Deal 5 damage. This is a 基礎攻擊. |
| `mo` | B002 音波盾 | Gain 4 Block. | Gain 6 Block. |
| `po` | B003 破綻震 | Deal 5 damage. Apply 2 易傷. | Deal 7 damage. Apply 2 易傷. |
| `he` | B004 弱點標記 | Deal 2 damage. Apply 2 易傷. | Deal 4 damage. Apply 2 易傷. |
| `ge` | B005 響亮一擊 | Deal 6 damage. | Deal 8 damage. |
| `ri` | B006 日光音波 | Deal 3 damage to all enemies. | Deal 5 damage to all enemies. |
| `ke` | B007 厚實音牆 | Gain 7 Block. | Gain 9 Block. |
| `te` | B008 雙拍連擊 | Deal 2 damage twice. This is a 基礎攻擊. | Deal 3 damage twice. This is a 基礎攻擊. |
| `le` | B009 翻譜 | Draw 2 cards. | Draw 3 cards. |
| `de` | B010 深呼吸 | Gain 1 Energy. Exhaust. | Gain 1 Energy. Draw 1 card. Exhaust. |
| `ne` | B011 邊擋邊唱 | Gain 3 Block. Draw 1 card. | Gain 5 Block. Draw 1 card. |
| `ji` | B013 試探拳 | Deal 2 damage. If the target has 易傷, draw 1 card. Exhaust. | Deal 4 damage. If the target has 易傷, draw 1 card. Exhaust. |
| `qi` | B014 開窗掌 | Deal 4 damage. If the target has no 易傷, apply 1 易傷. | Deal 6 damage. If the target has no 易傷, apply 1 易傷. |
| `xi` | B016 趁隙直拳 | Deal 4 damage. If the target has 易傷, deal 3 more damage. | Deal 6 damage. If the target has 易傷, deal 3 more damage. |
| `zhi` | B017 掃堂尋隙 | Deal 5 damage to all enemies. Apply 1 易傷 to each enemy that had none. | Deal 7 damage to all enemies. Apply 1 易傷 to each enemy that had none. |
| `chi` | B031 練拳 | 練功 1. Exhaust. | 練功 2. Exhaust. |
| `zi` | B032 基本步 | Put a random 基礎攻擊 from your draw pile into your hand. Exhaust. | Put a random 基礎攻擊 from your draw pile into your hand. Exhaust. Draw 1 card. |
| `ci` | B034 低樁拳 | Deal 4 damage. Gain 2 Block. This is a 基礎攻擊. | Deal 6 damage. Gain 2 Block. This is a 基礎攻擊. |
| `si` | B038 基本防線 | Gain 5 Block. If you played a 基礎攻擊 this turn, gain 2 more Block. | Gain 7 Block. If you played a 基礎攻擊 this turn, gain 2 more Block. |
| `wu` | B036 掃堂基本式 | Deal 5 damage to all enemies. This is a 基礎攻擊. | Deal 7 damage to all enemies. This is a 基礎攻擊. |
| `yu` | B037 溫習 | Return a 基礎攻擊 from your discard pile to your hand. It costs 0 this turn. | Costs 0. Return a 基礎攻擊 from your discard pile to your hand. It costs 0 this turn. |
| `yi` | B051 攻守換拍 | Deal 4 damage. 轉拍：gain 3 Block. | Deal 6 damage. 轉拍：gain 3 Block. |
| `a` | B052 守攻換拍 | Gain 5 Block. 轉拍：deal 3 direct damage to the selected enemy. | Gain 7 Block. 轉拍：deal 3 direct damage to the selected enemy. |
| `o` | B020 破口追擊 | Deal 7 damage. If the target has 易傷, deal 7 damage again. | Deal 9 damage. If the target has 易傷, deal 7 damage again. |
| `e` | B021 收束震 | Deal 3 damage. Remove all 易傷 from the target, then deal 2 direct damage per duration removed. | Deal 5 damage. Remove all 易傷 from the target, then deal 2 direct damage per duration removed. |
| `rw_b019` | B019 回身標記 | Gain 4 Block. Apply 1 易傷 to the selected enemy. | Gain 6 Block. Apply 1 易傷 to the selected enemy. |
| `rw_b024` | B024 破綻回聲 | The first time each turn you apply 易傷, draw 1 card. | The first time each turn you apply 易傷, Draw 2 cards. |
| `rw_b028` | B028 破綻護身 | Gain 4 Block plus 2 for each living enemy with 易傷. | Gain 6 Block plus 2 for each living enemy with 易傷. |
| `rw_b030` | B030 一瞬勝機 | The first time each turn you successfully play an Attack against an enemy with 易傷, gain 1 Energy. | Costs 0. The first time each turn you successfully play an Attack against an enemy with 易傷, gain 1 Energy. |
| `shi` | B012 聲波架式 | 練功 2. | 練功 3. |
| `rw_b040` | B040 熟能生巧 | After you play 3 基礎攻擊s, 練功 1 and reset this count. | After you play 3 基礎攻擊s, 練功 2 and reset this count. |
| `rw_b041` | B041 拆招重練 | Choose an Attack in your hand. It becomes a 基礎攻擊 for this combat. Draw 1 card. | Choose an Attack in your hand. It becomes a 基礎攻擊 for this combat. Draw 2 cards. |
| `rw_b042` | B042 基礎連環 | Deal 2 damage once for each 基礎攻擊 in your draw, hand, and discard piles, up to 6 times. | Deal 4 damage once for each 基礎攻擊 in your draw, hand, and discard piles, up to 6 times. |
| `rw_b049` | B049 基本功夫 | The next 2 基礎攻擊s you play this turn cost 0. Exhaust. | Costs 0. The next 2 基礎攻擊s you play this turn cost 0. Exhaust. |
| `rw_b053` | B053 換拍抽氣 | Draw 1 card. 轉拍：gain 1 Energy. | Draw 2 cards. 轉拍：gain 1 Energy. |
| `rw_b055` | B055 左右開弓 | Deal 2 damage twice. 轉拍：apply 1 易傷. | Deal 3 damage twice. 轉拍：apply 1 易傷. |
| `rw_b059` | B059 不斷換步 | The first time each turn you perform 轉拍, draw 1 card. | The first time each turn you perform 轉拍, Draw 2 cards. |
| `rw_b060` | B060 一攻一守 | The first time each turn you perform your second 轉拍, gain 1 Energy and 3 Block. | Costs 0. The first time each turn you perform your second 轉拍, gain 1 Energy and 3 Block. |
| `rw_b061` | B061 變拍連環 | Deal 2 damage three times. Add 1 damage to every hit for each 轉拍 performed this turn, including this card's. | Deal 3 damage three times. Add 1 damage to every hit for each 轉拍 performed this turn, including this card's. |
| `rw_b064` | B064 接續姿勢 | Gain 5 Block. 轉拍：the leftmost Attack in your hand costs 1 less this turn, minimum 0. | Gain 7 Block. 轉拍：the leftmost Attack in your hand costs 1 less this turn, minimum 0. |
| `rw_b063` | B063 偷半拍 | Draw 2 cards. If this card does not trigger 轉拍, discard 1 card. | Draw 3 cards. If this card does not trigger 轉拍, discard 1 card. |
| `rw_b065` | B065 迴旋換拍 | Costs 1 if the previously successfully played card this turn was a Skill. Deal 7 damage to all enemies. | Costs 1 if the previously successfully played card this turn was a Skill. Deal 9 damage to all enemies. |
| `rw_b070` | B070 完美換拍 | Whenever you perform 轉拍, deal 2 direct damage to all enemies and gain 2 Block, up to 3 times per turn. | Costs 2. Whenever you perform 轉拍, deal 2 direct damage to all enemies and gain 2 Block, up to 3 times per turn. |
| `rw_b071` | B071 交錯終章 | Deal 8 damage. Repeat once for each 轉拍 performed before this card this turn, up to 3 total hits. | Deal 10 damage. Repeat once for each 轉拍 performed before this card this turn, up to 3 total hits. |
| `rw_b076` | B076 接住力道 | Gain 6 Block. If you gain 勁 during the next enemy phase, draw 1 additional card next turn. | Gain 8 Block. If you gain 勁 during the next enemy phase, draw 1 additional card next turn. |
| `fo` | B077 化勁掌 | Spend 1 勁. Deal 8 damage. Cannot be played without enough 勁. | Spend 1 勁. Deal 10 damage. Cannot be played without enough 勁. |
| `rw_b078` | B078 借力盾 | Gain 5 Block. If you have 勁, spend 1 勁 and gain 4 more Block. | Gain 7 Block. If you have 勁, spend 1 勁 and gain 4 more Block. |
| `rw_b080` | B080 推手 | Deal 4 damage. If you have 勁, spend 1 勁 and apply 1 易傷. | Deal 6 damage. If you have 勁, spend 1 勁 and apply 1 易傷. |
| `rw_b082` | B082 借力打力 | Spend up to 3 勁 automatically. Deal 5 damage plus 3 for each 勁 spent. | Spend up to 3 勁 automatically. Deal 7 damage plus 3 for each 勁 spent. |
| `rw_b084` | B084 四兩撥千斤 | Spend 1 勁. Gain 9 Block. Cannot be played without enough 勁. | Spend 1 勁. Gain 11 Block. Cannot be played without enough 勁. |
| `rw_b085` | B085 震腳回力 | Deal 5 damage. If you gained 勁 during the previous enemy phase, deal 5 more damage. | Deal 7 damage. If you gained 勁 during the previous enemy phase, deal 5 more damage. |
| `rw_b087` | B087 引勁入拳 | Spend 1 勁. Your next Attack this turn deals 8 more damage. Cannot be played without enough 勁. | Costs 0. Spend 1 勁. Your next Attack this turn deals 8 more damage. Cannot be played without enough 勁. |
| `rw_b089` | B089 震波反擊 | Deal 6 damage to all enemies. If you have 勁, spend 1 勁 and deal 3 more damage to all enemies. | Deal 8 damage to all enemies. If you have 勁, spend 1 勁 and deal 3 more damage to all enemies. |
| `rw_b090` | B090 不動如山 | Once each enemy phase, before an attack would break your Block, automatically spend 1 勁 to gain 5 Block if possible. | Costs 1. Once each enemy phase, before an attack would break your Block, automatically spend 1 勁 to gain 5 Block if possible. |
| `rw_b093` | B093 勁走全身 | Whenever a card spends 勁, gain 2 Block and draw 1 card, once for that card. | Whenever a card spends 勁, gain 2 Block and Draw 2 cards, once for that card. |
| `rw_b097` | B097 空手接招 | Gain 5 Block. During the next enemy phase, the first attack action you fully block grants 1 additional 勁. Exhaust. | Gain 7 Block. During the next enemy phase, the first attack action you fully block grants 1 additional 勁. Exhaust. |
| `rw_b102` | B102 破綻基本拳 | Deal 3 damage. This is a 基礎攻擊. If the target has 易傷, deal 2 more damage. | Deal 5 damage. This is a 基礎攻擊. If the target has 易傷, deal 2 more damage. |
| `rw_b107` | B107 破綻換手 | Apply 1 易傷. Your next 基礎攻擊 this turn costs 0. | Apply 2 易傷. Your next 基礎攻擊 this turn costs 0. |
| `rw_b108` | B108 基本轉拍 | Deal 3 damage. This is a 基礎攻擊. 轉拍：draw 1 card. | Deal 5 damage. This is a 基礎攻擊. 轉拍：draw 1 card. |
| `rw_b113` | B113 以剛護柔 | Gain 3 Block. 轉拍：練功 1. Exhaust. | Gain 5 Block. 轉拍：練功 1. Exhaust. |
| `rw_b114` | B114 反覆破綻 | When a 基礎攻擊 hits an enemy with 易傷, extend that 易傷 by 1, once per card played and up to 9. | Costs 0. When a 基礎攻擊 hits an enemy with 易傷, extend that 易傷 by 1, once per card played and up to 9. |
| `rw_b115` | B115 聲波循環 | The first time each turn you perform 轉拍 with a 基礎攻擊, put the most recently discarded Skill on top of your draw pile. | Costs 1. The first time each turn you perform 轉拍 with a 基礎攻擊, put the most recently discarded Skill on top of your draw pile. |
| `rw_b119` | B119 圓轉基本式 | Gain 5 Block. If you gained 勁 during the previous enemy phase, return a 基礎攻擊 from discard to your hand; it costs 0 this turn. | Gain 7 Block. If you gained 勁 during the previous enemy phase, return a 基礎攻擊 from discard to your hand; it costs 0 this turn. |
| `rw_b120` | B120 勁貫破綻 | Deal 6 damage. If you have 勁, spend 1 勁 and apply 2 易傷. | Deal 8 damage. If you have 勁, spend 1 勁 and apply 2 易傷. |
| `rw_b122` | B122 聽拍尋隙 | Draw 2 cards. If exactly one drawn card is an Attack, apply 1 易傷. | Draw 3 cards. If exactly one drawn card is an Attack, apply 1 易傷. |
| `rw_b123` | B123 短橋連拳 | Deal 2 damage twice. If this card triggers 轉拍, add your 練功 bonus a second time to each hit. | Deal 3 damage twice. If this card triggers 轉拍, add your 練功 bonus a second time to each hit. |
| `rw_b124` | B124 破綻借力 | Remove up to 2 易傷 from one enemy. Gain 1 勁 for each duration removed. | Remove up to 3 易傷 from one enemy. Gain 1 勁 for each duration removed. |
| `rw_b127` | B127 基本三才 | The first time each turn you play your second 基礎攻擊, repeat that Attack's damage and draw 1 card. | The first time each turn you play your second 基礎攻擊, repeat that Attack's damage and Draw 2 cards. |
| `rw_b128` | B128 無懈可擊 | Gain 10 Block. If you take no HP damage during the next enemy phase, 練功 1. Exhaust. | Gain 12 Block. If you take no HP damage during the next enemy phase, 練功 1. Exhaust. |
| `rw_b129` | B129 聞聲即動 | At the start of each turn, draw 1 Skill if any enemy intends to attack; otherwise draw 1 Attack. | Costs 1. At the start of each turn, draw 1 Skill if any enemy intends to attack; otherwise draw 1 Attack. |
| `rw_b131` | B131 剛柔並濟 | The first 轉拍 each turn grants 練功 1; the second grants 1 勁. | The first 轉拍 each turn grants 練功 2; the second grants 1 勁. |
| `rw_b132` | B132 一氣呵成 | Costs 1 less for each 轉拍 performed before this card this turn, minimum 0. Deal 4 damage four times. | Costs 1 less for each 轉拍 performed before this card this turn, minimum 0. Deal 5 damage four times. |
| `rw_b100` | B100 化勁留隙 | The first time each enemy phase you gain 勁, apply 1 易傷 to the enemy whose attack granted it. | The first time each enemy phase you gain 勁, apply 2 易傷 to the enemy whose attack granted it. |
| `rw_b144` | B144 震聲喝止 | Apply 2 Weak. If the target has 易傷, gain 5 Block. | Costs 0. Apply 2 Weak. If the target has 易傷, gain 5 Block. |
| `rw_b149` | B149 後發先至 | Retain. Deal 7 damage. If you gained 勁 during the previous enemy phase, deal 8 more damage. | Retain. Deal 9 damage. If you gained 勁 during the previous enemy phase, deal 8 more damage. |

## Validation gates

The build may assert that generated draft faces are structurally resolvable and
that no upgrade level exceeds 1. It must also assert that 共鳴武者 keeps Smith
disabled and live offers at level zero. No draft `+` face becomes canonical
until its wording, number, casting cost, touch presentation, and human evidence
pass [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md).
