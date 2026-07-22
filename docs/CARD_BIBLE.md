# Card Bible: 回音法師完整牌池提案

> **Status:** design approval artifact; none of the new definitions in this file
> are runtime content yet. Upgraded faces are states of the same card and do
> **not** count as additional designs.

This bible specifies the complete first-character pool before implementation.
It follows the structural lessons in [STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md)
while using the smaller values, full-注音 cast cost, short fights, and icon-first
presentation of 注音之塔. Names, rules text, and themes are original.

## Rules used by the table

### Card-type classification

- **Attack** is any card whose ordered effect contains direct Attack damage.
  It remains an Attack when it also grants Block, draws, or applies a status.
- **Skill** is a one-use non-Attack action: Block, draw, Energy, selection,
  Retain, Exhaust, a buff/debuff, or explicitly named non-Attack damage. The
  prototype's obsolete `block` type migrates to Skill.
- **Power** installs a persistent effect for the remainder of the combat after
  a successful cast, then leaves normal draw/discard circulation. A failed
  Power cast still pays its Energy and follows the ordinary failed-card discard
  rule; it does not activate.
- **Status** and **Curse** are separate non-collectible card types. Statuses are
  combat-only pollution; Curses persist in the run deck. Their individual rows
  decide whether they are playable, Exhaust, or have a hand/draw trigger.

The authored type is data, not a value inferred from rules text. This keeps
card frames, reward pools, relic triggers, filters, and the designer viewer in
agreement.

- Effects resolve from left to right. `攻擊` damage is direct Attack damage;
  other HP loss is explicitly called `非攻擊傷害`.
- **回音 N:** the enemy is marked for N player turns. The first Attack hit
  against that enemy each player turn deals +2 damage and **響鳴**. Remaining
  duration decreases at the end of the player turn. Applying Echo sets the
  remaining duration to the greater of its current value or the new value, to a
  maximum of 9; it does not add the two values unless an effect explicitly says
  “extend” or “double.” Damage printed before “apply Echo” does not benefit from
  the Echo it is applying.
- An explicit **響鳴一次** deals the same +2 non-Attack damage and emits the
  same trigger event, but neither consumes nor replaces the first-Attack Echo
  trigger. It does nothing if the target has no Echo.
- **音量 N** lasts for the combat and adds N damage to every Attack hit.
- **弱音 N** lasts N enemy turns and reduces every enemy Attack hit by 1,
  never below 0. Extending it changes duration, not the reduction amount.
- **破音 N** is N charges. Each Attack hit against that enemy consumes one
  charge and deals +1 damage.
- “第 N 張牌” counts successfully cast cards played this turn, including the
  resolving card. Failed casts pay their cost but do not count as played.
- Block, Energy, draw, Retain, Innate, Exhaust, Ethereal, Unplayable, and X-cost
  follow the lifecycle in the StS reference. A card that says “this turn” loses
  that temporary change at turn end.
- Normal pool code `EM` means Echo Mage combat rewards and character-card shop
  slots. Basic cards are starter-only. Unlock tiers add cards to `EM`; they do
  not grant a copy directly.

## Self-auditing count contract

| Rarity | Attack | Skill | Power | Total |
|---|---:|---:|---:|---:|
| Basic | 2 | 1 | 0 | **3** |
| Common | 10 | 9 | 1 | **20** |
| Uncommon | 11 | 18 | 6 | **35** |
| Rare | 5 | 7 | 5 | **17** |
| **Echo Mage total** | **28** | **35** | **12** | **75** |

Additional pools are counted separately: **12 Colorless** (6 Uncommon and 6
Rare), **5 Status**, and **8 Curse** designs. Thus this document contains 100
base definitions, but only the 75 Echo Mage definitions count toward the
character's pool.

## Echo Mage — Basic (3)

| ID | Name / symbol | Type / rarity | E | Target | Package / job | Exact base effect | Exact upgrade | Keywords | Pool | Unlock | Balance rationale |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `bo` | 音波擊 / ㄅ | Attack / Basic | 1 | One enemy | Frontload | Deal 3. | Deal 5. | — | Starter | Starting deck | Deliberately weak, readable damage baseline. |
| `mo` | 音波盾 / ㄇ | Skill / Basic | 1 | Self | Defense | Gain 4 Block. | Gain 6 Block. | — | Starter | Starting deck | Defines the defensive floor without extra rules. |
| `po` | 共鳴震 / ㄆ | Attack / Basic | 2 | One enemy | Echo setup, frontload | Deal 5; apply Echo 2. | Deal 7; apply Echo 2. | — | Starter | Starting deck | Starter's one identity lesson; the damage precedes its mark. |

Starter deck remains exactly five `bo`, four `mo`, and one `po`.

### Live-ID continuity

All 27 card IDs already present in `src/data/cards.ts` remain definitions in
this catalog: `bo`, `po`, `mo`, `fo`, `de`, `te`, `ne`, `le`, `ge`, `ke`,
`he`, `ji`, `qi`, `xi`, `zhi`, `chi`, `shi`, `ri`, `zi`, `ci`, `si`, `yi`,
`wu`, `yu`, `a`, `o`, and `e`. This prevents an eventual V2 deck migration
from dropping a saved physical card. Fifteen former placeholder designs keep
their teaching symbol and stable ID but receive a clearer combat job in the
tables below; those revised effects are proposals until this bible is approved
and implemented.

## Echo Mage — Common (20)

| ID | Name / symbol | Type / rarity | E | Target | Package / job | Exact base effect | Exact upgrade | Keywords | Pool | Unlock | Balance rationale |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `ge` | 響亮一擊 / ㄍ | Attack / Common | 1 | One enemy | Frontload | Deal 6. | Deal 8. | — | EM | Initially open | Clean reward upgrade over 音波擊. |
| `ri` | 日光音波 / ㄖ | Attack / Common | 1 | All enemies | Area | Deal 3 to all enemies. | Deal 4 to all enemies. | — | EM | Initially open | Small numbers keep a one-Energy area answer fair. |
| `te` | 雙拍連擊 / ㄊ | Attack / Common | 1 | One enemy | Rhythm, multi-hit | Deal 2 twice. | Deal 3 twice. | — | EM | Initially open | Teaches hit count and supports per-hit scaling. |
| `he` | 回音針 / ㄏ | Attack / Common | 1 | One enemy | Echo setup | Deal 2; apply Echo 2. | Deal 3; apply Echo 3. | — | EM | Initially open | Pays immediate damage for efficient Echo access. |
| `zi` | 走路刺 / ㄗ | Attack / Common | 0 | One enemy | Rhythm, frontload | Deal 2; Exhaust. | Deal 3; Exhaust. | Exhaust | EM | Initially open | Preserves the live zero-cost card while making its free sequencing safely one-use. |
| `de` | 動物園衝 / ㄉ | Attack / Common | 2 | One enemy | Frontload | Deal 8. | Deal 11. | — | EM | Initially open | Preserves the live card ID and teaching symbol while raising its two-Energy payoff to the catalog baseline. |
| `chi` | 車鈴破音 / ㄔ | Attack / Common | 1 | One enemy | Setup, frontload | Deal 4; apply 2 破音. | Deal 5; apply 3 破音. | — | EM | Initially open | Evolves the live plain attack into readable multi-hit setup. |
| `ji` | 雞飛回拍 / ㄐ | Attack / Common | 1 | One enemy | Rhythm, frontload | Deal 4; if this is the second or later card this turn, deal 2 more. | Deal 5; the conditional damage remains 2. | — | EM | Tier 300 | Evolves the live plain attack into an approachable sequence payoff that still works alone. |
| `si` | 松鼠掃弦 / ㄙ | Attack / Common | 2 | All enemies | Area, defense | Deal 5 to all enemies; if at least two enemies are alive, gain 2 Block. | Deal 6 to all; conditional Block becomes 3. | — | EM | Initially open | Gives the live teaching symbol a distinct multi-enemy job and a small survival rider. |
| `a` | 阿姨護唱 / ㄚ | Attack / Common | 1 | One enemy | Frontload, defense | Deal 3; gain 3 Block. | Deal 4; gain 4 Block. | — | EM | Initially open | Evolves the live plain attack into a flexible but deliberately modest hybrid. |
| `ke` | 厚實音牆 / ㄎ | Skill / Common | 1 | Self | Defense | Gain 7 Block. | Gain 9 Block. | — | EM | Initially open | Premium plain defense establishes the Common ceiling. |
| `le` | 翻譜 / ㄌ | Skill / Common | 1 | Self | Draw, consistency | Draw 2. | Draw 3. | — | EM | Initially open | Pure consistency spends Energy and a cast. |
| `yi` | 深呼吸 / ㄧ | Skill / Common | 0 | Self | Energy, consistency | Gain 1 Energy; Exhaust. | Gain 1 Energy; draw 1; Exhaust. | Exhaust | EM | Initially open | Free Energy is one-use to prevent easy loops. |
| `fo` | 邊擋邊唱 / ㄈ | Skill / Common | 1 | Self | Defense, draw | Gain 3 Block; draw 1. | Gain 5 Block; draw 1. | — | EM | Initially open | Broad glue with deliberately lower Block. |
| `qi` | 氣球盾 / ㄑ | Skill / Common | 1 | Self | Defense | Gain 5 Block; if Block was 0 before playing this card, gain 2 more. | Base Block becomes 6; bonus remains 2. | — | EM | Initially open | Evolves the live Block card into timely defense without requiring another card. |
| `ci` | 草葉安定拍 / ㄘ | Skill / Common | 1 | Self | Rhythm, defense | Gain 4 Block; if this is the second card this turn, gain 3 more. | Base Block becomes 5; bonus remains 3. | — | EM | Tier 300 | Gives the live teaching symbol a readable defense-and-sequence job. |
| `em_c_s07` | 留聲頁 / ㄌ | Skill / Common | 1 | Self | Draw, Retain | Draw 1; the rightmost other card in hand gains Retain this turn. | Draw 2; Retain effect is unchanged. | Retain grant | EM | Tier 300 | Deterministic hand smoothing avoids an extra targeting step. |
| `em_c_s08` | 餘音標記 / ㄩ | Skill / Common | 1 | One enemy | Echo setup | Apply Echo 3. | Apply Echo 4. | — | EM | Initially open | Dedicated setup is stronger than attack hybrids. |
| `o` | 喔喔換氣 / ㄛ | Skill / Common | 1 | Self | Defense, Energy | Gain 5 Block; if this is the first card this turn, gain 1 Energy next turn. | Gain 7 Block; delayed Energy is unchanged. | — | EM | Initially open | Evolves the live Block card into planning support without refunding the current cast. |
| `em_c_p01` | 節拍燈 / ㄐ | Power / Common | 1 | Self | Rhythm, scaling | The first time each turn you play your second card, gain 1 Block. | Trigger Block becomes 2. | — | EM | Initially open | Small visible Power repays setup within two turns. |

Tier 300 is exactly three cards: `ji`, `ci`, and `em_c_s07`.

## Echo Mage — Uncommon (35)

| ID | Name / symbol | Type / rarity | E | Target | Package / job | Exact base effect | Exact upgrade | Keywords | Pool | Unlock | Balance rationale |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `em_u_a01` | 三連鼓 / ㄙ | Attack / Uncommon | 2 | One enemy | Rhythm, multi-hit | Deal 2 three times. | Deal 3 three times. | — | EM | Initially open | Strong per-hit scaling needs two Energy. |
| `em_u_a02` | 追音箭 / ㄓ | Attack / Uncommon | 1 | One enemy | Echo payoff | Deal 4; if the target already has Echo, deal 2 more and extend Echo by 1. | Base damage becomes 5; bonus and extension are unchanged. | — | EM | Initially open | Useful alone, efficient after setup. |
| `xi` | 星星迴旋 / ㄒ | Attack / Uncommon | 1 | One enemy | Rhythm, draw | Deal 5; if this is the second card this turn, draw 1. | Deal 7; draw condition is unchanged. | — | EM | Initially open | Evolves the live plain attack into sequence-driven consistency. |
| `e` | 鵝聲裂塔 / ㄜ | Attack / Uncommon | 2 | One enemy | Frontload, setup | Deal 9; apply 3 破音. | Deal 12; apply 3 破音. | — | EM | Initially open | Evolves the live two-Energy attack into frontload with a teamwide payoff. |
| `em_u_a05` | 雙向聲浪 / ㄕ | Attack / Uncommon | 2 | All enemies | Area, Echo setup | Deal 6 to all enemies; apply Echo 1 to all enemies. | Deal 8 to all; Echo remains 1. | — | EM | Initially open | Premium area setup is gated by two Energy. |
| `em_u_a06` | 護音撞擊 / ㄏ | Attack / Uncommon | 1 | One enemy | Defense payoff | Gain 3 Block; then deal damage equal to half your current Block, rounded down, maximum 8. | Gain 4 Block; damage cap becomes 10. | — | EM | Initially open | Makes defense offensive while retaining a hard cap. |
| `yu` | 魚躍收束 / ㄩ | Attack / Uncommon | 1 | One enemy | Echo consume | Deal 4; remove all Echo from the target and deal 2 additional damage per removed duration. | Deal 5; additional damage becomes 3 per removed duration. | — | EM | Initially open | Evolves the live plain attack into burst that trades away future Echo triggers. |
| `em_u_a08` | 快板飛星 / ㄎ | Attack / Uncommon | 0 | One enemy | Rhythm, multi-hit | Deal 1 three times; Exhaust. | Deal 2 three times; Exhaust. | Exhaust | EM | Initially open | Powerful scaling packet is safely one-use. |
| `em_u_a09` | 破拍突進 / ㄆ | Attack / Uncommon | 1 | One enemy | Frontload, pollution | Deal 7; add one 雜音 to your discard pile. | Deal 9; still add one 雜音. | — | EM | Initially open | Above-rate damage carries a delayed draw cost. |
| `em_u_a10` | 逆耳回擊 / ㄋ | Attack / Uncommon | 1 | One enemy | Debuff payoff | Deal 4; deal 2 more for each different debuff on the target, maximum +4. | Deal 5; maximum bonus becomes +6. | — | EM | Initially open | Rewards varied setup without being dead alone. |
| `em_u_a11` | 塔頂齊鳴 / ㄊ | Attack / Uncommon | 3 | All enemies | Area, frontload | Deal 10 to all enemies. | Deal 14 to all enemies. | — | EM | Initially open | Full-turn area finisher competes with defense. |
| `ne` | 牛奶屏障 / ㄋ | Skill / Uncommon | 2 | Self | Defense | Gain 12 Block. | Gain 16 Block. | — | EM | Initially open | Preserves the live two-Energy defensive ID while giving it a dependable premium value. |
| `em_u_s02` | 節拍翻頁 / ㄐ | Skill / Uncommon | 1 | Self | Rhythm, draw | Draw 2; if this is the second card this turn, gain 1 Energy. | Draw 3; conditional Energy is unchanged. | — | EM | Initially open | Cast timing can turn draw into a refund. |
| `em_u_s03` | 回音搬運 / ㄏ | Skill / Uncommon | 1 | One enemy | Echo setup, draw | Apply Echo 2; if the target had Echo before this card, draw 1. | Apply Echo 3; draw condition is unchanged. | — | EM | Tier 1000 | Echo manipulation also bridges to the next action. |
| `wu` | 烏雲盾 / ㄨ | Skill / Uncommon | 0 | Self | Defense, tempo | Gain 3 Block; Exhaust. | Gain 5 Block; Exhaust. | Exhaust | EM | Initially open | Preserves the live zero-cost defense while making its free safety intentionally one-use. |
| `em_u_s05` | 蓄氣長音 / ㄒ | Skill / Uncommon | 1 | Self | Energy, setup | Gain 2 Energy at the start of your next turn. | Gain 3 Energy at the start of your next turn. | — | EM | Tier 1000 | Delayed payoff prevents an immediate cast chain. |
| `em_u_s06` | 保留旋律 / ㄅ | Skill / Uncommon | 1 | One card in hand | Retain, draw | Choose another card; it gains Retain for this combat; draw 1. | Choose up to two other cards; both gain Retain; draw 1. | — | EM | Initially open | Permanent combat Retain justifies explicit selection. |
| `em_u_s07` | 靜音整理 / ㄐ | Skill / Uncommon | 0 | One card in hand | Exhaust, draw | Exhaust one selected non-Power card from hand; draw 1. | Draw 2 instead. | Exhaust action | EM | Initially open | Deck cleanup costs a card choice but no Energy. |
| `em_u_s08` | 回聲護幕 / ㄏ | Skill / Uncommon | 1 | Self | Echo, defense | Gain 4 Block, plus 2 for each living enemy with Echo. | Base Block becomes 6; per-enemy bonus remains 2. | — | EM | Initially open | Echo setup becomes immediate multi-enemy defense. |
| `em_u_s09` | 修音工具 / ㄒ | Skill / Uncommon | 1 | Self | Cleanse, defense | Remove one debuff from yourself; gain 5 Block. | Gain 7 Block; cleanse is unchanged. | — | EM | Initially open | Useful defense prevents cleanse from becoming a dead draw. |
| `em_u_s10` | 弱音指揮 / ㄖ | Skill / Uncommon | 1 | One enemy | Debuff, defense | Apply 弱音 2. | Apply 弱音 3. | — | EM | Initially open | Flat per-hit reduction is readable at this damage scale. |
| `em_u_s11` | 破音記號 / ㄆ | Skill / Uncommon | 1 | One enemy | Setup | Apply 4 破音. | Apply 6 破音. | — | EM | Initially open | Dedicated setup pays off through multi-hit cards. |
| `em_u_s12` | 同步呼吸 / ㄊ | Skill / Uncommon | 1 | Self | Energy, draw | Gain 1 Energy; draw 1; Exhaust. | Draw 2 instead; Energy remains 1. | Exhaust | EM | Tier 1000 | A one-use cast-neutral bridge for engine turns. |
| `em_u_s13` | 反覆練習 / ㄈ | Skill / Uncommon | 1 | Self | Recursion | Return the most recently played Attack or Skill from discard to hand; Exhaust. | Cost becomes 0. | Exhaust | EM | Initially open | Known-card recursion is strong but one-use. |
| `em_u_s14` | 淨空樂句 / ㄐ | Skill / Uncommon | 1 | Self | Status control, defense | Exhaust every Status in hand; draw the same number of cards; gain 3 Block. | Gain 5 Block; other effects unchanged. | Exhaust action | EM | Initially open | Status answer remains useful in clean hands. |
| `em_u_s15` | 塔聲預告 / ㄊ | Skill / Uncommon | 1 | Self | Draw control | Reveal the top 3 draw-pile cards; choose one for your hand; shuffle the other revealed cards back into the draw pile. | Reveal the top 5 instead. | Draw-order reveal | EM | Initially open | Explicitly grants information otherwise hidden. |
| `zhi` | 蜘蛛鐘罩 / ㄓ | Skill / Uncommon | 2 | Self | Defense, delayed defense | Gain 9 Block; at the start of next turn, retain up to 5 of the Block remaining after enemies act. | Retain up to 7 instead. | — | EM | Initially open | Evolves the live Block card into accurate over-blocking without permanent retention. |
| `em_u_s17` | 音階橋 / ㄧ | Skill / Uncommon | 1 | Self | Tempo, draw | Draw 1; the next card played this turn costs 1 less, minimum 0; Exhaust. | Remove Exhaust. | Exhaust | EM | Initially open | Upgrade changes a bridge from one-use to reusable. |
| `em_u_s18` | 輕聲重來 / ㄑ | Skill / Uncommon | 1 | One Exhaust card | Recursion | Move one Exhausted Attack or Skill to discard; Exhaust. | Move it to hand instead. | Exhaust | EM | Initially open | Slow base recursion becomes immediate when upgraded. |
| `shi` | 共鳴護唱 / ㄕ | Power / Uncommon | 1 | Self | Echo, defense scaling | This combat, whenever Echo 響鳴s, gain 2 Block. | Trigger Block becomes 3. | — | EM | Initially open | Current scaling anchor becomes a true Power. |
| `em_u_p02` | 回音室 / ㄏ | Power / Uncommon | 2 | Self | Echo scaling | Whenever you apply Echo, add 1 additional duration to that application. | Cost becomes 1. | — | EM | Tier 2000 | Amplifies setup but requires cards that apply Echo. |
| `em_u_p03` | 節奏核心 / ㄐ | Power / Uncommon | 1 | Self | Rhythm, Energy | The first time each turn you play your third card, gain 1 Energy. | Also draw 1 when it triggers. | — | EM | Initially open | Supports long turns without paying before card three. |
| `em_u_p04` | 音牆共振 / ㄧ | Power / Uncommon | 1 | Self | Defense scaling | Whenever a Skill grants Block, gain 1 additional Block for that Block event. | Additional Block becomes 2. | — | EM | Initially open | Per-card rather than per-point scaling stays controlled. |
| `em_u_p05` | 漸強 / ㄐ | Power / Uncommon | 2 | Self | Attack scaling | At the start of each player turn, gain 1 音量. | Cost becomes 1. | — | EM | Initially open | Slow visible scaling repays setup on the next turn. |
| `em_u_p06` | 餘拍收藏 / ㄩ | Power / Uncommon | 1 | Self | Retain, defense scaling | At turn end, for each card Retained, gain 2 Block next turn, maximum 6. | Gain 3 per Retained card, maximum 9. | — | EM | Initially open | Makes Retain defensive without uncapped hand abuse. |

Tier 1000 is exactly three cards: `em_u_s03`, `em_u_s05`, and `em_u_s12`.

## Echo Mage — Rare (17)

| ID | Name / symbol | Type / rarity | E | Target | Package / job | Exact base effect | Exact upgrade | Keywords | Pool | Unlock | Balance rationale |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `em_r_a01` | 層層共鳴 / ㄘ | Attack / Rare | 2 | One enemy | Frontload, repeat upgrade | Deal 6. | Repeatable: deal 2 more per permanent upgrade level (`+1` = 8, `+2` = 10, and so on). | Repeat-upgrade | EM | Initially open | Weak floor pays for the unique unlimited Smith ceiling. |
| `em_r_a02` | 萬鐘齊響 / ㄨ | Attack / Rare | 3 | All enemies | Area, Echo payoff | Deal 12 to all enemies; then each Echoed enemy 響鳴s once. | Deal 16 to all; 響鳴 is unchanged. | — | EM | Initially open | Full-turn finisher rewards prior setup across targets. |
| `em_r_a03` | 音爆終章 / ㄧ | Attack / Rare | 2 | One enemy | Echo consume, finisher | Deal 8; remove all Echo from the target and deal 4 more per removed duration. | Deal 10; deal 5 more per removed duration. | — | EM | Initially open | High burst destroys its own scaling resource. |
| `em_r_a04` | 無聲一擊 / ㄨ | Attack / Rare | X | One enemy | Energy, finisher | Spend all Energy; deal 3 per Energy spent; if 0 was spent, deal 2. | Deal 4 per Energy spent; zero-Energy floor remains 2. | X-cost | EM | Initially open | Flexible output keeps a tiny zero-Energy safety floor. |
| `em_r_a05` | 防線轟鳴 / ㄈ | Attack / Rare | 2 | One enemy | Defense, frontload | Gain 8 Block; deal 8. | Gain 10 Block; deal 10. | — | EM | Initially open | Rare flexibility is powerful but consumes most of a turn. |
| `em_r_s01` | 全塔靜音 / ㄑ | Skill / Rare | 2 | All enemies | Debuff, defense | Apply 弱音 3 to all enemies; gain 6 Block. | Apply 弱音 4; gain 8 Block. | — | EM | Initially open | Reliable team defense combines prevention and Block. |
| `em_r_s02` | 完美換氣 / ㄨ | Skill / Rare | 0 | Self | Energy, draw | Gain 2 Energy; draw 2; Exhaust. | Gain 3 Energy; draw 2; Exhaust. | Exhaust | EM | Initially open | Exceptional one-turn acceleration is strictly one-use. |
| `em_r_s03` | 回溯樂譜 / ㄏ | Skill / Rare | 1 | Exhaust pile | Recursion | Choose up to 3 Exhausted Attacks or Skills and move them to discard; Exhaust. | Move one chosen card to hand and up to two others to discard. | Exhaust | EM | Initially open | Restores resources slowly; upgrade grants one immediate choice. |
| `em_r_s04` | 金色休止 / ㄐ | Skill / Rare | 1 | Self | Defense, drawback | Gain 12 Block; you cannot play Attacks for the rest of this turn. | Gain 16 Block; restriction remains. | — | EM | Initially open | Huge efficiency closes the offensive part of the turn. |
| `em_r_s05` | 雙手指揮 / ㄕ | Skill / Rare | 1 | All enemies | Echo scaling | Double current Echo duration on every enemy, maximum 9; Exhaust. | Remove Exhaust. | Exhaust | EM | Initially open | Multiplicative setup is bounded and initially one-use. |
| `em_r_s06` | 無限譜架 / ㄨ | Skill / Rare | 2 | Cards in hand | Retain, cost control | Choose one other card; for this combat it gains Retain and costs 1 less, minimum 0; Exhaust. | Choose up to two other cards. | Exhaust | EM | Initially open | Strong card sculpting pays Energy and leaves circulation. |
| `em_r_s07` | 清澈和弦 / ㄑ | Skill / Rare | 1 | Self | Cleanse, draw | Remove all your debuffs; gain 2 Block per debuff removed; draw 1. | Gain 3 Block per debuff; draw 2. | — | EM | Initially open | Rare cleanse has a useful minimum and contextual ceiling. |
| `em_r_p01` | 永續回聲 / ㄩ | Power / Rare | 3 | Self | Echo rule change | Echo no longer loses duration at turn end this combat; first-Attack triggering remains once per enemy per player turn. | Cost becomes 2. | — | EM | Tier 2000 | Rule change is slow and still needs Echo application. |
| `em_r_p02` | 大合唱 / ㄉ | Power / Rare | 2 | Self | Power scaling, draw | Whenever you play another Power, draw 1 and gain 1 Block. | Trigger Block becomes 2. | — | EM | Initially open | Makes Power-heavy decks cycle without self-triggering. |
| `em_r_p03` | 自動伴奏 / ㄗ | Power / Rare | 2 | Self | Energy scaling | At turn start, if another Power is active, gain 1 Energy. | The first time this condition succeeds each combat, also draw 1. | — | EM | Initially open | Requires a second setup card before paying back. |
| `em_r_p04` | 完美節拍 / ㄨ | Power / Rare | 2 | Self | Rhythm, defense scaling | At turn end, if you played exactly 3 cards, gain 8 Block before enemies act. | Trigger Block becomes 10. | — | EM | Initially open | Exact-count condition creates a visible planning puzzle. |
| `em_r_p05` | 音之塔心 / ㄧ | Power / Rare | 3 | Self | Echo, Energy scaling | The first time each turn any Echo 響鳴s, gain 1 Energy and draw 1. | Cost becomes 2. | — | EM | Tier 2000 | Expensive engine has immediate feedback once Echo is ready. |

Tier 2000 is exactly three cards: `em_u_p02`, `em_r_p01`, and `em_r_p05`.
No card is assigned to the relic unlock tiers at 750 or 1500.

## Colorless cards (12; separate from the 75)

Colorless cards use general tower/sound tools and must remain useful without
Echo Mage-specific state. They appear only in Colorless shop slots and authored
events unless a future effect explicitly generates them.

| ID | Name / symbol | Type / rarity | E | Target | Package / job | Exact base effect | Exact upgrade | Keywords | Pool | Unlock | Balance rationale |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `cl_u01` | 銅鐘敲擊 / ㄊ | Attack / Uncommon | 1 | One enemy | Frontload, draw | Deal 5; draw 1. | Deal 7; draw 1. | — | Colorless shop/event | Initially open | Universal cantrip pays with moderate damage. |
| `cl_u02` | 靜心數拍 / ㄐ | Skill / Uncommon | 0 | Self | Defense | Gain 3 Block; Exhaust. | Gain 5 Block; Exhaust. | Exhaust | Colorless shop/event | Initially open | Safe free defense is one-use. |
| `cl_u03` | 樓梯捷徑 / ㄌ | Skill / Uncommon | 1 | Self | Draw control | Draw 2; choose one other card in hand and put it on top of the draw pile. | Draw 3 before returning one card. | — | Colorless shop/event | Initially open | Improves this turn while preserving a chosen future draw. |
| `cl_u04` | 清潔音叉 / ㄑ | Skill / Uncommon | 1 | One card in hand | Status control, defense | Exhaust one selected Status or Curse from hand for this combat; gain 5 Block. | Gain 7 Block. | Exhaust action | Colorless shop/event | Initially open | Narrow cleanup includes enough defense to be playable. |
| `cl_u05` | 借來的節拍 / ㄐ | Attack / Uncommon | 1 | One enemy | Rhythm, frontload | Deal 4; if this is exactly the second card this turn, deal 4 more. | Base damage becomes 5; bonus remains 4. | — | Colorless shop/event | Initially open | Strong universal sequence payoff has a precise window. |
| `cl_u06` | 微光節拍 / ㄨ | Power / Uncommon | 1 | Self | Zero-cost scaling, defense | The first time each turn you play a 0-Energy card, gain 2 Block. | Trigger Block becomes 3. | — | Colorless shop/event | Initially open | Small payoff cannot trigger repeatedly in one turn. |
| `cl_r01` | 水晶回聲 / ㄕ | Attack / Rare | 2 | One enemy | Debuff payoff | Deal 8; if the target has any debuff, deal 8 again. | Each hit becomes 10. | — | Colorless shop/event | Initially open | Broad condition earns Rare burst without using Echo rules. |
| `cl_r02` | 塔頂望遠鏡 / ㄊ | Skill / Rare | 1 | Self | Draw control | Reveal the top 5 draw-pile cards; choose up to 2 for your hand; shuffle the rest back. | Choose up to 3 instead. | Draw-order reveal | Colorless shop/event | Initially open | Powerful selection explicitly grants hidden information. |
| `cl_r03` | 萬用樂譜 / ㄨ | Skill / Rare | 1 | Self | Generation | Choose 1 of 3 randomly offered unlocked character cards; create it in hand at 0 Energy this turn; Exhaust. | Offered cards are shown upgraded. | Exhaust | Colorless shop/event | Initially open | Flexible generation is temporary and one-use. |
| `cl_r04` | 無價休止 / ㄨ | Skill / Rare | 0 | Self | Energy, drawback | Gain 1 Energy; the next card you successfully play this turn Exhausts; Exhaust. | Gain 2 Energy; drawback is unchanged. | Exhaust | Colorless shop/event | Initially open | Acceleration asks the player to sacrifice future reuse. |
| `cl_r05` | 星光舞臺 / ㄒ | Power / Rare | 2 | Self | Cost scaling | The first card played each turn costs 1 less, minimum 0. | Cost becomes 1. | — | Colorless shop/event | Initially open | Universal persistent Energy saving has a large setup cost. |
| `cl_r06` | 迴廊指揮 / ㄏ | Power / Rare | 2 | Self | Retain, consistency | At turn end, Retain the highest-cost card in hand; ties choose the leftmost. | Retain the two highest-cost cards; ties resolve left to right. | Retain | Colorless shop/event | Initially open | Automatic deterministic Retain avoids modal choices each turn. |

Colorless audit: Uncommon = 2 Attack + 3 Skill + 1 Power = **6**;
Rare = 1 Attack + 3 Skill + 2 Power = **6**; total = **12**.

## Status cards (5; temporary combat cards)

Status cards are removed when combat ends. Only playable Status cards open the
full 注音 cast screen.

| ID | Name / symbol | Type / rarity | E | Target | Exact effect | Keywords | Source pool | Upgrade |
|---|---|---|---:|---|---|---|---|---|
| `st_noise` | 雜音 / ㄗ | Status / Special | — | None | Cannot be played; Exhaust it at turn end. | Unplayable, Ethereal | Enemy/card pollution | None |
| `st_feedback` | 刺耳回授 / ㄘ | Status / Special | — | None | If in hand at turn end, lose 2 HP. | Unplayable | Enemy pollution | None |
| `st_empty_beat` | 空拍 / ㄎ | Status / Special | — | None | When drawn, lose 1 Energy, then Exhaust it. | Unplayable, Exhaust | Enemy pollution | None |
| `st_sticky_beat` | 黏拍 / ㄋ | Status / Special | 1 | Self | Exhaust this card. | Exhaust | Enemy pollution | None |
| `st_scorch_note` | 灼音 / ㄓ | Status / Special | — | None | If in hand at turn end, lose 2 HP, then Exhaust it. | Unplayable, Exhaust | Enemy pollution | None |

## Curse cards (8; persistent run cards)

Curses remain in the run deck after combat until removed. They cannot be
upgraded. A Curse that Exhausts returns to the run deck after combat.

| ID | Name / symbol | Type / rarity | E | Target | Exact effect | Keywords | Source pool | Upgrade |
|---|---|---|---:|---|---|---|---|---|
| `cu_silence` | 失聲 / ㄕ | Curse / Special | — | None | Cannot be played. | Unplayable | Event/difficulty | None |
| `cu_stage_fright` | 怯場 / ㄑ | Curse / Special | — | None | While in hand, your first Attack hit each turn deals 2 less damage, minimum 0. | Unplayable | Event | None |
| `cu_tinnitus` | 耳鳴 / ㄦ | Curse / Special | — | None | If in hand at turn end, lose 1 HP. | Unplayable | Event | None |
| `cu_overecho` | 過響 / ㄍ | Curse / Special | — | None | When drawn, add one 雜音 to your discard pile. | Unplayable | Event | None |
| `cu_heavy_beat` | 沉拍 / ㄔ | Curse / Special | — | None | When drawn, draw 1 fewer card next turn; multiple copies stack. | Unplayable | Event/difficulty | None |
| `cu_cracked_bell` | 裂鐘 / ㄌ | Curse / Special | — | None | While in hand, the first Block-gain event each turn grants 1 less Block, minimum 0. | Unplayable | Event | None |
| `cu_lost_score` | 迷譜 / ㄇ | Curse / Special | 1 | Self | Exhaust this card with no other effect. | Exhaust | Event | None |
| `cu_tower_shadow` | 塔影 / ㄊ | Curse / Special | — | None | If Ethereal exhausts this card at turn end, lose 3 HP. | Unplayable, Ethereal | Difficulty | None |

## Package and coverage audit

The 75-card pool intentionally overlaps rather than forming sealed archetypes:

| Package | Reliable early access | Mid-run glue | Scaling / finisher |
|---|---|---|---|
| Echo marking | 共鳴震, 回音針, 餘音標記 | 追音箭, 回音搬運, 回聲護幕 | 永續回聲, 音爆終章, 音之塔心 |
| Rhythm / multi-hit | 雙拍連擊, 雞飛回拍 | 三連鼓, 節奏核心, 節拍翻頁 | 完美節拍 |
| Resonant defense | 音波盾, 厚實音牆 | 共鳴護唱, 音牆共振, 蜘蛛鐘罩 | 防線轟鳴, 全塔靜音 |
| Breath / tempo | 深呼吸, 翻譜, 邊擋邊唱 | 蓄氣長音, 保留旋律, 音階橋 | 完美換氣, 無限譜架 |
| General frontload / area | 響亮一擊, 日光音波 | 裂塔鐘, 雙向聲浪, 塔頂齊鳴 | 萬鐘齊響 |

Every package has a card that works without a named partner. The nine score
unlocks add breadth in three fixed batches, while the initially open pool still
contains damage, defense, area, draw, Energy, Echo setup, and scaling.

## Implementation readiness checks

Before converting any row to runtime data:

1. Assign at least three phrase-bank cues matching the listed symbol and enabled
   curriculum packs; do not store duplicate cue lists on the card.
2. Confirm base and upgrade text can fit the fixed tablet card frame.
3. Normalize each ordered sentence into typed `effects[]`; do not infer effects
   from card type or prose.
4. Record every selection, delayed trigger, cap, tie-break, and pile destination
   represented above in deterministic tests.
5. Re-run the exact rarity/type audit and reject duplicate IDs.
6. Playtest values with casting both enabled and debug-skipped. The table is an
   approval baseline, not evidence that 75 cards should ship in one balance wave.
