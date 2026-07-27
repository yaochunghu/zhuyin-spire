# 共鳴武者：75 張牌池破壞式設計紀錄

> Status: active design funnel. This document deliberately preserves rejected
> ideas so later decisions can be audited instead of reconstructed from memory.

## Step 1 — Character foundation (locked)

**Fantasy:** 共鳴武者是一名以聲辨位的年幼武者。他先讀懂敵人的節奏，
以防守化去力道，再抓住破綻，用反覆練熟的基本招式完成反擊。

**Player promise:** 看意圖、攻守換拍、製造易傷窗口、把成功防守轉成進攻資源，
並讓看似弱小的基礎攻擊在長戰中成為可靠的核心。

**Starter relic — 初心音叉:** the first resolved Attack hit each player turn
gains +1 damage before 易傷. A failed cast does not consume it; a fully Blocked
hit does; a multi-hit or area Attack receives it only on the first resolved
target/hit. It is always useful and makes “wait, then strike” visible without
requiring a specific reward.

### Four signature mechanics

1. **易傷:** Attack damage ×1.5, rounded down. Duration adds to a cap of 9 and
   decreases after the enemy phase.
2. **基礎攻擊／練功 N:** tagged Attacks are 基礎攻擊. 練功 N gives every hit
   of 基礎攻擊 +N damage for the rest of combat.
3. **轉拍:** triggers when a successfully cast Attack follows a successfully
   cast Skill, or a successfully cast Skill follows a successfully cast Attack,
   during the same player turn. Powers are neutral. A failed cast does not
   update the sequence. The sequence resets each player turn.
4. **化勁／勁:** when Block prevents an entire enemy attack action from dealing
   HP damage, gain 1 勁. A multi-hit intent is one action and any leaked HP
   damage prevents the trigger. 勁 persists for combat and caps at 9. Cards may
   spend 勁; a few inefficient cards may create it directly.

### Compatibility constraints

- Full 注音 casting remains mandatory outside debug.
- The mature target is 75 base designs; upgrades are not separate designs.
- The starter remains five basic Attacks, four basic defensive Skills, and one
  易傷 setup Attack.
- Existing stable runtime IDs and their 注音 lesson families must be preserved,
  but names, effects, costs, rarities, and upgrades may be rewritten.
- The 12 prototype designs are incumbents, not protected conclusions.

## Step 2 — Massive brainstorm (150 ideas, no filtering)

These are deliberately raw. Costs, rarities, and numbers are concrete seed
values so each idea can be tested, not balance conclusions. Every row is
**unassigned** until Step 4 and has **no survival claim** until Step 3.

Abbreviations: `V` = 易傷, `B` = 基礎攻擊／練功, `T` = 轉拍, `J` = 化勁／勁,
`G` = general support.

### Ideas 001–050

| # | Name | Type | Cost | Seed rarity | Exact seed effect | Mechanics |
|---:|---|---|---:|---|---|---|
| B001 | 音波擊 | Attack | 1 | Basic | Deal 3 damage. | B |
| B002 | 音波盾 | Skill | 1 | Basic | Gain 4 Block. | J |
| B003 | 破綻震 | Attack | 2 | Basic | Deal 5 damage. Apply 2 易傷. | V |
| B004 | 弱點標記 | Attack | 1 | Common | Deal 2 damage. Apply 2 易傷. | V |
| B005 | 響亮一擊 | Attack | 1 | Common | Deal 6 damage. | G |
| B006 | 日光音波 | Attack | 1 | Common | Deal 3 damage to all enemies. | G |
| B007 | 厚實音牆 | Skill | 1 | Common | Gain 7 Block. | J |
| B008 | 雙拍連擊 | Attack | 1 | Common | Deal 2 damage twice. | B |
| B009 | 翻譜 | Skill | 1 | Common | Draw 2 cards. | T |
| B010 | 深呼吸 | Skill | 0 | Common | Gain 1 Energy. Exhaust. | T |
| B011 | 邊擋邊唱 | Skill | 1 | Common | Gain 3 Block. Draw 1 card. | T/J |
| B012 | 聲波架式 | Power | 1 | Uncommon | 練功 2. | B |
| B013 | 試探拳 | Attack | 0 | Common | Deal 2 damage. If the enemy has 易傷, draw 1 card. Exhaust. | V/T |
| B014 | 開窗掌 | Attack | 1 | Common | Deal 4 damage. If the target has no 易傷, apply 1 易傷. | V |
| B015 | 延長破綻 | Skill | 1 | Common | Apply 2 易傷. If the target already had 易傷, apply 1 more. | V |
| B016 | 趁隙直拳 | Attack | 1 | Common | Deal 4 damage. If the target has 易傷, deal 3 more. | V |
| B017 | 掃堂尋隙 | Attack | 2 | Common | Deal 5 damage to all enemies. Apply 1 易傷 to enemies without 易傷. | V |
| B018 | 指向破綻 | Skill | 0 | Common | Apply 1 易傷. Exhaust. | V |
| B019 | 回身標記 | Skill | 1 | Common | Gain 5 Block. Apply 1 易傷 to the enemy with the highest current HP. | V/J |
| B020 | 破口追擊 | Attack | 2 | Uncommon | Deal 7 damage. If the target has 易傷, deal 7 damage again. | V |
| B021 | 收束震 | Attack | 1 | Uncommon | Deal 3 damage. Remove all 易傷 from the target; deal 2 more per duration removed. | V |
| B022 | 借來破綻 | Skill | 1 | Uncommon | Move all 易傷 from one enemy to another. Draw 1 card. | V/G |
| B023 | 全場破綻 | Skill | 2 | Uncommon | Apply 2 易傷 to all enemies. | V |
| B024 | 破綻回聲 | Power | 1 | Uncommon | The first time each turn you apply 易傷, draw 1 card. | V/T |
| B025 | 見縫插針 | Power | 2 | Rare | Whenever 易傷 duration decreases, deal 3 direct damage to that enemy. | V |
| B026 | 不留空隙 | Attack | 3 | Rare | Deal 18 damage. If the target has at least 4 易傷, cost 1 less. | V |
| B027 | 重點打擊 | Attack | 2 | Uncommon | Deal 10 damage. Double the target's 易傷 duration, to a maximum of 9. | V |
| B028 | 破綻護身 | Skill | 1 | Uncommon | Gain 4 Block plus 2 Block for each living enemy with 易傷. | V/J |
| B029 | 觀敵入微 | Skill | 1 | Uncommon | Apply 1 易傷. Put an Attack from your draw pile into your hand. | V/G |
| B030 | 一瞬勝機 | Power | 2 | Rare | The first Attack you play against an enemy with 易傷 each turn costs 1 less. | V/T |
| B031 | 練拳 | Skill | 1 | Common | 練功 1. Exhaust. | B |
| B032 | 基本步 | Skill | 0 | Common | Draw 1 基礎攻擊. Exhaust. | B/T |
| B033 | 反覆直拳 | Attack | 1 | Common | Deal 3 damage. This is a 基礎攻擊. Return it to your draw pile instead of discarding it. | B |
| B034 | 低樁拳 | Attack | 1 | Common | Deal 4 damage. This is a 基礎攻擊. Gain 2 Block. | B/J |
| B035 | 雙聲拳 | Attack | 1 | Common | Deal 2 damage twice. This is a 基礎攻擊. | B |
| B036 | 掃堂基本式 | Attack | 2 | Common | Deal 4 damage to all enemies. This is a 基礎攻擊. | B |
| B037 | 溫習 | Skill | 1 | Common | Return a 基礎攻擊 from your discard pile to your hand. | B/T |
| B038 | 基本防線 | Skill | 1 | Common | Gain 6 Block. If your hand contains a 基礎攻擊, gain 2 more. | B/J |
| B039 | 每日一拳 | Power | 1 | Common | The first 基礎攻擊 played each turn deals 2 more damage. | B |
| B040 | 熟能生巧 | Power | 2 | Uncommon | After you play 3 基礎攻擊s, 練功 1. The count then resets. | B |
| B041 | 拆招重練 | Skill | 1 | Uncommon | Choose an Attack in hand. It becomes a 基礎攻擊 for this combat. Draw 1 card. | B/G |
| B042 | 基礎連環 | Attack | 2 | Uncommon | Deal 2 damage once for each 基礎攻擊 in your draw, hand, and discard piles, maximum 6 hits. | B |
| B043 | 師父點頭 | Skill | 1 | Uncommon | Upgrade all 基礎攻擊s in your hand for this combat. | B |
| B044 | 早課 | Power | 0 | Uncommon | Innate. At the start of each turn, put a random 基礎攻擊 from your draw pile into your hand. Exhaust. | B |
| B045 | 千錘百鍊 | Power | 3 | Rare | Whenever a 基礎攻擊 deals unblocked damage, it gains +1 damage for this combat. | B |
| B046 | 返璞歸真 | Skill | 2 | Rare | Exhaust every non-Basic card in your hand. 練功 1 for each card Exhausted. Exhaust. | B/G |
| B047 | 一招到底 | Attack | 1 | Rare | Deal 5 damage. This is a 基礎攻擊. Increase this card's damage by 3 for this combat. | B |
| B048 | 百練成鋼 | Power | 2 | Rare | 基礎攻擊s gain 2 Block when played. | B/J |
| B049 | 基本功夫 | Skill | 1 | Uncommon | The next 2 基礎攻擊s you play this turn cost 0. Exhaust. | B/T |
| B050 | 回到起手 | Skill | 1 | Uncommon | Put up to 2 基礎攻擊s from your discard pile on top of your draw pile. Draw 1 card. | B/T |

### Ideas 051–100

| # | Name | Type | Cost | Seed rarity | Exact seed effect | Mechanics |
|---:|---|---|---:|---|---|---|
| B051 | 攻守換拍 | Attack | 1 | Common | Deal 4 damage. 轉拍：gain 3 Block. | T/J |
| B052 | 守攻換拍 | Skill | 1 | Common | Gain 5 Block. 轉拍：deal 3 damage to the selected enemy. | T/J |
| B053 | 換拍抽氣 | Skill | 1 | Common | Draw 1 card. 轉拍：gain 1 Energy. | T |
| B054 | 換拍突刺 | Attack | 1 | Common | Deal 5 damage. 轉拍：deal 2 more. | T |
| B055 | 左右開弓 | Attack | 1 | Common | Deal 2 damage twice. 轉拍：apply 1 易傷. | T/V |
| B056 | 節奏護手 | Skill | 1 | Common | Gain 4 Block. 轉拍：gain 3 more. | T/J |
| B057 | 先禮後兵 | Skill | 0 | Common | Gain 2 Block. Your next Attack this turn deals 2 more damage. Exhaust. | T |
| B058 | 先兵後禮 | Attack | 0 | Common | Deal 2 damage. Your next Skill this turn grants 2 more Block. Exhaust. | T/J |
| B059 | 不斷換步 | Power | 1 | Uncommon | The first 轉拍 each turn draws 1 card. | T |
| B060 | 一攻一守 | Power | 1 | Uncommon | Every second 轉拍 each turn grants 1 Energy. | T |
| B061 | 變拍連環 | Attack | 2 | Uncommon | Deal 3 damage three times. Each 轉拍 this turn adds 1 damage to every hit. | T/B |
| B062 | 倒拍 | Skill | 0 | Uncommon | The next card this turn triggers 轉拍 even if it matches the previous card's type. Exhaust. | T |
| B063 | 偷半拍 | Skill | 1 | Uncommon | Draw 2 cards. If this does not trigger 轉拍, discard 1 card. | T/G |
| B064 | 接續姿勢 | Skill | 1 | Uncommon | Gain 5 Block. Retain the next Attack drawn this turn. 轉拍：draw 1 card. | T/J |
| B065 | 迴旋換拍 | Attack | 2 | Uncommon | Deal 7 damage to all enemies. 轉拍：cost 1 less. | T |
| B066 | 聲聲相換 | Power | 2 | Uncommon | Whenever you 轉拍, your next 基礎攻擊 this turn deals 1 more damage. | T/B |
| B067 | 破綻轉拍 | Attack | 1 | Uncommon | Deal 4 damage. 轉拍：apply 2 易傷. | T/V |
| B068 | 轉拍化勁 | Skill | 1 | Uncommon | Gain 5 Block. 轉拍：gain 1 勁. | T/J |
| B069 | 三次變奏 | Skill | 1 | Rare | Draw 3 cards. They alternate Attack, then Skill, then Attack if possible. Exhaust. | T/G |
| B070 | 完美換拍 | Power | 3 | Rare | Every 轉拍 deals 2 direct damage to all enemies and grants 2 Block. | T/J |
| B071 | 交錯終章 | Attack | 2 | Rare | Deal 8 damage. Repeat once for each 轉拍 this turn, maximum 3 total hits. | T |
| B072 | 無縫連接 | Power | 2 | Rare | 轉拍 sequences no longer reset at the start of your turn. | T |
| B073 | 轉守為攻 | Skill | 1 | Uncommon | Gain 7 Block. 轉拍：your next Attack this turn costs 0. | T/J |
| B074 | 轉攻為守 | Attack | 1 | Uncommon | Deal 6 damage. 轉拍：your next Skill this turn costs 0. | T |
| B075 | 拍外之拍 | Skill | 0 | Rare | Choose Attack or Skill. Treat this card as that type for 轉拍. Draw 1 card. Exhaust. | T |
| B076 | 接住力道 | Skill | 1 | Common | Gain 7 Block. If you gain 勁 during the next enemy phase, draw 1 card next turn. | J |
| B077 | 化勁掌 | Attack | 1 | Common | Spend 1 勁. Deal 9 damage. Cannot be played without enough 勁. | J |
| B078 | 借力盾 | Skill | 1 | Common | Gain 5 Block plus 2 for each 勁 you have, maximum +6. | J |
| B079 | 穩穩接招 | Skill | 1 | Common | Gain 6 Block. If you have no 勁, gain 2 more. | J |
| B080 | 推手 | Attack | 1 | Common | Deal 4 damage. If you have 勁, spend 1 and apply 2 易傷. | J/V |
| B081 | 放鬆肩膀 | Skill | 0 | Common | Gain 1 勁. Lose 2 Block. Exhaust. | J |
| B082 | 借力打力 | Attack | 2 | Uncommon | Spend any amount of 勁. Deal 5 damage plus 3 per 勁 spent. | J |
| B083 | 沉腰坐馬 | Power | 1 | Uncommon | The first time each turn you gain Block, gain 1 additional Block for each 勁 you have, maximum +3. | J |
| B084 | 四兩撥千斤 | Skill | 1 | Uncommon | Spend 1 勁. Gain 12 Block. | J |
| B085 | 震腳回力 | Attack | 1 | Uncommon | Deal 5 damage. If you gained 勁 last enemy phase, deal 5 more. | J |
| B086 | 餘力不散 | Power | 1 | Uncommon | At the start of combat, gain 1 勁. Your 勁 cap becomes 12. | J |
| B087 | 引勁入拳 | Skill | 1 | Uncommon | Spend up to 3 勁. Your next Attack this turn deals 4 more per 勁 spent. | J |
| B088 | 引勁入盾 | Skill | 1 | Uncommon | Spend up to 3 勁. Gain 5 Block per 勁 spent. | J |
| B089 | 震波反擊 | Attack | 2 | Uncommon | Deal 6 damage to all enemies. Spend 1 勁 to deal 3 more to all enemies. | J |
| B090 | 不動如山 | Power | 2 | Uncommon | The first time each enemy phase an attack would break your Block, spend 1 勁 to gain 5 Block. | J |
| B091 | 聽勁 | Skill | 1 | Uncommon | Gain 8 Block. If the enemy intends to attack, Retain this card instead of discarding it. | J |
| B092 | 過肩回響 | Attack | 2 | Uncommon | Deal 8 damage. Spend 2 勁 to apply 3 易傷. | J/V |
| B093 | 勁走全身 | Power | 2 | Rare | Whenever you spend 勁, gain 2 Block and draw 1 card, once per card played. | J/T |
| B094 | 大化小 | Skill | 2 | Rare | Spend all 勁. Gain 8 Block per 勁 spent. | J |
| B095 | 小化大 | Attack | 2 | Rare | Spend all 勁. Deal 7 damage per 勁 spent to one enemy. | J |
| B096 | 太極圓轉 | Power | 3 | Rare | The first time each turn you spend 勁, regain that 勁 at the end of the turn. | J |
| B097 | 空手接招 | Skill | 0 | Rare | Gain 4 Block. If this fully blocks an enemy attack action, gain 2 勁 instead of 1. Exhaust. | J |
| B098 | 力從地起 | Skill | 1 | Common | Gain 1 勁. Exhaust. | J |
| B099 | 借勢前進 | Attack | 1 | Uncommon | Deal 4 damage. Spend 1 勁 to draw 2 cards. | J/T |
| B100 | 化勁護友 | Skill | 1 | Uncommon | Gain 6 Block. The next time you gain 勁, apply 1 易傷 to all enemies. | J/V |

### Ideas 101–150

| # | Name | Type | Cost | Seed rarity | Exact seed effect | Mechanics |
|---:|---|---|---:|---|---|---|
| B101 | 聽聲辨位 | Skill | 1 | Common | Draw 1 Attack. If it is a 基礎攻擊, it costs 0 this turn. | B/T |
| B102 | 破綻基本拳 | Attack | 1 | Common | Deal 3 damage. This is a 基礎攻擊. If the target has 易傷, deal 2 more. | V/B |
| B103 | 擋後直拳 | Attack | 1 | Common | Deal 4 damage. If you have Block, gain 3 Block. | T/J |
| B104 | 攻後架手 | Skill | 1 | Common | Gain 5 Block. If you dealt Attack damage this turn, gain 2 more. | T/J |
| B105 | 趁勢追身 | Attack | 1 | Common | Deal 5 damage. If you gained 勁 last enemy phase, apply 1 易傷. | J/V |
| B106 | 練功護體 | Skill | 1 | Common | Gain 4 Block plus 1 for each 練功, maximum +5. | B/J |
| B107 | 破綻換手 | Skill | 1 | Common | Apply 1 易傷. Your next 基礎攻擊 this turn costs 0. | V/B/T |
| B108 | 基本轉拍 | Attack | 1 | Common | Deal 3 damage. This is a 基礎攻擊. 轉拍：draw 1 card. | B/T |
| B109 | 化勁轉拍拳 | Attack | 1 | Common | Deal 4 damage. 轉拍：spend 1 勁 to deal 5 more. | T/J |
| B110 | 音牆反震 | Skill | 1 | Common | Gain 6 Block. If you gain 勁 next enemy phase, deal 3 direct damage to the attacker. | J |
| B111 | 護住破綻 | Skill | 1 | Uncommon | Gain 7 Block. If an enemy has 易傷, gain 1 勁. | V/J |
| B112 | 以柔克剛 | Attack | 1 | Uncommon | Deal 3 damage. Spend 1 勁; apply 1 易傷 and draw 1 card. | V/J/T |
| B113 | 以剛護柔 | Skill | 1 | Uncommon | Gain 4 Block. 轉拍：練功 1 this combat. Exhaust. | B/T/J |
| B114 | 反覆破綻 | Power | 1 | Uncommon | Whenever a 基礎攻擊 hits an enemy with 易傷, extend 易傷 by 1 once per card. | V/B |
| B115 | 聲波循環 | Power | 2 | Uncommon | The first time each turn you 轉拍 with a 基礎攻擊, return a Skill from discard to the draw pile. | B/T |
| B116 | 借勁練功 | Skill | 1 | Uncommon | Spend 2 勁. 練功 1. | B/J |
| B117 | 練功生勁 | Power | 2 | Uncommon | After you play 2 基礎攻擊s in one turn, gain 1 勁. | B/J/T |
| B118 | 點穴換拍 | Attack | 1 | Uncommon | Deal 4 damage. 轉拍：apply 1 易傷; if this is a 基礎攻擊, apply 1 more. | V/B/T |
| B119 | 圓轉基本式 | Skill | 1 | Uncommon | Gain 5 Block. Put a 基礎攻擊 from discard into your hand. It costs 0 this turn. | B/T/J |
| B120 | 勁貫破綻 | Attack | 2 | Uncommon | Deal 8 damage. Spend 1 勁 to double the target's 易傷 duration, maximum 9. | V/J |
| B121 | 連消帶打 | Attack | 2 | Uncommon | Gain 6 Block, then deal damage equal to Block lost to enemy attacks last phase, maximum 12. | J |
| B122 | 聽拍尋隙 | Skill | 1 | Uncommon | Draw 2 cards. If they have different types, apply 2 易傷. | V/T |
| B123 | 短橋連拳 | Attack | 1 | Uncommon | Deal 2 damage twice. 轉拍：each hit gains 練功 as bonus damage again. | B/T |
| B124 | 破綻借力 | Skill | 1 | Uncommon | Remove 2 易傷 from an enemy. Gain 2 勁. | V/J |
| B125 | 借力留隙 | Attack | 1 | Uncommon | Spend 1 勁. Deal 6 damage and apply 2 易傷. | V/J |
| B126 | 內外合拍 | Power | 2 | Uncommon | 轉拍 bonuses trigger twice while you have at least 3 勁. | T/J |
| B127 | 基本三才 | Power | 2 | Rare | Every third 基礎攻擊 played in combat costs 0, deals twice, and draws 1 card. | B/T |
| B128 | 無懈可擊 | Skill | 2 | Rare | Gain 14 Block. If you take no HP damage next enemy phase, 練功 2. Exhaust. | B/J |
| B129 | 聞聲即動 | Power | 1 | Rare | At the start of each turn, if any enemy intends to attack, draw 1 Skill; otherwise draw 1 Attack. | T/J |
| B130 | 破綻滿盈 | Power | 2 | Rare | 易傷 no longer decreases on enemies you damaged with a 基礎攻擊 this turn. | V/B |
| B131 | 剛柔並濟 | Power | 2 | Rare | Whenever you 轉拍, alternate between 練功 1 and gaining 1 勁. | B/T/J |
| B132 | 一氣呵成 | Attack | 3 | Rare | Deal 6 damage four times. Costs 1 less for each 轉拍 this turn. | T/B |
| B133 | 以一化九 | Skill | 2 | Rare | Spend 1 勁. Set one enemy's 易傷 to 9. Exhaust. | V/J |
| B134 | 九勁歸一 | Attack | 3 | Rare | Spend 9 勁. Deal 99 damage. Cannot be played without enough 勁. Exhaust. | J |
| B135 | 基本即奧義 | Power | 3 | Rare | 基礎攻擊s also trigger 轉拍 when following another 基礎攻擊. | B/T |
| B136 | 聲震百穴 | Attack | X | Rare | Spend all Energy. Deal 2 damage X times to all enemies. Spend up to X 勁; add one hit per 勁 spent. | J/B |
| B137 | 不攻而攻 | Skill | 2 | Rare | Gain 10 Block. At the end of the enemy phase, deal damage equal to the Block this card lost. Exhaust. | J |
| B138 | 不守而守 | Attack | 2 | Rare | Deal 10 damage. At the end of the turn, gain Block equal to unblocked damage dealt by this card. | T/J |
| B139 | 萬流歸宗 | Skill | 2 | Rare | Exhaust one Attack and one Skill from your hand. Create an upgraded 基礎攻擊 that combines their numeric effects. Exhaust. | B/T/G |
| B140 | 破綻大師 | Power | 3 | Rare | Whenever you apply 易傷 to an enemy that already has 易傷, gain 1 勁 and draw 1 card. | V/J/T |
| B141 | 起手探路 | Attack | 0 | Common | Innate. Deal 1 damage. Apply 1 易傷. Exhaust. | V |
| B142 | 收尾定式 | Attack | 2 | Common | Deal 8 damage. If this is the last playable card in your hand, deal 4 more. | T |
| B143 | 靜心架 | Skill | 1 | Common | Gain 5 Block. Retain one random 基礎攻擊 in your hand. | B/J |
| B144 | 震聲喝止 | Skill | 1 | Uncommon | Apply 2 Weak. If the enemy has 易傷, apply 1 more Weak. | V/G |
| B145 | 鐵布衫 | Power | 1 | Uncommon | Whenever a 基礎攻擊 is drawn, gain 1 Block. | B/J |
| B146 | 聽風步 | Skill | 1 | Uncommon | Gain 4 Block. The next time you would gain 勁, draw 2 cards. | J/T |
| B147 | 破綻連鎖 | Attack | 2 | Uncommon | Deal 6 damage to all enemies. For each enemy with 易傷, apply 1 易傷 to every other enemy. | V |
| B148 | 拳譜校正 | Skill | 1 | Uncommon | Choose a 基礎攻擊 in hand. Permanently increase its damage by 2 for this combat. Draw 1 card. | B/T |
| B149 | 後發先至 | Attack | 2 | Rare | Retain. Deal 7 damage plus 4 for each 勁 gained since this entered your hand. | J |
| B150 | 共鳴大周天 | Power | 3 | Rare | The first time each turn you apply 易傷, 練功, 轉拍, and spend 勁, gain 1 Energy and draw 1 card for each different event. | V/B/T/J |

## Step 3 — First cull: the butcher phase

Exactly 75 concepts survive. A survivor must either solve a necessary combat
problem, create a build decision, or materially change the value of another
card. Novel wording alone is not enough.

### Survivor IDs after the first cull

`B001–B014`, `B016`, `B017`, `B020–B022`, `B024`, `B028`, `B030–B032`,
`B034–B037`, `B040–B042`, `B045`, `B049`, `B051–B053`, `B055`, `B059–B063`,
`B070`, `B071`, `B076–B078`, `B080`, `B082`, `B084`, `B085`, `B087`,
`B089`, `B090`, `B093`, `B102`, `B107`, `B108`, `B113–B115`, `B119`,
`B120`, `B122–B124`, `B127–B132`, `B140`, `B149`, `B150`.

### Rejected ideas

| ID | Verdict | Why it was cut |
|---|---|---|
| B015 | Cut | A second dedicated 易傷 Skill loses to the cleaner B004/B014 setup options. |
| B018 | Cut | Zero-cost 易傷 is efficient but creates no sequencing or deck-building decision. |
| B019 | Cut | Automatic highest-HP targeting is awkward on touch and less interesting than choosing a target. |
| B023 | Cut | Pure all-enemy 易傷 is too close to B017 without the tension of damage versus setup. |
| B025 | Cut | Automatic damage on duration decay makes 易傷 valuable without attacking and muddies its core promise. |
| B026 | Cut | The discount threshold is a blunt win-more check and overlaps B020's burst role. |
| B027 | Cut | Doubling duration pushes too quickly to the cap and makes incremental applications irrelevant. |
| B029 | Cut | Attack tutoring plus 易傷 solves both halves of its own combo too cleanly. |
| B033 | Cut | Self-looping a basic Attack creates repetitive turns and undesirable shuffle edge cases. |
| B038 | Cut | Conditional plain Block is serviceable but does not make another card more interesting. |
| B039 | Cut | A flat once-per-turn basic bonus is a weaker, less interactive version of 練功. |
| B043 | Cut | Temporary upgrading introduces a second enhancement vocabulary beside 練功. |
| B044 | Cut | Automatic tutoring every turn removes draw-order adaptation and overfeeds basic engines. |
| B046 | Cut | Exhausting every non-Basic card punishes hybrid decks and tries to make a sealed archetype. |
| B047 | Cut | Self-growing damage is a solo scaling card that needs no other mechanic. |
| B048 | Cut | Passive Block on every basic Attack erases the intended attack-versus-defense choice. |
| B050 | Cut | B037 and B119 offer cleaner, more immediate basic-card recursion. |
| B054 | Cut | Generic conditional damage is dominated by more connective 轉拍 payoffs. |
| B056 | Cut | Conditional plain Block duplicates B052 without its attack/defense bridge. |
| B057 | Cut | A zero-cost Attack buff is functional but too generic to earn pool space. |
| B058 | Cut | The mirrored version of B057 adds redundancy rather than a new decision. |
| B064 | Cut | Conditional Retain requires too much text for a modest smoothing effect. |
| B065 | Cut | Discounted area damage is useful but B071 is the more expressive 轉拍 finisher. |
| B066 | Cut | A narrow delayed basic bonus is less legible than the direct hybrid B115. |
| B067 | Cut | B107 and B118 connect 易傷 to sequencing with stronger downstream choices. |
| B068 | Cut | Direct 勁 generation on an already-solid Block card bypasses the full-block challenge too cheaply. |
| B069 | Cut | Type-arranged drawing requires complex pile search and effectively scripts the combo. |
| B072 | Cut | Carrying 轉拍 across turns destroys its clear per-turn rhythm and makes state hard to read. |
| B073 | Cut | Zero-cost Attack setup risks deterministic chains and overlaps B053's Energy role. |
| B074 | Cut | The mirrored cost cheat is redundant and disproportionately favors expensive Skills. |
| B075 | Cut | A modal type-only card is mechanically clever but physically meaningless to a child. |
| B079 | Cut | Bonus Block for having no 勁 rewards failing to engage with the signature resource. |
| B081 | Cut | Losing existing Block for direct 勁 is confusing and can be unusable when drawn. |
| B083 | Cut | Scaling Block directly from stored 勁 encourages hoarding instead of spending. |
| B086 | Cut | Raising the resource cap is administrative rather than a satisfying build-around. |
| B088 | Cut | Pure Block-per-resource is eclipsed by the more decisive B084. |
| B091 | Cut | Intent-based Retain can create indefinite hand clog and does not actually use 勁. |
| B092 | Cut | A costly 易傷 spender overlaps the cleaner B120 and B125 hybrids. |
| B094 | Cut | Spending the entire resource for Block is too close to B084 and creates extreme overblocking. |
| B095 | Cut | The all-resource damage dump competes with the more readable variable spender B082. |
| B096 | Cut | Refunding spent 勁 largely deletes the resource constraint and invites loops. |
| B097 | Cut | A zero-cost double-gain full-block tool is swingy and hard to communicate before the enemy acts. |
| B098 | Cut | Direct one-card 勁 generation bypasses the character's defensive test with no compensating decision. |
| B099 | Cut | Resource-for-draw is subsumed by B093's engine and B149's retained payoff. |
| B100 | Cut | A delayed global 易傷 trigger has excessive tracking for a modest payoff. |
| B101 | Cut | Tutoring and discounting the exact desired subtype makes the card an overly complete engine piece. |
| B103 | Cut | “Have Block” is a nearly automatic condition and does not test 轉拍 or 化勁. |
| B104 | Cut | This duplicates B052 with a looser and less thematic condition. |
| B105 | Cut | The last-phase memory adds tracking for only one 易傷. |
| B106 | Cut | Block scaling from 練功 makes the same stat solve offense and defense too directly. |
| B109 | Cut | A conditional mandatory spend is clumsier than B077 and B085. |
| B110 | Cut | Delayed retaliation is a weak solo payoff and requires remembering its source card. |
| B111 | Cut | 易傷-to-勁 generation bypasses the defense identity and makes the two mechanics interchangeable. |
| B112 | Cut | Damage, spend, 易傷, and draw make one cheap card solve too many engine needs. |
| B116 | Cut | Permanent scaling purchased with two 勁 encourages repetitive conversion rather than varied spending. |
| B117 | Cut | Generating 勁 from Attacks undercuts the rule that it represents successfully received force. |
| B118 | Cut | Its three-way conditional wording is less elegant than B108 and B114. |
| B121 | Cut | Remembering exact Block lost in the prior enemy phase creates invisible accounting. |
| B125 | Cut | It is a straightforward stronger B080 with less conditional texture. |
| B126 | Cut | Doubling every 轉拍 bonus multiplies balance problems across the entire pool. |
| B133 | Cut | Setting 易傷 directly to 9 invalidates incremental applications and duration management. |
| B134 | Cut | The 99-damage joke creates one obvious hoarding objective and crowds out normal spenders. |
| B135 | Cut | Making consecutive Attacks count as alternation erases the mechanic's identity. |
| B136 | Cut | X-cost area multi-hit plus resource conversion has too many scaling axes for one card. |
| B137 | Cut | Delayed Block-loss damage needs hidden per-card accounting and overlaps the 化勁 fantasy. |
| B138 | Cut | Delayed Block equal to unblocked damage is volatile and encourages ignoring enemy intent. |
| B139 | Cut | Dynamically combining arbitrary numeric effects is not feasible within deterministic card text and UI. |
| B141 | Cut | Innate free 易傷 makes every opening too similar and weakens setup choices. |
| B142 | Cut | “Last playable card” is fiddly with casting failure and unrelated to the signatures. |
| B143 | Cut | Random Retain removes agency and only loosely interacts with basic attacks. |
| B144 | Cut | Weak is useful but this version dilutes the four-mechanic foundation. |
| B145 | Cut | Passive Block on draw creates low-agency value and favors oversized decks strangely. |
| B146 | Cut | A delayed draw rider is hard to attribute and dominated by B093. |
| B147 | Cut | Cross-spreading duration in multi-enemy combat is explosive and visually difficult to audit. |
| B148 | Cut | Per-card combat damage editing duplicates 練功 with extra instance bookkeeping. |

## Step 4 — Three directions

The directions are overlapping lenses, not sealed archetypes:

1. **聽隙爆發 (V + T):** alternate setup and attacks, keep an 易傷 window open,
   then turn a precisely ordered turn into burst.
2. **百鍊連環 (B + T):** keep basic attacks relevant through 練功, recursion,
   multi-hit scaling, and attack/Skill alternation.
3. **聽勁反擊 (J + V):** fully answer enemy intents, bank 勁, then convert it
   into efficient defense, 易傷 setup, or a decisive counterattack.

Pure staples are marked `三向通用`. A hybrid must contribute meaningful rules
text to both named directions; merely being playable in either is not enough.

| Direction | Assigned survivors |
|---|---|
| 聽隙爆發 | B003, B004, B013, B014, B016, B017, B020, B021, B022, B024, B030, B055 |
| 百鍊連環 | B001, B008, B012, B031, B032, B034, B035, B036, B037, B040, B041, B042, B045, B049, B127 |
| 聽勁反擊 | B002, B007, B076, B077, B078, B080, B082, B084, B085, B087, B089, B090, B093, B149 |
| 聽隙 × 百鍊 | B053, B059, B060, B061, B062, B063, B071, B102, B107, B108, B114, B115, B122, B123, B130, B132 |
| 聽隙 × 聽勁 | B011, B028, B051, B052, B070, B120, B124, B129, B140 |
| 百鍊 × 聽勁 | B113, B119, B128 |
| 三向 hybrid | B131, B150 |
| 三向通用 | B005, B006, B009, B010 |

## Step 5 — Role assignment

Every survivor has one primary job. “Build-around” is reserved for cards that
can change drafting priorities; “Glue” must connect at least two signatures.

| ID | Primary role | Reason for the role |
|---|---|---|
| B001 | Front-load damage | Establishes the intentionally weak basic Attack floor. |
| B002 | Front-load defense | Establishes the basic Block floor and enables early full blocks. |
| B003 | Glue | Teaches damage followed by 易傷 setup in the starter. |
| B004 | Glue | Provides cheap 易傷 access without consuming a full defensive turn. |
| B005 | Front-load damage | Gives every deck a dependable early single-target upgrade. |
| B006 | Front-load damage | Supplies the required Common area answer. |
| B007 | Front-load defense | Sets the efficient Common defensive ceiling. |
| B008 | Front-load damage | Provides an early multi-hit carrier for 練功. |
| B009 | Engine piece | Converts Energy into hand velocity. |
| B010 | Engine piece | Provides one-use Energy smoothing for combo turns. |
| B011 | Staple | Combines modest defense and draw without demanding a package. |
| B012 | Scaling piece | Is the simplest persistent basic-attack scaler. |
| B013 | Situational tech | Turns an existing 易傷 window into a free cycling action. |
| B014 | Staple | Remains useful as damage whether or not setup is already present. |
| B016 | Front-load damage | Pays off 易傷 with immediate, bounded efficiency. |
| B017 | Front-load damage | Covers area damage while opening future 易傷 lines. |
| B020 | Build-around | Makes dense 易傷 access worth drafting for a double strike. |
| B021 | Situational tech | Converts excess duration into immediate lethal damage. |
| B022 | Situational tech | Preserves setup when target priority changes. |
| B024 | Engine piece | Turns repeated 易傷 application into draw. |
| B028 | Front-load defense | Converts multi-target 易傷 coverage into immediate survival. |
| B030 | Scaling piece | Repeatedly improves the action economy of 易傷 turns. |
| B031 | Scaling piece | Offers the simplest one-use 練功 increase. |
| B032 | Engine piece | Finds the subtype on which 百鍊 engines depend. |
| B034 | Staple | Lets a basic Attack help cover an incoming intent. |
| B035 | Front-load damage | Adds a second clean multi-hit basic carrier. |
| B036 | Front-load damage | Gives 百鍊 decks a scalable area card. |
| B037 | Engine piece | Recovers a chosen basic Attack for another sequence. |
| B040 | Scaling piece | Rewards repeated basics without granting value automatically. |
| B041 | Glue | Lets an otherwise useful Attack enter the basic package. |
| B042 | Build-around | Turns total basic-card density into a capped multi-hit payoff. |
| B045 | Scaling piece | Makes repeated successful basic hits grow their own future copies. |
| B049 | Engine piece | Enables one explosive basic-attack turn at a one-use cost. |
| B051 | Glue | An Attack that helps answer an intent only when properly sequenced. |
| B052 | Glue | A Skill that answers the opposing half of the same sequence. |
| B053 | Engine piece | Converts alternation into Energy-neutral draw. |
| B055 | Glue | Connects multi-hit, 轉拍, and 易傷 setup. |
| B059 | Engine piece | Makes the first alternation each turn replace itself. |
| B060 | Engine piece | Rewards reaching a second alternation with Energy. |
| B061 | Scaling piece | Converts the turn's prior sequencing into per-hit growth. |
| B062 | Situational tech | Repairs one broken sequence at the cost of a card and Exhaust. |
| B063 | Engine piece | Offers strong draw only when the sequence is maintained. |
| B070 | Scaling piece | Makes repeated alternation supply offense and defense over time. |
| B071 | Build-around | Converts a high-轉拍 turn into the direction's main finisher. |
| B076 | Glue | Links immediate defense to next-turn hand quality after a full block. |
| B077 | Front-load damage | Establishes the simplest fixed-price 勁 payoff. |
| B078 | Front-load defense | Makes stored 勁 improve defense without consuming it. |
| B080 | Glue | Turns earned force into an 易傷 window. |
| B082 | Build-around | Is the primary variable 勁 damage outlet. |
| B084 | Front-load defense | Provides an emergency, efficient defensive spend. |
| B085 | Front-load damage | Pays off the previous successful defensive turn without spending. |
| B087 | Engine piece | Converts a chosen amount of 勁 into a planned burst turn. |
| B089 | Front-load damage | Gives the resource direction a scalable area answer. |
| B090 | Scaling piece | Uses stored 勁 as insurance against Block breaking. |
| B093 | Engine piece | Makes varied 勁 spenders chain with Block and draw. |
| B102 | Glue | Makes an 易傷 payoff also improve with 練功. |
| B107 | Glue | Connects 易傷 setup, basic attacks, and sequencing. |
| B108 | Glue | Lets a basic Attack continue a 轉拍 engine. |
| B113 | Glue | Turns a correctly sequenced defensive card into long-combat training. |
| B114 | Scaling piece | Lets basic hits maintain, rather than merely consume, an 易傷 plan. |
| B115 | Engine piece | Recurs Skills when a basic Attack completes the correct sequence. |
| B119 | Engine piece | Recovers and discounts a basic Attack behind a defensive action. |
| B120 | Glue | Converts earned 勁 into longer 易傷 access. |
| B122 | Glue | Rewards a mixed hand with setup rather than raw value. |
| B123 | Scaling piece | Multiplies 練功 only after a successful alternation. |
| B124 | Situational tech | Exchanges excess 易傷 duration for scarce 勁. |
| B127 | Build-around | Creates a visible every-third-basic engine objective. |
| B128 | Scaling piece | Converts a successful full-block turn into major 練功. |
| B129 | Engine piece | Uses enemy intent to fetch the appropriate half of a sequence. |
| B130 | Scaling piece | Allows basic attacks to preserve a hard-earned 易傷 window. |
| B131 | Scaling piece | Alternates between the two persistent growth resources. |
| B132 | Build-around | Is the major payoff for constructing a multi-轉拍 turn. |
| B140 | Engine piece | Rewards repeated 易傷 setup with both 勁 and draw. |
| B149 | Scaling piece | Turns Retain and future full blocks into a growing counterattack. |
| B150 | Build-around | Rewards touching all four signatures in one turn without requiring it. |

## Step 6 — Numbers and iteration loop

### Simulation method and limits

`scripts/simulate-resonance-pool.mjs` runs deterministic seeded proxy drafts.
Each simulated run starts with the 10-card starter, sees fifteen three-card
offers, drafts with a noisy value-and-synergy policy, and is scored against
normal, swarm, and boss pressure profiles. For every card it records:

- pick rate when offered;
- win rate of simulated decks containing it;
- average damage taken by simulated decks containing it.

This is useful for relative outliers and package starvation. It is **not human
telemetry**, does not model casting mistakes or every timing rule, and cannot
prove that a card feels good. Human cast-on and debug-skip playtests remain a
release gate.

### Loop 1 — seed values

80,000 seeded runs produced a pool-average **33.0% pick rate**, **79.9% proxy
win rate**, and **18.57 damage taken**. Important outliers:

| Card | Pick | Containing-deck win | Damage taken | Response |
|---|---:|---:|---:|---|
| 四兩撥千斤 | 98.4% | 82.6% | 16.30 | Reduce 12 Block to 10. |
| 化勁掌 | 92.7% | 82.5% | 18.51 | Reduce 9 damage to 8. |
| 無懈可擊 | 92.4% | 85.4% | 16.26 | Reduce 14 Block/練功 2 to 12 Block/練功 1. |
| 共鳴大周天 | 94.7% | 82.6% | 18.28 | Bound to one payoff per turn, then send to final-cull review. |
| 倒拍 | 0.0% | sample too small | 25.69 | Add draw 1 so sequence repair does not cost hand size. |
| 溫習 | 0.0% | sample too small | 17.65 | Make the returned basic Attack cost 0 that turn. |
| 一瞬勝機 | 0.4% | 72.9% | 19.73 | Reduce Power cost from 2 to 1. |
| 千錘百鍊 | 0.4% | 77.6% | 19.36 | Reduce cost to 2, then send its ambiguous instance growth to final-cull review. |

The evaluator was also changed to value authored Engine, Glue, and Scaling roles
instead of treating only printed damage and Block as real.

### Loop 2 — adjusted values

Another 80,000 runs produced **33.8% average pick**, **72.1% proxy win**, and
**18.75 damage taken** under the stricter mixed-deck policy. The remaining
extremes were informative rather than automatically actionable:

- Resource spenders remained popular because they turn prior defensive work
  into immediate tempo; this is intended, but their fixed rates stay bounded.
- Rare build-arounds with no printed damage remained low-pick in the proxy.
  They survive only when their interaction graph justifies a human test.
- `共鳴大周天` still reached 100% pick when offered despite its narrow trigger.
  A card that is simultaneously dead without four pieces and irresistible with
  them is not healthy glue; it is removed in Step 8.
- `破綻滿盈` and `反覆破綻` produced the same strategic outcome—indefinite
  易傷 through basic attacks. Only the more active, per-hit version survives.

### Value changes locked after iteration

- `日光音波`: remains 3 area damage at Common; it is an early answer, not a
  late scaling card.
- `掃堂基本式`: increases from 4 to 5 area damage.
- `借來破綻`: adds 5 Block so the narrow multi-enemy transfer is not a dead draw.
- `一攻一守`: its second 轉拍 also grants 3 Block.
- `變拍連環`: counts the 轉拍 caused by itself.
- `完美換拍`: triggers at most three times per turn.
- `借力盾`: its stored-勁 bonus is capped at +4 Block.
- `推手`: applies only 1 易傷 when it automatically spends 勁.
- `聽拍尋隙`: applies 1 易傷, not 2.
- `基本三才`: repeats only the third basic Attack's damage and draws once; it
  no longer retroactively changes that card's Energy cost.
- `共鳴大周天`, `千錘百鍊`, and `破綻滿盈` proceed to the final cull.

### Loop 3 — authoritative final roster

After the final replacements, semantic tutor/recursion valuation, and another
rate pass, 100,000 runs produced **36.6% average pick**, **63.0% proxy win**, and
**19.57 damage taken**.

- `四兩撥千斤` fell from 98.4% to 80.6% pick after Block dropped to 9 and
  the simulator modeled its “cannot play without 勁” gate.
- `化勁掌` fell from 92.7% to 74.1% after damage dropped to 8 and the same gate
  was modeled.
- `一氣呵成` remained high at 90.6%, so its base hit fell from 6×4 to 5×4.
  It remains a watch-list Rare because its real constraint is sequencing and
  successful casting, which this proxy only approximates.
- `以剛護柔` remained efficient, so its Block fell from 4 to 3 while its
  one-use conditional 練功 payoff stayed intact.
- Low proxy picks such as `反覆破綻`, `破綻借力`, and `空手接招` are conditional
  engines or tech rather than raw-rate cards. They are not buffed from bot data
  alone; each requires targeted human drafts before release.

This is the stopping point for synthetic tuning. Further number changes without
cast-on human games would optimize the evaluator rather than the character.

## Step 7 — Synergy and Rube Goldberg audit

The following chains were retained or strengthened because each card changes
how the next reward is evaluated:

1. **弱點標記 → 換拍抽氣 → 交錯終章:** setup Attack, Energy-neutral Skill,
   then a second 轉拍 turns the finisher into multiple hits.
2. **聲波架式 → 雙聲拳 → 反覆破綻:** 練功 multiplies both hits; those hits
   maintain the 易傷 window instead of merely consuming it.
3. **拆招重練 → 基本功夫 → 變拍連環:** convert a strong Attack into a basic,
   discount the package, then let prior alternation scale every hit.
4. **接住力道 → full block → 推手 → 破口追擊:** defense earns 勁, 勁 opens
   an 易傷 window, and the Rare Attack cashes it out.
5. **破綻借力 → 引勁入拳 → 一氣呵成:** excess 易傷 becomes 勁; the resource
   amplifies a finisher whose cost was reduced by earlier 轉拍.
6. **勁走全身 → 四兩撥千斤 → 化勁掌:** different resource spends provide
   Block, draw, emergency defense, and damage rather than one repeated outlet.
7. **聞聲即動 → 攻守換拍／守攻換拍:** enemy intent tutors the half of the
   alternating sequence that the current hand is likely missing.
8. **圓轉基本式 → 基本轉拍 → 短橋連拳:** defense recovers a free basic,
   that basic draws through 轉拍, and the next multi-hit receives 練功 twice.
9. **反覆破綻 → 破綻借力 → 勁貫破綻:** maintain duration with basics, convert
   only the excess into 勁, then reinvest it to rebuild a larger window.
10. **剛柔並濟 → 轉拍化勁 cards → 勁走全身:** precise alternation supplies
    both persistent training and spendable defense tempo, enabling hybrid decks
    without making either pure direction obsolete.

Audit conclusion: every final build-around has at least three lower-rarity
partners, every direction has front-load, defense, draw/energy, area access, and
long-fight scaling, and no direction requires a single named Rare to function.

## Step 8 — Final cull and polish

### Final cuts

| Removed | Final reason |
|---|---|
| B045 千錘百鍊 | “It gains damage” is ambiguous across physical copies and produces unbounded self-scaling already covered by 練功. |
| B130 破綻滿盈 | It is strategically redundant with the more active B114 反覆破綻. |
| B150 共鳴大周天 | It scripts a four-box checklist, is dead before assembly, and remained an automatic proxy pick after assembly. |

### Replacements promoted from the reserve

| Added | Why it now earns the slot |
|---|---|
| B065 迴旋換拍 | Fills the missing uncommon area role for 轉拍 decks with a simple sequencing discount. |
| B097 空手接招 | Bootstraps an empty 勁 engine without replacing the full-block requirement on later gains. |
| B144 震聲喝止 | Adds situational attack mitigation whose bonus defense depends on prior 易傷 setup. |

### Final rarity contract

| Rarity | Count |
|---|---:|
| Basic | 3 |
| Common | 20 |
| Uncommon | 35 |
| Rare | 17 |
| **Total** | **75** |

### Final starter

The starter stays at ten physical cards and three designs:

- 5× `B001 音波擊`
- 4× `B002 音波盾`
- 1× `B003 破綻震`

It teaches attack, Block, and 易傷 without requiring a rules glossary. Full
blocks demonstrate the 勁 animation, but 轉拍 labels and spend decisions enter
through rewards. The first reward pool must always include at least one simple
front-load card and may not offer three Powers or three resource spenders
together.

## Playbook refinement loop — interaction debt and observability

The first 75-card result was re-audited with
[DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md). This pass did not reopen the
foundation; it targeted redundant effects, repeated touch modals, invisible
memory, and cards that weakened the identity of 化勁.

### Static findings

- `B008` and `B035` had identical cost, type, tags, and effect. One had to die.
- `B022` required selecting two enemies for a narrow transfer effect.
- `B062` repaired 轉拍 by declaring that identical card types counted as an
  alternation, weakening the mechanic it was meant to support.
- `B082` and `B087` both asked for repeated variable 勁 selectors. Fixed or
  bounded automatic spends preserve the timing decision without repeated UI.
- `B097` was a low-agency Power that only mattered when the resource counter was
  empty; it did not make the full-block moment more satisfying.
- `B127` and `B149` required separate card-specific counters across turns.
- `B140` generated 勁 by layering 易傷, bypassing the promise that 勁 comes from
  successfully receiving enemy force.
- The roster had 32 Attacks, 27 Skills, and 16 Powers. Replacing one duplicate
  Attack and one passive Power with defensive Skills improves intent response
  without flattening the offensive directions.

### Refinements

| Old design | Revised design | Reason |
|---|---|---|
| B035 雙聲拳 | B038 基本防線 | Removes an exact duplicate and adds low-rarity basic/defense glue. |
| B022 借來破綻 | B019 回身標記 | Replaces a two-enemy selector with one target and an immediate defensive floor. |
| B062 倒拍 | B064 接續姿勢 | Supports a natural Attack→Skill→Attack chain instead of suspending the 轉拍 rule. |
| B097 空手接招 Power | B097 空手接招 Skill | Makes the extra 勁 visibly belong to a one-turn full-block challenge. |
| B140 破綻大師 | B100 化勁留隙 | Restores the direction of causality: full blocking creates 勁 and the next opening. |
| Variable B082/B087 spends | Bounded automatic/fixed spends | Removes two routine resource sliders while preserving when-to-cash-out mastery. |
| B127 combat-wide counter | Per-turn second-basic trigger | Reuses the visible turn cadence instead of bespoke persistent memory. |
| B149 per-card accumulated counter | Previous-enemy-phase check | Reuses the existing “gained 勁 last phase” badge shared by other cards. |

The revised type mix is **31 Attacks, 29 Skills, and 15 Powers**. The rarity
contract remains 3/20/35/17 and the total remains 75.

### Equal-cohort proxy pass

The revised simulator ran **160,000** seeded drafts, split evenly between bots
biased toward 聽隙爆發, 百鍊連環, 聽勁反擊, and unrestricted hybrid picks.
This fixes the earlier mistake of classifying cohorts after drafting from a
starter already weighted toward 基礎攻擊 and Block.

| Cohort | Runs | Proxy win | Average damage taken |
|---|---:|---:|---:|
| 聽隙爆發 | 40,000 | 64.5% | 18.77 |
| 百鍊連環 | 40,000 | 62.4% | 18.41 |
| 聽勁反擊 | 40,000 | 67.8% | 17.72 |
| Hybrid | 40,000 | 66.4% | 18.22 |

The 5.4-point spread is acceptable as a synthetic watch list, not a balance
verdict. 聽勁's lower damage taken is partly definitional because the evaluator
rewards Block-heavy drafts. `B019` fell from 6 to 4 Block and `B120` from
8 damage/apply 3 易傷 to 7/apply 2 after remaining rate outliers. The static
audit now reports 75 unique cards, the intended rarity split, the revised type
mix, and **no duplicate exact effects**.

The next evidence must be turn-level and human. Further tuning from this offer
proxy would optimize its heuristic rather than prove preschool play quality.

## Final 75-card pool

This is the authoritative post-cull catalog. “Why survived” is intentionally
one sentence per card.

| ID | Name | Type | Cost | Exact effect text | Rarity | Mechanics | Direction | Why it survived |
|---|---|---|---:|---|---|---|---|---|
| B001 | 音波擊 | Attack | 1 | Deal 3 damage. This is a 基礎攻擊. | Basic | B | 百鍊 | It is the deliberately weak training baseline. |
| B002 | 音波盾 | Skill | 1 | Gain 4 Block. | Basic | J | 聽勁 | It teaches the defensive floor and can produce the first full block. |
| B003 | 破綻震 | Attack | 2 | Deal 5 damage. Apply 2 易傷. | Basic | V | 聽隙 | It makes the starter's setup-then-strike lesson immediately visible. |
| B004 | 弱點標記 | Attack | 1 | Deal 2 damage. Apply 2 易傷. | Common | V | 聽隙 | It is the cheapest repeatable setup Attack without being efficient damage. |
| B005 | 響亮一擊 | Attack | 1 | Deal 6 damage. | Common | V | 三向通用 | Every deck needs a dependable early damage upgrade that benefits from 易傷. |
| B006 | 日光音波 | Attack | 1 | Deal 3 damage to all enemies. | Common | V | 三向通用 | It is the clean Common answer to early multi-enemy fights. |
| B007 | 厚實音牆 | Skill | 1 | Gain 7 Block. | Common | J | 聽勁 | It sets a reliable full-block tool and the Common defensive ceiling. |
| B008 | 雙拍連擊 | Attack | 1 | Deal 2 damage twice. This is a 基礎攻擊. | Common | B | 百鍊 | It gives 練功 an early multi-hit carrier. |
| B009 | 翻譜 | Skill | 1 | Draw 2 cards. | Common | T | 三向通用 | It supplies transparent hand velocity and a Skill half for 轉拍. |
| B010 | 深呼吸 | Skill | 0 | Gain 1 Energy. Exhaust. | Common | T | 三向通用 | It enables one explosive sequence without creating a repeatable Energy loop. |
| B011 | 邊擋邊唱 | Skill | 1 | Gain 3 Block. Draw 1 card. | Common | T/J | 聽隙 × 聽勁 | It is broad glue that advances a sequence while covering part of an intent. |
| B013 | 試探拳 | Attack | 0 | Deal 2 damage. If the target has 易傷, draw 1 card. Exhaust. | Common | V/T | 聽隙 | It rewards an existing window with one-use card-neutral tempo. |
| B014 | 開窗掌 | Attack | 1 | Deal 4 damage. If the target has no 易傷, apply 1 易傷. | Common | V | 聽隙 | It is never dead but is deliberately less efficient than specialized setup. |
| B016 | 趁隙直拳 | Attack | 1 | Deal 4 damage. If the target has 易傷, deal 3 more damage. | Common | V | 聽隙 | It provides a bounded Common payoff for learning the setup order. |
| B017 | 掃堂尋隙 | Attack | 2 | Deal 5 damage to all enemies. Apply 1 易傷 to each enemy that had none. | Common | V | 聽隙 | It combines required area coverage with future target-priority decisions. |
| B031 | 練拳 | Skill | 1 | 練功 1. Exhaust. | Common | B | 百鍊 | It is the smallest explicit investment in the basic-attack plan. |
| B032 | 基本步 | Skill | 0 | Put a random 基礎攻擊 from your draw pile into your hand. Exhaust. | Common | B/T | 百鍊 | It provides bounded subtype access without a repeatable tutor loop. |
| B034 | 低樁拳 | Attack | 1 | Deal 4 damage. Gain 2 Block. This is a 基礎攻擊. | Common | B/J | 百鍊 | It lets training decks improve defense without erasing the Attack/Skill distinction. |
| B038 | 基本防線 | Skill | 1 | Gain 5 Block. If you played a 基礎攻擊 this turn, gain 2 more Block. | Common | B/T/J | 百鍊 × 聽勁 | It removes an exact duplicate Attack and rewards the natural basic-Attack-to-Skill cadence. |
| B036 | 掃堂基本式 | Attack | 2 | Deal 5 damage to all enemies. This is a 基礎攻擊. | Common | B | 百鍊 | It gives the basic direction an area card that scales but starts inefficiently. |
| B037 | 溫習 | Skill | 1 | Return a 基礎攻擊 from your discard pile to your hand. It costs 0 this turn. | Common | B/T | 百鍊 | It turns a known discarded basic into a deliberate sequence piece. |
| B051 | 攻守換拍 | Attack | 1 | Deal 4 damage. 轉拍：gain 3 Block. | Common | T/J | 聽隙 × 聽勁 | It is the simplest Attack-side lesson for alternation. |
| B052 | 守攻換拍 | Skill | 1 | Gain 5 Block. 轉拍：deal 3 direct damage to the selected enemy. | Common | T/J | 聽隙 × 聽勁 | It is the mirrored Skill-side lesson without becoming an Attack. |
| B020 | 破口追擊 | Attack | 2 | Deal 7 damage. If the target has 易傷, deal 7 damage again. | Rare | V | 聽隙 | It is a dramatic but setup-dependent burst reward. |
| B021 | 收束震 | Attack | 1 | Deal 3 damage. Remove all 易傷 from the target, then deal 2 direct damage per duration removed. | Uncommon | V | 聽隙 | It creates a real choice between future amplification and immediate lethal damage. |
| B019 | 回身標記 | Skill | 1 | Gain 4 Block. Apply 1 易傷 to the selected enemy. | Uncommon | V/J | 聽隙 × 聽勁 | It provides a modest standalone defense floor and setup through one ordinary enemy target instead of a two-target transfer modal. |
| B024 | 破綻回聲 | Power | 1 | The first time each turn you apply 易傷, draw 1 card. | Uncommon | V/T | 聽隙 | It turns recurring setup into a sustainable engine without triggering repeatedly. |
| B028 | 破綻護身 | Skill | 1 | Gain 4 Block plus 2 for each living enemy with 易傷. | Uncommon | V/J | 聽隙 × 聽勁 | It makes spreading setup immediately valuable on a defensive turn. |
| B030 | 一瞬勝機 | Power | 1 | The first time each turn you successfully play an Attack against an enemy with 易傷, gain 1 Energy. | Rare | V/T | 聽隙 | It rewards maintaining a window with repeatable but once-per-turn tempo. |
| B012 | 聲波架式 | Power | 1 | 練功 2. | Uncommon | B | 百鍊 | It is the cleanest persistent identity anchor for basic attacks. |
| B040 | 熟能生巧 | Power | 2 | After you play 3 基礎攻擊s, 練功 1 and reset this count. | Uncommon | B | 百鍊 | It converts sustained basic density into long-fight scaling. |
| B041 | 拆招重練 | Skill | 1 | Choose an Attack in your hand. It becomes a 基礎攻擊 for this combat. Draw 1 card. | Uncommon | B/T | 百鍊 | It changes future draft valuations by admitting off-package Attacks into the engine. |
| B042 | 基礎連環 | Attack | 1 | Deal 2 damage once for each 基礎攻擊 in your draw, hand, and discard piles, up to 6 times. | Rare | B | 百鍊 | It is a deck-density payoff with a hard hit cap. |
| B049 | 基本功夫 | Skill | 1 | The next 2 基礎攻擊s you play this turn cost 0. Exhaust. | Uncommon | B/T | 百鍊 | It enables a single mastery turn while Exhaust prevents deterministic loops. |
| B053 | 換拍抽氣 | Skill | 1 | Draw 1 card. 轉拍：gain 1 Energy. | Uncommon | T | 聽隙 × 百鍊 | It is the central Energy-neutral bridge for alternation engines. |
| B055 | 左右開弓 | Attack | 1 | Deal 2 damage twice. 轉拍：apply 1 易傷. | Uncommon | T/V | 聽隙 | It joins sequencing, multi-hit payoff, and setup in one bounded card. |
| B059 | 不斷換步 | Power | 1 | The first time each turn you perform 轉拍, draw 1 card. | Uncommon | T | 聽隙 × 百鍊 | It gives every alternation deck reliable but capped card flow. |
| B060 | 一攻一守 | Power | 1 | The first time each turn you perform your second 轉拍, gain 1 Energy and 3 Block. | Uncommon | T/J | 聽隙 × 百鍊 | It rewards extending a sequence beyond the easy first switch. |
| B061 | 變拍連環 | Attack | 2 | Deal 2 damage three times. Add 1 damage to every hit for each 轉拍 performed this turn, including this card's. | Uncommon | T/B | 聽隙 × 百鍊 | It turns prior ordering into per-hit scaling that also welcomes 練功 conversion. |
| B064 | 接續姿勢 | Skill | 1 | Gain 5 Block. 轉拍：the leftmost Attack in your hand costs 1 less this turn, minimum 0. | Uncommon | T/J | 聽隙 × 百鍊 | It extends a natural Attack→Skill→Attack chain without declaring identical types to be an alternation. |
| B063 | 偷半拍 | Skill | 1 | Draw 2 cards. If this card does not trigger 轉拍, discard 1 card. | Uncommon | T | 聽隙 × 百鍊 | It makes strong draw depend on preserving the sequence. |
| B065 | 迴旋換拍 | Attack | 2 | Costs 1 if the previously successfully played card this turn was a Skill. Deal 7 damage to all enemies. | Uncommon | T | 聽隙 × 百鍊 | It fills the missing efficient area role for correctly sequenced turns. |
| B070 | 完美換拍 | Power | 3 | Whenever you perform 轉拍, deal 2 direct damage to all enemies and gain 2 Block, up to 3 times per turn. | Rare | T/J | 聽隙 × 聽勁 | It is a bounded rule-changing payoff for long alternation chains. |
| B071 | 交錯終章 | Attack | 2 | Deal 8 damage. Repeat once for each 轉拍 performed before this card this turn, up to 3 total hits. | Rare | T | 聽隙 × 百鍊 | It is the direction's readable high-mastery finisher. |
| B076 | 接住力道 | Skill | 1 | Gain 6 Block. If you gain 勁 during the next enemy phase, draw 1 additional card next turn. | Uncommon | J/T | 聽勁 | It connects a successful full block to next-turn consistency. |
| B077 | 化勁掌 | Attack | 1 | Spend 1 勁. Deal 8 damage. Cannot be played without enough 勁. | Uncommon | J | 聽勁 | It establishes the simplest fair exchange rate for earned force. |
| B078 | 借力盾 | Skill | 1 | Gain 5 Block. If you have 勁, spend 1 勁 and gain 4 more Block. | Uncommon | J | 聽勁 | It offers premium defense through a fixed spend instead of rewarding passive resource hoarding. |
| B080 | 推手 | Attack | 1 | Deal 4 damage. If you have 勁, spend 1 勁 and apply 1 易傷. | Uncommon | J/V | 聽勁 | It converts defense-earned force into the next offensive window. |
| B082 | 借力打力 | Attack | 2 | Spend up to 3 勁 automatically. Deal 5 damage plus 3 for each 勁 spent. | Rare | J | 聽勁 | It remains the main variable-strength counterattack while moving the decision to when the card is played rather than a repeated slider. |
| B084 | 四兩撥千斤 | Skill | 1 | Spend 1 勁. Gain 9 Block. Cannot be played without enough 勁. | Uncommon | J | 聽勁 | It gives stored force a decisive emergency defensive use. |
| B085 | 震腳回力 | Attack | 1 | Deal 5 damage. If you gained 勁 during the previous enemy phase, deal 5 more damage. | Uncommon | J | 聽勁 | It rewards successful defense without consuming the resource it created. |
| B087 | 引勁入拳 | Skill | 1 | Spend 1 勁. Your next Attack this turn deals 8 more damage. Cannot be played without enough 勁. | Uncommon | J/T | 聽勁 | It creates a fixed-price burst setup whose value depends on the chosen follow-up Attack. |
| B089 | 震波反擊 | Attack | 2 | Deal 6 damage to all enemies. If you have 勁, spend 1 勁 and deal 3 more damage to all enemies. | Uncommon | J | 聽勁 | It supplies the resource direction's necessary area conversion. |
| B090 | 不動如山 | Power | 2 | Once each enemy phase, before an attack would break your Block, automatically spend 1 勁 to gain 5 Block if possible. | Rare | J | 聽勁 | It turns stored force into visible insurance without granting permanent defense. |
| B093 | 勁走全身 | Power | 2 | Whenever a card spends 勁, gain 2 Block and draw 1 card, once for that card. | Rare | J/T | 聽勁 | It makes differently shaped spenders combine into an engine. |
| B097 | 空手接招 | Skill | 0 | Gain 5 Block. During the next enemy phase, the first attack action you fully block grants 1 additional 勁. Exhaust. | Rare | J | 聽勁 | It makes one visible full-block challenge more rewarding without creating repeatable direct 勁 generation. |
| B102 | 破綻基本拳 | Attack | 1 | Deal 3 damage. This is a 基礎攻擊. If the target has 易傷, deal 2 more damage. | Uncommon | V/B | 聽隙 × 百鍊 | It is the simplest direct bridge between setup and training. |
| B107 | 破綻換手 | Skill | 1 | Apply 1 易傷. Your next 基礎攻擊 this turn costs 0. | Uncommon | V/B/T | 聽隙 × 百鍊 | It sets up both the target and the Energy curve for a basic follow-up. |
| B108 | 基本轉拍 | Attack | 1 | Deal 3 damage. This is a 基礎攻擊. 轉拍：draw 1 card. | Uncommon | B/T | 聽隙 × 百鍊 | It keeps a basic-heavy deck from ending its own alternation chain. |
| B113 | 以剛護柔 | Skill | 1 | Gain 3 Block. 轉拍：練功 1. Exhaust. | Uncommon | B/T/J | 百鍊 × 聽勁 | It converts one correctly ordered defensive action into persistent training. |
| B114 | 反覆破綻 | Power | 1 | When a 基礎攻擊 hits an enemy with 易傷, extend that 易傷 by 1, once per card played and up to 9. | Rare | V/B | 聽隙 × 百鍊 | It lets basic attacks actively maintain a setup window without freezing duration automatically. |
| B115 | 聲波循環 | Power | 2 | The first time each turn you perform 轉拍 with a 基礎攻擊, put the most recently discarded Skill on top of your draw pile. | Uncommon | B/T | 聽隙 × 百鍊 | It creates deterministic cross-type recursion without tutoring any Skill. |
| B119 | 圓轉基本式 | Skill | 1 | Gain 5 Block. If you gained 勁 during the previous enemy phase, return a 基礎攻擊 from discard to your hand; it costs 0 this turn. | Uncommon | B/J/T | 百鍊 × 聽勁 | It turns the last defensive success into a free trained counterattack. |
| B120 | 勁貫破綻 | Attack | 2 | Deal 6 damage. If you have 勁, spend 1 勁 and apply 2 易傷. | Uncommon | V/J | 聽隙 × 聽勁 | It buys a useful fixed 易傷 window with earned force instead of combining premium damage with excessive duration. |
| B122 | 聽拍尋隙 | Skill | 1 | Draw 2 cards. If exactly one drawn card is an Attack, apply 1 易傷. | Uncommon | V/T | 聽隙 × 百鍊 | It rewards drawing a mixed action pair without letting Status or Curse type combinations satisfy the condition. |
| B123 | 短橋連拳 | Attack | 1 | Deal 2 damage twice. If this card triggers 轉拍, add your 練功 bonus a second time to each hit. | Uncommon | B/T | 聽隙 × 百鍊 | It is the focused multiplicative reward for combining training with alternation. |
| B124 | 破綻借力 | Skill | 1 | Remove up to 2 易傷 from one enemy. Gain 1 勁 for each duration removed. | Uncommon | V/J | 聽隙 × 聽勁 | It creates a reversible exchange between future burst time and immediate flexibility. |
| B127 | 基本三才 | Power | 2 | The first time each turn you play your second 基礎攻擊, repeat that Attack's damage and draw 1 card. | Rare | B/T | 百鍊 | It gives dense basic decks a visible per-turn cadence without a bespoke combat-wide counter. |
| B128 | 無懈可擊 | Skill | 2 | Gain 10 Block. If you take no HP damage during the next enemy phase, 練功 1. Exhaust. | Rare | B/J | 百鍊 × 聽勁 | It turns a high-confidence defensive read into permanent offense. |
| B129 | 聞聲即動 | Power | 2 | At the start of each turn, draw 1 Skill if any enemy intends to attack; otherwise draw 1 Attack. | Rare | T/J | 聽隙 × 聽勁 | It uses visible intent to supply the likely missing half of the turn and now needs two triggers to repay its setup cost. |
| B131 | 剛柔並濟 | Power | 3 | The first 轉拍 each turn grants 練功 1; the second grants 1 勁. | Rare | B/T/J | 三向 hybrid | It makes deep alternation scale two different resources without an unlimited trigger. |
| B132 | 一氣呵成 | Attack | 3 | Costs 1 less for each 轉拍 performed before this card this turn, minimum 0. Deal 4 damage four times. | Rare | T/B | 聽隙 × 百鍊 | It is a spectacular mastery payoff whose efficiency must be built during the turn. |
| B100 | 化勁留隙 | Power | 2 | The first time each enemy phase you gain 勁, apply 1 易傷 to the enemy whose attack granted it. | Rare | V/J | 聽隙 × 聽勁 | It turns a successful full block into next turn's opening without creating 勁 from an unrelated mechanic. |
| B144 | 震聲喝止 | Skill | 1 | Apply 2 Weak. If the target has 易傷, gain 5 Block. | Uncommon | V/J | 聽隙 × 聽勁 | It adds situational multi-hit mitigation that becomes playable defense after setup. |
| B149 | 後發先至 | Attack | 2 | Retain. Deal 7 damage. If you gained 勁 during the previous enemy phase, deal 8 more damage. | Rare | J | 聽勁 | It keeps the delayed counterattack fantasy while reusing a shared previous-phase badge instead of card-specific memory. |

## Human playtest gates

### Upgrade implementation loop — 2026-07-24

Two seeded 40,000-run sweeps modeled draft choices, three Smith opportunities,
win rate, and HP loss. The first pass identified excessive synthetic selection
for `B076`, `B120`, `B128`, and `B132`, and insufficient access for `B042` and
`B087`. The implemented second pass made these changes:

- `B042` cost 2→1;
- `B076` Block 7→6;
- `B087` spend 2 勁 / +10 damage → spend 1 / +8;
- `B120` damage 7→6;
- `B128` Block 12→10;
- `B132` per-hit damage 5→4.

The second sweep produced cohort win rates of 66.5% 聽隙, 67.2% 百鍊, 70.7%
聽勁, and 68.5% hybrid. Synthetic pick flags remain on several Powers and
fixed-resource cards. They are deliberately not flattened again before human
testing because the heuristic overvalues persistent text and undervalues
resource availability. These are the first cards to inspect in the human draft
matrix, not automatic cut decisions.

### Recommended first implementation wave

Do not expose all 75 cards at once. The first playable 共鳴武者 wave is the
starter plus nine rewards below:

| Stable runtime id | Design | Why it is in wave 1 |
|---|---|---|
| `bo` | B001 音波擊 | Basic Attack and 練功 carrier |
| `mo` | B002 音波盾 | Basic defense and full-block/勁 lesson |
| `po` | B003 破綻震 | Starter 易傷 setup |
| `he` | B004 弱點標記 | Cheap repeatable 易傷 access |
| `ge` | B005 響亮一擊 | Plain front-load comparison point |
| `ri` | B006 日光音波 | Early area answer |
| `ke` | B007 厚實音牆 | Reliable full-block tool |
| `te` | B008 雙拍連擊 | Multi-hit 基礎攻擊 and 練功 payoff |
| `le` | B009 翻譜 | Draw and Skill-side sequencing |
| `shi` | B012 聲波架式 | Immediate visible 練功 scaling |
| `yi` | B051 攻守換拍 | Simplest 轉拍 payoff |
| `fo` | B077 化勁掌 | Simplest fixed-price 勁 spender |

This wave deliberately replaces the old `yi` and `fo` effects while preserving
their stable IDs and 注音 lesson families. Before implementation, player-facing
names, icons, and cue words must be checked against those families. Prototype
rewards may use uniform odds until the rarity pool is large enough.

Before any wave is promoted into the live reward pool:

1. Run at least 30 cast-on and 30 debug-skip Act I drafts per direction, plus 30
   deliberately hybrid drafts.
2. Record actual offer, pick, skip, removal, upgrade, win, and HP-loss events by
   stable card ID and physical-copy UID.
3. Review results by act and encounter type; aggregate win rate alone must not
   hide a card that causes excessive early damage.
4. Flag cards above 65% pick when offered or below 10% after at least 100 human
   offers, then inspect context before changing them.
5. Test every Power and delayed trigger with a failed cast, save/load, multiple
   enemies, full hand, empty pile, and HP reaching zero mid-resolution.
6. Release content in reviewed waves; a 75-card design approval is not approval
   to expose all 75 cards at once.
