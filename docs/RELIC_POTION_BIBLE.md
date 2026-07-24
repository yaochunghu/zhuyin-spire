# Relic and potion design bible

> **Compatibility status:** this roster was authored for 回音法師. Universal
> timing, inventory, pool, feedback, and validation rules remain useful, but
> every Echo-specific relic or potion is frozen until it passes the
> [design playbook](./DESIGN_PLAYBOOK.md) against 共鳴武者. Do not mechanically
> replace “Echo” with 易傷, 練功, 轉拍, or 勁.

**Status:** design proposal for review; none of the new entries are live unless
they already exist in `src/data/relics.ts`.

This bible defines the complete first-character target of **40 original relics**
and **20 original potions**. It follows the decision structure documented in
[STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md), but its names, feedback,
and numbers are designed for 注音之塔's 40-HP, 3-Energy, preschool co-play
scale. Relics and potions never bypass the full 注音 cast required to play a
card.

## Shared rules

### Terms and timing

- **Correct cast** means the card's full 注音 answer succeeded, its Energy was
  paid, and its effects are about to resolve. A failed answer is not a played
  card and cannot trigger “when played” relics.
- **First hit** means the first actual damage hit in resolution order. A
  multi-hit card may consume a first-hit bonus only once unless the effect says
  “each hit.”
- **Card Block** is Block printed in a card effect. Relic and potion Block does
  not trigger effects that specifically require Card Block.
- **Echo duration** uses the current rule: applying Echo sets the remaining
  duration to the greater of its existing duration or the new duration. It does
  not add the two durations unless an effect explicitly says it does.
- Relic effects with the same timing resolve in acquisition order. Immediate
  numeric bonuses are combined before the matching animation is shown.
- “Once per turn” counters reset at the start of the player's turn. “Once per
  enemy turn” covers the whole enemy action phase, not each monster.
- Direct relic or potion damage removes enemy Block before HP, but is not an
  Attack and receives no Attack, first-hit, or Echo damage bonus.

### Relic pools and duplicates

- The 40-item count is exactly: **1 Starter, 8 Common, 8 Uncommon, 8 Rare,
  5 Boss, 4 Shop, 3 Event, and 3 Special**.
- A relic ID can be owned only once in a run. Owned relics are removed from all
  future pools; no replacement stack behavior is required.
- Ordinary elite/treasure rewards roll Common/Uncommon/Rare at the project
  target of **50% / 33% / 17%**. Boss, Shop, Event, Starter, and Special relics
  never enter that roll.
- A reward rerolls an ineligible or already-owned result from the same eligible
  pool. If the pool is exhausted, the relic reward becomes **20 gold** and the
  adult coach line explains why.
- Character-restricted relics are removed before rolling. “Any” means the relic
  can remain available to future characters; “回音法師” means it relies on
  Echo Mage mechanics and must not appear for another character.
- The three Special sound keys are relic-like run items, never ordinary loot.
  They occupy the relic display but do not affect relic rarity or unlock pools.

### Preschool feedback contract

Every trigger must show the relic/potion icon near the affected combatant, one
plain value float, and one short sound. Repeated triggers in the same batch may
combine into one float, but the combat log keeps the individual sources. Adult
tooltips show the exact rule; the persistent child-facing label uses no more
than one short sentence.

## Relics — 40 designs

Each row's tier is the bold subsection that contains it; that tier is part of
the row specification, not merely a visual grouping.

### Starter — 1

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `tuningFork` | 🎵 **初心音叉**; a small fork sends one gold ripple | Echo Mage starting relic only | At the start of each combat, arm one charge. The first resolved damage hit from an Attack consumes it and adds **+2 damage before enemy Block**. It is still consumed when Block absorbs the whole hit; direct relic/potion damage does not consume it. | Fork rings above the target; `🎵 +2` joins the hit float. | Front-loaded and multi-hit Attacks; teaches “first hit” without requiring Echo. | This is the live starter relic and remains broadly useful at the project's 3–7 damage scale without deciding a fight alone. |

### Common — 8

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `shieldCharm` | 🛡️ **小盾符**; blue paper shield unfolds | Ordinary relic pool; Any; legacy ID retained | At combat start, gain **2 Block** after enemies spawn and before the opening hand is drawn. It combines additively with other start-of-combat Block. | Shield unfolds over the hero; `🛡️ +2`. | Safe setup for slow cards and Powers. | Preserves the live legacy effect. Two Block is visible but remains below half of a basic defensive card. |
| `coinPouch` | 🪙 **零錢袋**; three coins bounce once | Ordinary relic pool; Any; legacy ID retained | On acquisition, gain **14 gold** exactly. It has no later combat trigger. Multiple acquisition is impossible. | Coins fly to the gold counter; `🪙 +14`. | Brings the next card purchase or removal closer. | Preserves the live legacy value—about half of a current shop card—without compounding over the run. |
| `morningSpark` | 🌅 **晨光火花**; sunrise lights the Energy gems | Ordinary relic pool; Any; legacy ID retained | On turn 1 of each combat, set the turn's Energy refill to **4** instead of 3. Later turns refill normally. Other Energy gains add after this refill. | The fourth gem lights with a sunrise ping; `⚡ 4`. | Opening Powers, two-cost setup, and fast attacks. | Preserves the live effect and grants one early tempo choice per fight rather than permanent Energy. |
| `luckyDraw` | 🎴 **幸運抽**; one bright card slides from the deck | Ordinary relic pool; Any; legacy ID retained | After the normal opening draw and Innate placement, draw **1 additional card**, respecting the 10-card hand cap. It does not alter later turn draw. | A sparkle follows the extra card; `多抽 1 張`. | Starter-deck consistency and finding setup cards. | Preserves the live effect; one opening card is valuable but does not increase Energy or every-turn velocity. |
| `softPracticeMat` | 🧩 **練習軟墊**; a soft tile catches a falling note | Ordinary relic pool; Any | The first failed cast in each combat grants **3 Block** after the card and Energy cost are lost. It never refunds the card, Energy, or answer. | A note lands softly; `沒關係 🛡️ +3`. | Any deck; specifically reduces preschool frustration. | Failure remains consequential, while three Block prevents one mistake from snowballing into disproportionate HP loss. |
| `pocketMetronome` | 🕰️ **口袋節拍器**; three lamps tick left to right | Ordinary relic pool; Any | The first time the player successfully plays a **third card in one turn**, draw **1 card** after that card resolves. Triggers at most once per turn and respects hand cap. Failed casts do not advance the counter. | Three lamps fill, then a card flips up; `3 拍！抽 1`. | Zero-cost cards, Energy gain, Rhythm packages. | Requires real setup and spare Energy; its best case is one extra choice per strong turn. |
| `echoClapper` | 🔔 **小小鈴舌**; a tiny clapper taps the Echo bell | Ordinary relic pool; Echo Mage only | The first time Echo adds bonus damage in each combat, gain **3 Block** after that hit resolves. Only one charge per combat, even if Echo triggers on several enemies. | Bell taps and a blue ring returns to the hero; `回音 🛡️ +3`. | Echo setup and early defense. | Gives one modest payoff for the character mechanic without replacing the repeatable Echo-guard Power. |
| `warmupScarf` | 🧣 **暖聲圍巾**; scarf wraps the HP heart | Ordinary relic pool; Any | At combat start, if current HP is **50% of max HP or lower**, gain **5 Block**. Evaluate once after combat creation; later HP changes do not retrigger it. | Scarf wraps once; `加油 🛡️ +5`. | Risky routes and recovery between campfires. | A conditional basic-card-sized buffer helps a struggling run without making healthy runs stronger. |

### Uncommon — 8

The first three entries are the required acquisition-upgrade family. They
upgrade only newly acquired permanent deck instances, never the cards already
owned when the relic is found.

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `attackEtchingNeedle` | 🪡 **攻音刻針**; red `+` is etched onto a card edge | Ordinary relic pool; Any | Each **Attack** permanently added to the run deck after acquisition arrives upgraded by **one authored level**. Already-maxed, temporary, Status, and Curse cards are unchanged. A repeat-upgrade card gains one level per acquisition. | New Attack flashes red-green and receives a clear `+`. | Attack-heavy decks and reward/shop acquisition. | Type restriction and future-only timing make a run-long benefit that improves card evaluation without retroactive power. |
| `skillNotationSeal` | 📝 **技法譜印**; blue `+` stamp lands on a card | Ordinary relic pool; Any | Each **Skill** permanently added to the run deck after acquisition arrives upgraded by **one authored level**. Already-maxed, temporary, Status, and Curse cards are unchanged. | New Skill receives a blue stamp and `+`. | Defense, draw, Energy, and utility packages. | Mirrors the Attack version so no core card type is structurally favored. |
| `powerConductorPin` | 📌 **長音指揮針**; purple `+` pin holds a long note | Ordinary relic pool; Any | Each **Power** permanently added to the run deck after acquisition arrives upgraded by **one authored level**. Already-maxed and temporary cards are unchanged. | New Power glows purple and receives `+`. | Scaling decks and expensive Power picks. | Powers are less frequent but upgrades can change an entire combat; Uncommon keeps access meaningful rather than guaranteed. |
| `breathingStone` | 🫁 **呼吸暖石**; warm stone expands like a slow breath | Ordinary relic pool; Any | On acquisition, increase max HP by **3** and heal **3 HP**. Current HP cannot exceed the new maximum. No ongoing trigger. | Heart grows, then fills; `最大生命 +3`. | Long routes and Rest efficiency. | A small permanent buffer is meaningful against 3–7 damage intents but cannot erase several bad combats. |
| `layeredDrum` | 🥁 **層拍鼓皮**; separate rings appear for each hit | Ordinary relic pool; Echo Mage only | The first multi-hit Attack played each turn deals **+1 damage on every hit**. An Attack counts as multi-hit when its resolved hit count is at least two. Reset next player turn. | Each boosted hit gets a small drum pop; final label `每下 +1`. | Rhythm and multi-hit Attacks. | Strong only with the right card and scales by hit count, making multi-hit evaluation change without buffing every Attack. |
| `scoreBookmark` | 🔖 **續頁書籤**; bookmark opens one extra page | Ordinary relic pool; Any | The first card effect each turn that draws at least one card draws **1 additional card**. The extra draw cannot trigger this relic again and respects hand cap. | Bookmark flips; `再抽 1 張`. | Draw Skills and hand-control packages. | One conditional card per turn is substantial, but requires paying for a draw effect and can be wasted at the hand cap. |
| `powerSocket` | 🔌 **長音插座**; one Energy spark returns from a Power | Ordinary relic pool; Any | After the first Power is correctly cast and activated in each combat, gain **1 Energy** immediately. Failed Powers do not spend the charge; Energy may exceed normal maximum for the turn. | A purple cable returns one lit gem; `⚡ +1`. | Makes early Power setup safer. | It discounts only one successful persistent setup per fight while retaining the teaching cast. |
| `echoSandglass` | ⏳ **回音沙漏**; a bell-shaped grain remains above the enemy | Ordinary relic pool; Echo Mage only | Whenever a card, relic, or potion applies Echo, increase that application's printed duration by **1 turn** before the normal max-duration rule. It does not add existing and new durations. | One extra sand grain lights; `回音 +1 回合`. | Echo application, defensive Echo triggers, long fights. | Extends setup reliability rather than raw immediate damage; it is weak without Echo cards and strong in the intended package. |

### Rare — 8

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `perfectPitchRibbon` | 🎀 **準音緞帶**; correct symbols tie into a ribbon | Ordinary relic pool; Any | After the first correct cast each player turn resolves, draw **1 card**. Failed casts do not consume the trigger; hand cap applies. | The completed 注音 becomes a ribbon leading to the deck; `答對！抽 1`. | Accurate casting, cheap cards, broad consistency. | A repeatable reward for the learning objective is Rare-level draw, gated once per turn and still limited by Energy. |
| `grandAuditorium` | 🎭 **回聲小劇院**; a stage wave crosses every monster | Ordinary relic pool; Echo Mage only | Whenever Echo contributes its bonus damage to an Attack, deal **1 direct damage to every living enemy** after that Attack hit. Once per enemy's Echo trigger per turn; direct damage receives no Attack or Echo modifiers. | Curtains open and one wave crosses the row; `全體 -1`. | Echo and multi-enemy encounters. | Converts the character mechanic into modest area scaling without multiplying each multi-hit. |
| `repriseNeedle` | 🧵 **返奏唱針**; a red thread points back to the draw pile | Ordinary relic pool; Any | The first successfully cast non-Exhaust Attack each combat goes to the **top of the draw pile** after it fully resolves instead of discard. Exhaust and combat-end cleanup take precedence. | A red thread pulls the card onto the deck; `下一輪再見`. | Reliable frontload and upgraded Attacks. | Guarantees one repeat next turn, not an immediate free play; deck quality determines its ceiling. |
| `shieldGong` | 🥏 **守音小鑼**; a blue gong catches one enemy hit | Ordinary relic pool; Any | Once per enemy turn, after an enemy attack hit is fully absorbed by Block and deals 0 HP damage, gain **3 Block**. Later hits use the new Block but cannot retrigger that enemy turn. | Gong rings at zero damage; `擋住了！🛡️ +3`. | Strong Block cards and multi-hit defense. | Rewards exact defense planning while the once-per-phase cap prevents an endless multi-hit chain. |
| `conductorGloves` | 🧤 **開場指揮手套**; the first card's Energy pips turn gold | Ordinary relic pool; Any | The first non-X card committed to the cast screen each combat has a resolved Energy cost of **0**, and the charge is consumed at that commitment. Canceling before commitment retains it; a failed cast still spends the charge and loses the card normally. | Glove points to `0`; a gold ring confirms consumption. | Expensive Attacks, Skills, or Powers. | A single free attempt is a large opening advantage but cannot bypass casting or provide repeated free failures. |
| `goldenDropper` | 💧 **金色滴管**; a gold drop becomes an Energy spark and shield | Ordinary relic pool; Any | After any potion resolves during combat, gain **1 Energy and 3 Block**. Triggers for every consumed potion; out-of-combat potion use gives no Energy or Block. | Drop splits into `⚡ +1` and `🛡️ +3`. | Potion inventory, emergency turns, shop potions. | Rare because it turns a scarce resource into tempo plus safety, but cannot act without consuming potions. |
| `treasureMapRoll` | 🗺️ **雙路藏寶圖**; one path splits toward two chests | Ordinary relic pool; Any | Each future Treasure relic reward displays **two eligible relics** from the chest's rolled tier; choose one and return the other to its pool. Does not affect gold or key replacement. | Two chests open side by side; unchosen chest closes. | Route planning and relic-package consistency. | Improves selection, not quantity, and has no benefit if acquired after the final Treasure. |
| `smithingChime` | 🔨 **鍛音小鐘**; hammer strike releases a green heart note | Ordinary relic pool; Any | After completing a Smith action, heal **3 HP**. It triggers once per consumed rest site, even for a repeat-upgrade card, and never exceeds max HP. | Smith flash is followed by `♥ +3`. | Upgrades and risky campfire decisions. | Softens Smith's safety cost without approaching the project's 40%-max-HP Rest value. |

### Boss — 5

Boss relics are offered only after Act I or Act II bosses. Their confirmation
panel must show benefit and drawback together; there is no hidden downside.

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `fourBeatCore` | 💓 **四拍音核**; four Energy lights orbit a heart | Boss reward only; Any | Increase base Energy refill from **3 to 4** every player turn. Reduce normal draw from **5 to 4** every turn, including the opening draw; extra and Innate draws work normally. | Four gems light; deck shows a visible `每回合少抽 1`. | Expensive cards and compact decks. | Permanent Energy is run-defining, while reduced choices make weak or bloated decks meaningfully less consistent. |
| `hollowStageBell` | 🔔 **空心舞臺鐘**; large bell trades a heart chip for a spark | Boss reward only; Any | Increase base Energy refill from **3 to 4**. On acquisition reduce max HP by **6**; clamp current HP to the new maximum but do not otherwise deal damage. | One heart chip moves into a fourth Energy gem; `最大生命 -6`. | High-value cards and defensive decks. | Six HP is roughly one meaningful enemy attack at this scale and remains a visible run-long cost. |
| `hurriedBaton` | 🪄 **急拍指揮棒**; fourth gem pulses while monster claws brighten | Boss reward only; Any | Increase base Energy refill from **3 to 4**. Every enemy Attack hit deals **+1 damage before Block** for the rest of the run; non-Attack HP loss is unchanged. | Fourth gem lights; enemy intents show the already-increased exact values with a red baton pip. | Fast decks that can end fights or cover larger intents. | The downside scales against multi-hit enemies, so the extra Energy demands active use rather than being a free upgrade. |
| `encoreToken` | 🔁 **安可圓牌**; one card loops through a lit ring | Boss reward only; Any | The first correctly cast non-Exhaust **Attack or Skill** each player turn returns to hand after resolving instead of entering discard. Its cost is **+1 for the rest of that turn**; replay requires another full cast and it then follows normal discard/Exhaust rules. Powers and X-cost cards are ineligible. | Card loops back with `安可 +1⚡`; ring turns off for the turn. | Cheap utility, upgraded cards, and flexible Energy use. | Offers a strong repeatable choice but never supplies a free effect and doubles the learning action only when the player chooses to repay and recast. |
| `restlessSongbook` | 📕 **不停唱歌譜**; green `+` pages replace half a pillow | Boss reward only; Any | Every permanently acquired collectible card after acquisition arrives upgraded by one authored level. Already-maxed cards are unchanged. Rest healing becomes **20% max HP** instead of 40%, floored with minimum 1; Smith is unchanged. | New cards gain `+`; campfire preview visibly shows the smaller heart amount. | Card rewards, shops, upgrades, aggressive routes. | Broad future power is offset by halving the primary recovery action. It does not retroactively upgrade the current deck. |

### Shop — 4

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `potionSash` | 🧪 **小瓶背帶**; two empty bottle loops unfold | Merchant relic slot only; Any | Increase potion capacity by **2 slots** immediately and for the rest of the run. Existing potions stay in their original order. | Two outlined slots pop into the inventory; `藥水格 +2`. | Potion collecting and `goldenDropper`. | Buys flexibility rather than direct power and only pays off if future potions are found or purchased. |
| `scoreCouponSeal` | 🏷️ **樂譜折價章**; price tags receive a music-note stamp | Merchant relic slot only; Any | Character and Colorless card prices are **20% lower**, rounded up to the nearest whole gold with minimum 1. It does not discount relics, potions, or removal and does not change the current purchase price of itself. | Eligible prices flip once to the stamped price. | Deck shaping and late shops. | Narrow discount avoids collapsing the whole economy while letting a shop-focused route buy approximately one extra card. |
| `noteEraser` | 🧽 **音符橡皮擦**; one card outline gently fades | Merchant relic slot only; Any | Immediately after purchase, remove **one removable permanent deck-card instance for free**. Basic cards and Curses are legal; locked/special cards are not. If no card is removable, this relic is not offered. | Selected card fades into an eraser crumb trail after confirmation. | Deck consistency and Curse repair. | Its value is one precise removal, paid through the relic price and shop opportunity rather than repeating each visit. |
| `echoMegaphone` | 📣 **回聲擴音筒**; Echo bell wave grows by one ring | Merchant relic slot only; Echo Mage only | Increase Echo's once-per-enemy-per-player-turn bonus damage from **+2 to +3**. It applies to future triggers only and does not change Echo duration. | Echo hit shows a larger third ring and `🔔 +3`. | Any Echo application and multi-target marking. | A focused, purchasable character payoff is powerful only after the deck invests in Echo. |

### Event — 3

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `moonMusicBox` | 🌙 **月光音樂盒**; moonlight links the box to one card | Event relic pool only; Any | On acquisition, bind one removable Attack, Skill, or Power card instance in the deck. The first time that exact instance is correctly cast each combat, draw **1 card** after it resolves. Upgrading preserves the binding; removing it makes the relic dormant. | A moon thread joins the chosen card; trigger shows `月光抽 1`. | Favorite upgraded card and compact decks. | The player chooses consistency, but must still draw and successfully cast the bound instance. |
| `rainSoundTube` | 🌧️ **雨聲筒**; two blue drops become a shield | Event relic pool only; Any | At the start of the enemy turn, if the hero has **0 Block**, gain **2 Block** once before the first enemy acts. If any Block remains, gain nothing. | Two drops click into a shield; `🛡️ +2`. | Aggressive turns and partial safety. | The small safety net cannot stack with saved Block and is weaker than spending a card on defense. |
| `choirRibbon` | 🤝 **合唱緞帶**; three child-shaped notes fill one by one | Event relic pool only; Any | After every **third combat victory** following acquisition, heal **5 HP** and reset the counter to zero. All victories advance it; abandonment and non-combat rooms do not. | Three pips stay visible; the third becomes a heart and shows `♥ +5`. | Long routes and choosing more combats. | Delayed, predictable sustain rewards commitment without replacing immediate campfire healing. |

### Special — 3

These are the three optional-ending keys. They cannot be bought, rolled, sold,
duplicated, or removed. Individually they have no combat effect; collecting all
three before the Act III boss opens Act IV after the boss reward flow.

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `warmToneKey` | 🔥 **暖音鑰**; orange note-key | Choose instead of Rest or Smith at one eligible rest site; Any; only after Act IV unlock | Records the warm key for this run and consumes that rest-site action. Cannot be chosen again once owned. | Key rises from the fire; one of three large key sockets lights. | Trades immediate healing/upgrading for optional-ending access. | The opportunity cost is explicit and player-controlled rather than a hidden combat penalty. |
| `hiddenToneKey` | 💎 **藏音鑰**; blue crystal note-key | Choose instead of the guaranteed Treasure relic; Any; only after Act IV unlock | Records the hidden key and forfeits that room's relic. Any gold in the chest is still received. Cannot be chosen again once owned. | Relic silhouette folds into a blue key; second socket lights. | Route planning and optional-ending access. | Costs one full relic while retaining a small treasure consolation. |
| `braveToneKey` | 💚 **勇音鑰**; green winged note-key | Reward from a visible empowered elite; Any; only after Act IV unlock | Records the brave key after that elite is defeated. It is granted in addition to normal elite rewards and cannot be found elsewhere. | Green key flies from the defeated elite; third socket lights and the Act IV door pulses. | High-risk combat route and optional-ending access. | Payment is the empowered fight rather than sacrificing a reward; visibility keeps the risk fair. |

### Legacy continuity

No live relic ID is renamed:

| Existing ID | New classification | Compatibility decision |
|---|---|---|
| `tuningFork` | Starter | Remains Echo Mage's starting relic with the current +2 first-hit effect. |
| `shieldCharm` | Common | Existing saved effect remains start-of-combat Block 2. |
| `coinPouch` | Common | Old new-run setup and future mid-run acquisition both grant 14 gold once. Save migration must mark the pickup as already resolved. |
| `morningSpark` | Common | Existing saved effect remains first-turn Energy 4. |
| `luckyDraw` | Common | Existing saved effect remains one extra opening draw. |

When migrating a V1 save, `coinPouch` must not grant another 14 gold merely
because the new relic collection model loads it. The other four effects are
derived at combat creation and need no one-time migration flag.

## Potions — 20 designs

Each row's rarity tier is the bold subsection that contains it.

### Inventory, drops, and duplicate rules

- The base inventory has **3 slots**. A potion remains between rooms until used
  or discarded. Using one costs **0 Energy**, is not a card play, and never
  opens the 注音 casting screen.
- Drop chance starts at **40% at the beginning of each act**, rises by 10
  percentage points after an eligible fight with no drop, and falls by 10 after
  a drop. Clamp the chance to **10%–80%**. The updated value applies to the next
  eligible fight.
- After a successful drop roll, rarity is **65% Common, 25% Uncommon, 10%
  Rare**. Rarity has no pity offset. Shops use the same rarity weights unless an
  authored event specifies a tier.
- Potion IDs may repeat across a run and occupy separate slots. One merchant
  inventory cannot display the same potion ID twice; reroll within the same
  rarity, then any rarity if that tier has no eligible alternative.
- If inventory is full, the reward remains on screen until the player either
  leaves it or confirms replacement of one occupied slot. A potion is never
  silently discarded.
- A combat potion can be used only during the player's actionable combat phase,
  not during casting, animations, enemy actions, victory, or defeat. The healing
  potion is additionally usable from the map pause inventory.
- Targeted potions enter a clear targeting state and are consumed only after a
  valid target and confirmation. Canceling returns the potion to its slot.
- Different potion buffs stack additively unless a row says “replace/maximum.”
  Two copies are two independent consumables.

### Common — 10

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `guardBubblePotion` | 🫧 **護盾泡泡**; large blue bubble | Common potion pool; Any; combat | Gain **8 Block** immediately. Adds to existing Block and expires under normal Block rules. | Bubble wraps hero; `🛡️ +8` with a soft pop. | Surviving a visible large intent or freeing Energy for offense. | Slightly stronger than a good 1-Energy defensive card because the potion is scarce and single-use. |
| `soundPebblePotion` | 💫 **音波小石**; bright pebble and one straight trail | Common potion pool; Any; combat; one enemy | Deal **6 direct damage** to the selected enemy. Block absorbs it; it is not an Attack and cannot trigger Echo or Attack relics. | Pebble strikes once; `-6`. | Finishing a target without spending Energy or risking a card cast. | Equals a strong 1-Energy Common Attack, appropriate for an immediate consumable. |
| `warmHoneyPotion` | 🍯 **蜂蜜暖茶**; honey heart fills from the bottom | Common potion pool; Any; combat or map | Heal **5 HP**, not above max HP. Disabled at full HP; healing is immediate and persists. | Golden heart fills; `♥ +5`. | Route survival and preserving a Smith choice. | Five HP is meaningful but far below the 16-HP baseline Rest. |
| `sparkSodaPotion` | ⚡ **火花汽水**; two bubbles light Energy gems | Common potion pool; Any; combat | Gain **2 Energy** for the current player turn. It may exceed base maximum; unused bonus Energy disappears at turn end. | Two bubbles pop into gems; `⚡ +2`. | Expensive hands, Powers, and recovery after an awkward draw. | Two Energy is powerful for one turn but still requires successful card casts to convert it into value. |
| `pageJuicePotion` | 📖 **翻頁果汁**; three pages fan from the deck | Common potion pool; Any; combat | Draw **3 cards** immediately, respecting the 10-card hand cap. Normal draw order is used and remains hidden beforehand. | Three page pips fly to hand; `抽 3 張`. | Finding defense, targets, or setup in a weak hand. | Three choices with no Energy is strong but can be wasted by hand cap or insufficient Energy. |
| `echoDropPotion` | 🔔 **回音水滴**; blue drop becomes a bell | Common potion pool; Echo Mage only; combat; one enemy | Apply **3 turns of Echo** to the target using the normal maximum-duration rule. `echoSandglass` changes this application to 4. | Bell drop lands; `回音 3`. | Immediate access to the character's core payoff. | Creates setup without dealing damage, so value still depends on subsequent successful Attacks. |
| `loudSyrupPotion` | 📢 **亮聲糖漿**; one red sound wave waits beside the hero | Common potion pool; Any; combat | The next direct Attack hit this combat deals **+3 damage**, then the buff is consumed. Only the first hit of a multi-hit Attack receives it. Multiple doses add +3 to the same next hit. | Waiting wave attaches to hero, then bursts as `📢 +N`. | Frontload and intentional first-hit planning. | Half of a strong Common Attack, but it can combine with an existing card and starter-relic hit. |
| `steadyHandPotion` | ✋ **穩手氣泡飲**; small blue `+1` rests on the hero | Common potion pool; Any; combat | For the rest of combat, each card effect that grants Block grants **+1 Block once per card**, not per Block effect or target. Multiple doses stack additively. | Blue `+1` hops from each defensive card to the shield. | Block-heavy and draw/Block hybrid decks. | Requires several successful defensive casts to outperform the immediate Block potion. |
| `clearVoicePotion` | 🍵 **清聲茶**; gray clouds rinse away | Common potion pool; Any; combat | Remove all current **失準** and **裂音** from the hero. It does not prevent later applications and is disabled if neither is present. | Gray status icons wash out; `清乾淨了`. | Debuff-heavy encounters and preserving reliable calculations. | Narrow but complete cleansing answers both hero debuffs in the encounter bible and makes intent math trustworthy. |
| `sleepyMistPotion` | 😴 **慢拍霧**; one sleepy cloud covers a monster's intent | Common potion pool; Any; combat; one enemy | The target's **next Attack action** deals **2 less damage per hit**, minimum 0, then the effect expires. It persists through non-Attack intents until consumed. Reapplication uses the greater reduction, not the sum. | Intent numbers visibly shrink; cloud disappears after that action. | Multi-hit defense and planned no-Block turns. | Strong against a chosen attack but cannot affect every enemy and is weaker against one large hit than direct Block. |

### Uncommon — 6

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `chorusBurstPotion` | 🎆 **合唱爆泡**; one wave splits toward all monsters | Uncommon potion pool; Any; combat | Deal **4 direct damage to every living enemy** simultaneously. Enemy Block applies separately; it is not an Attack. | Colored wave reaches every target; each shows `-4`. | Multi-enemy cleanup and shield breaking. | Lower single-target efficiency than `soundPebblePotion`, with high upside only in wider encounters. |
| `memorySyrupPotion` | 🫙 **記憶糖漿**; a card climbs out of a jar | Uncommon potion pool; Any; combat | Choose one Attack or Skill in discard and return that exact instance to hand. It costs **0 this turn**, then returns to its normal cost. It follows normal cast and lifecycle rules. Disabled with no eligible card or a full hand. | Chosen card rises with a temporary gold `0`. | Reusing a key defense, attack, or Exhaust card before reshuffle. | Selection plus cost relief is stronger than draw, but requires the card to have been used or discarded first. |
| `layeredShieldPotion` | 🧊 **雙層護盾飲**; two ice rings appear, one delayed | Uncommon potion pool; Any; combat | Gain **5 Block now** and schedule **5 Block at the start of the next player turn**. Additional doses add both amounts independently. Delayed Block is lost if combat ends first. | First ring forms now; second ring waits beside the turn button then opens next turn. | Covering a multi-turn attack cycle or enabling a setup turn. | Ten total Block is strong but split timing prevents it from being a universal emergency answer. |
| `practiceInkPotion` | 🖋️ **練習亮墨水**; green ink writes `+` on one hand card | Uncommon potion pool; Any; combat; one hand card | Temporarily upgrade the selected card by **one legal level for this combat**. It keeps the upgrade through draw/discard/Exhaust movement and reverts after combat. Already-maxed cards are ineligible. | Card receives bright green changed values and `+`; run-deck copy remains unchanged in the adult preview. | Testing upgrades and improving a repeatedly drawn card. | Delayed value requires drawing and successfully casting the card; it also previews the permanent Smithing system. |
| `heldNotePotion` | 🎶 **延音果露**; three gold note clips appear | Uncommon potion pool; Any; combat | Select up to **3 cards in hand**. If still in hand at the next end turn, each is Retained once; its marker is then removed. Playing, discarding, or Exhausting a marked card removes its marker. | Gold clips attach to chosen cards; clipped cards slide into next turn rather than discard. | Expensive cards, combo assembly, and intentional hand planning. | Provides control instead of raw numbers and costs hand space while the cards wait. |
| `wideEchoPotion` | 🛎️ **滿場回音露**; one bell wave touches the whole enemy row | Uncommon potion pool; Echo Mage only; combat | Apply **2 turns of Echo** to every living enemy using the normal maximum-duration rule. `echoSandglass` changes each application to 3. | One broad bell ring marks every enemy; `全體回音 2`. | Area Attacks, target switching, multi-enemy defense triggers. | Lower duration than the Common single-target potion trades focus for coverage. |

### Rare — 4

| Stable ID | Name and visual cue | Source / restriction | Exact effect, timing, and stacking | Preschool feedback | Synergy | Balance rationale |
|---|---|---|---|---|---|---|
| `lifelineThermosPotion` | 🛟 **救援保溫瓶**; cork is tied to a heart float | Rare potion pool; Any; automatic combat use | If HP would fall to 0 while this potion is slotted, automatically consume it, cancel that lethal HP loss, and set HP to **30% of max HP**, rounded up. Only one copy can trigger for the same damage instance. | Screen pauses, heart float catches hero, `回來了！♥ N`. | Risky elite/boss paths and protecting a long run. | A rare occupied slot prevents one defeat but does not heal proactively or protect against the next attack. |
| `rhythmRepeatPotion` | 🥁 **重拍回聲飲**; next card has two matching beat rings | Rare potion pool; Any; combat | The next correctly cast Attack or Skill this turn resolves its ordered effects **twice**. Energy and 注音 are paid once; targets are reused; X uses the same paid X both times; lifecycle/Exhaust happens once after both resolutions. Failed casts do not consume the buff. Multiple doses add one additional resolution each. | Two beat rings count `1、2`; the card visibly resolves twice. | High-value hybrid, multi-hit, Block, or draw cards. | Doubling the chosen effect is intentionally run-saving, but remains gated by a successful cast and a one-use rare resource. |
| `fullScorePotion` | 📚 **滿譜氣泡飲**; pages fill every empty hand slot | Rare potion pool; Any; combat | Gain **1 Energy**, then draw until the hand reaches **10 cards** or the draw/discard piles contain no cards. Standard shuffle and hand-cap rules apply. | One gem lights, then empty hand-slot outlines fill left to right. | Large decks, discard recursion, expensive decision turns. | Its ceiling is high after a poor draw, while a nearly full hand sharply reduces its value. |
| `masteryBlendPotion` | 🌈 **熟練調音飲**; red and blue tuning waves wrap the hero | Rare potion pool; Any; combat | For the rest of combat, every direct Attack hit deals **+2 damage**, and each card that grants Block grants **+2 Block once per card**. Multiple doses stack additively. | Persistent red `+2` and blue `+2` badges appear; matching floats join later cards. | Multi-hit offense, defensive engines, and long boss fights. | A rare battle-long scaling potion is strongest in long fights and still requires repeated successful casts to create value. |

## Balance and interaction guardrails

1. **Casting remains the gate.** No relic or potion automatically plays a card,
   supplies a correct answer, or changes the two-second learning reveal. Returned,
   repeated, or discounted cards still follow the exact rules written above.
2. **Preschool math stays visible.** Enemy intents include `hurriedBaton` and
   `sleepyMistPotion` changes before the action. Upgrade and cost modifiers are
   printed on the affected card before selection.
3. **One axis per ordinary relic.** Common and Uncommon relics generally change
   one number or one timing hook. Boss relics may change a system but must show
   benefit and cost in the same confirmation panel.
4. **Current scale anchors.** A one-use Common potion is approximately one good
   1-Energy card: 6 damage, 8 Block, or 2 Energy with no effect by itself.
   Repeatable relic output is lower or conditional.
5. **Acquisition upgrades do not chain.** When multiple acquisition-upgrade
   effects are eligible, determine the card's type once and apply at most one
   normal upgrade step. `restlessSongbook` and a type relic do not turn an
   ordinary card into `+2`; a specifically repeat-upgradable card gains one
   level from each distinct eligible relic effect.
6. **Temporary card identity is stable.** `practiceInkPotion`,
   `memorySyrupPotion`, and `encoreToken` operate on card-instance UIDs so
   duplicates never receive accidental shared state.
7. **Act IV keys are not power.** Their value is access and their cost is route
   opportunity. They must not count as ordinary relics in balance telemetry.

## Validation checklist

### Static content validation

- [ ] Exactly 40 unique relic IDs: 1 Starter, 8 Common, 8 Uncommon, 8 Rare,
      5 Boss, 4 Shop, 3 Event, 3 Special.
- [ ] Exactly 20 unique potion IDs: 10 Common, 6 Uncommon, 4 Rare.
- [ ] Every entry has a unique ID and a Chinese name, icon, tier, source restriction,
      exact effect, feedback cue, synergy note, and balance rationale.
- [ ] `tuningFork`, `shieldCharm`, `coinPouch`, `morningSpark`, and `luckyDraw`
      remain valid stable IDs.
- [ ] Exactly one future-acquisition upgrade relic exists for Attack, Skill,
      and Power, and all reference legal card types and authored upgrades.
- [ ] All targeted potions declare a valid target; all hand/deck selectors have
      a disabled state when no legal selection exists.

### Unit and seeded-system tests

- [ ] Relic pools exclude owned, wrong-character, and wrong-source entries;
      exhaustion falls back to 20 gold without looping.
- [ ] Legacy `coinPouch` saves do not receive pickup gold twice.
- [ ] Start-of-combat and start-of-turn effects resolve in documented order.
- [ ] First-hit, once-per-turn, once-per-combat, multi-hit, Echo, Block, and
      correct/failed-cast counters consume and reset exactly once.
- [ ] Upgrade-on-acquisition affects only future permanent instances; duplicate
      cards and temporary upgrades remain isolated by UID.
- [ ] Boss drawbacks alter displayed draw, HP, enemy intent, or Rest preview
      before the player commits another action.
- [ ] Drop chance begins/resets at 40%, moves by 10%, clamps at 10%–80%, and
      potion rarity converges to 65%/25%/10% across seeded simulations.
- [ ] Full inventory replacement, discard, duplicates, merchant uniqueness,
      targeting cancel, and automatic lifeline timing never consume the wrong
      potion.
- [ ] Potion damage, Block, draw, Energy, Retain, temporary upgrade, repeated
      effects, and battle-long modifiers match their displayed values.
- [ ] No relic or potion bypasses full 注音 casting or accelerates speech and
      successful-answer teaching pauses.

### Tablet and accessibility review

- [ ] Relic and potion tooltips expose exact timing and numeric effects in the
      pause menu, reward screen, shop, combat HUD, and designer viewer.
- [ ] Potion slots and targeting controls remain at least 64px on 1280×720,
      1024×768, and 768×1024 layouts without horizontal page overflow.
- [ ] Trigger identity remains understandable with reduced motion: icon,
      number/status change, and combat-log text remain when particles/shakes are
      disabled.
- [ ] Color is never the only distinction between rarity, positive/negative
      effects, selected targets, or the three key states.

## Review questions before implementation

The roster is mechanically complete, but implementation should not begin until
the owner reviews these balance-sensitive groups together:

1. the three acquisition-upgrade relics and `restlessSongbook` interaction;
2. the five run-defining Energy/turn/recovery Boss choices;
3. Echo-specific relic and potion density for the final 75-card pool;
4. automatic defeat prevention from `lifelineThermosPotion`;
5. whether potion drop clamping at 10%–80% produces enough inventory decisions
   over the project's 15-climb-floor-plus-boss acts.
