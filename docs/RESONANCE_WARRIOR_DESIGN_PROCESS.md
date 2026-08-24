# 共鳴武者: locked 75-card design

> **Status:** authoritative design source. Only rows with `reviewedWave` at or
> below `LIVE_REVIEWED_WAVE` are obtainable. The archived brainstorm is design
> history, not a backlog.

## Character foundation

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

## Locked roster contract

- Exactly 75 designs: 3 Basic, 20 Common, 35 Uncommon, and 17 Rare.
- Type mix: 31 Attacks, 29 Skills, and 15 Powers.
- Every physical card has one non-repeatable `+` face that preserves its job,
  direction, target model, and 注音 family.
- The three directions are 聽隙爆發, 百鍊連環, and 聽勁反擊. 轉拍 is their
  shared bridge; no fourth direction is planned.
- Every direction supplies front-load, defense, draw or Energy, area access,
  and long-fight scaling without requiring a named Rare.

## Never-again rules

These rules replace a live list of rejected card names:

- Do not restore 回音 as a character status or convert archived Echo cards by
  renaming their mechanic.
- Do not grant 勁 from Attacks or from applying 易傷; it represents a fully
  blocked enemy attack action.
- Do not add two-enemy selectors, type-choice modals, unbounded per-copy growth,
  or checklist Powers that require all signatures at once.
- Do not add a new status archetype, Colorless cards, Statuses, or Curses to
  this character pool.
- Do not add repeatable Smithing or an unrelated second mechanic on a `+` face.

## Balance evidence

`scripts/simulate-resonance-pool.mjs` parses only the Final 75 below. Its seeded
proxy drafts report offer/pick rates, containing-deck outcomes, Smith priority,
cohort spread, and static roster errors. It is useful for outliers and package
starvation, but it does not model 注音 mistakes, exact pile play, or every
trigger. It is evidence levels 1–2 from `DESIGN_PLAYBOOK.md`, not player data.

The last equal-cohort pass split 160,000 drafts across 聽隙爆發, 百鍊連環,
聽勁反擊, and hybrid policies. The 5.4-point proxy-win spread is a watch list,
not a balance verdict. Further number changes require turn-level and human
cast-on evidence.

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

### Release requirements

Before any additional wave becomes obtainable:

1. Run cast-on and debug-skip drafts for each direction and deliberate hybrids.
2. Record offers, alternatives, picks, skips, removals, upgrades, HP loss,
   encounter result, and run result by stable definition ID and physical UID.
3. Inspect high- and low-pick cards in context instead of tuning from aggregate
   win association.
4. Exercise failed casts, save/load, multi-enemy targets, full hands, empty
   piles, and lethal mid-resolution outcomes for every delayed trigger.
5. Keep `LIVE_REVIEWED_WAVE = 2` until Wave 1–2 has both an Act II debug-skip
   pass and an Act II cast-on pass.

## Wave 3 Uncommon review sheet

This is the next review package, not an obtainability change. Each row must
still pass touch, feedback, failure, and human-draft gates.

| Design | Purpose / standalone floor | Best interactions | Edge cases to falsify |
|---|---|---|---|
| B021 收束震 | Convert excess 易傷 into lethal; still deals 3 | B004, B017, B114 | zero duration, cap 9, kill during removal |
| B019 回身標記 | Block while opening one chosen target | B020, B028, B051 | dead target, target swap, failed cast |
| B024 破綻回聲 | First 易傷 application each turn replaces setup tempo | B004, B055, B120 | multi-target application, full hand, save/load |
| B028 破綻護身 | Defensive payoff for spreading 易傷 | B017, B019, B144 | dead enemies, zero marked enemies, upgrade count |
| B040 熟能生巧 | Slow basic-density scaling | B008, B032, B037 | counter reset, converted basics, failed casts |
| B041 拆招重練 | Admit an off-package Attack into 百鍊 | B042, B049, B123 | no Attack in hand, upgraded copy, save/load |
| B049 基本功夫 | One explosive basic turn with Exhaust safety | B032, B037, B108 | discounts consumed on fizzle, hand cap, zero-cost basic |
| B053 換拍抽氣 | Energy-neutral alternation bridge | B051, B061, B071 | first card, failed prior cast, max hand |
| B055 左右開弓 | Multi-hit 轉拍 setup | B024, B061, B123 | apply after damage, killed target, upgrade duration |
| B059 不斷換步 | Capped first-轉拍 draw engine | B053, B063, B108 | multiple 轉拍, full hand, turn reset |
| B060 一攻一守 | Reward a deeper second alternation | B051, B052, B070 | exact trigger count, fizzle, save/load |
| B061 變拍連環 | Turn sequencing into bounded multi-hit damage | B053, B059, B123 | include own 轉拍, 練功 ordering, 易傷 rounding |
| B064 接續姿勢 | Natural Attack-Skill-Attack bridge | B051, B061, B065 | no Attack in hand, leftmost selection, cost floor |

No row receives `reviewedWave: 3` from design approval alone.
