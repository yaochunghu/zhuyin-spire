# Event and encounter bible

> **Status:** review specification, not implemented content. This document is the
> source of truth for the first complete event and encounter pass. Values are
> scaled for a 40-HP hero, three Energy, five cards per turn, persistent HP, and
> a full 注音 cast before every playable card. Names, prose, and mechanics are
> original to **注音之塔**.
>
> **Character compatibility:** deterministic intents, capability tests,
> encounters, events, and economy remain inputs to 共鳴武者 testing. Any
> Echo-named boss, reward, status interaction, or flavor dependency must be
> reviewed through [DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md) before activation.

## Design promises

- An enemy intent is a promise: exact damage, hit count, Block, and named status
  are visible before the player commits Energy.
- One normal encounter teaches at most one unfamiliar rule. Elites test a deck
  capability; bosses combine familiar rules rather than hiding a surprise.
- Event buttons show exact HP, maximum HP, gold, card, relic, potion, and Curse
  changes before confirmation. A child never has to infer the price from prose.
- Difficulty 15 uses the authored `A15` event result in this document. It never
  silently changes a number after the player selects a choice.
- The first tutorial fight remains the separate six-HP `tutorialSlime`; it is not
  part of random encounter generation.

## Shared vocabulary and reward contracts

### Intent notation

| Notation | Meaning |
|---|---|
| `A5` | Attack once for 5 |
| `M2×3` | Attack three times for 2 each; intent shows `6 · 3下×2` |
| `H9` | Heavy attack once for 9; uses the 💥 warning |
| `B7` | Gain 7 Block |
| `N1` | Put one **雜音** Status into the discard pile |
| `O1` | Apply one **失準** to the hero |
| `C1` | Apply one **裂音** to the hero |
| `Amp1` | Enemy gains one **擴音** |

Enemy Block clears at the start of that enemy's next action. Status applications
still happen when the associated attack is completely Blocked, unless the move
explicitly says otherwise.

### Combat statuses required by this roster

| Stable id | Name | Exact rule | Child-facing explanation |
|---|---|---|---|
| `st_noise` | 雜音 | Unplayable, Ethereal Status. It occupies a draw and Exhausts if left in hand at turn end. Removed after combat. | `🎵 這張不能出，回合結束會消失` |
| `st_scorch_note` | 灼音 | Unplayable Status. At the end of the hero turn, lose 2 HP, then Exhaust it. Removed after combat. | `🔥 回合結束 -2❤️，然後消失` |
| `debuff_off_key` | 失準 | Each hero Attack hit deals 1 less damage per stack, minimum 0. Remove one stack at the end of the hero turn. | `🎯 攻擊每下 -1，回合後好一點` |
| `debuff_cracked_sound` | 裂音 | Enemy Attack hits deal 1 extra damage per stack before Block. Remove one stack after all enemies finish their round. | `💢 怪物攻擊每下 +1，敵方回合後好一點` |
| `buff_amplify` | 擴音 | The enemy's Attack hits deal 1 extra damage per stack for the rest of combat. | `📣 這隻怪之後每下 +1` |
| `buff_refrain` | 疊唱 | After an Attack card damages this enemy, it gains 2 Block once per card, not once per hit. Persists for combat. | `🎶 被一張攻擊牌打到就 +2🛡️` |

Difficulty modifiers are cumulative. Enemy tables list base HP and patterns.
Difficulty 2/3/4 add +1 to each normal/elite/boss attack hit respectively;
Difficulty 7/8/9 add 10% maximum HP to normal/elite/boss enemies, rounded up.
The `advanced` column replaces the named behavior at Difficulty 17/18/19 for
normals/elites/bosses.

Apply stacked modifiers in this exact order:

1. Select the base or advanced pattern.
2. Calculate maximum HP from base, then apply Difficulty HP, Moon Gong, and
   empowered-key multipliers in that order, rounding up after each multiplier.
3. Calculate each printed attack hit from the selected pattern, then add the
   tier Difficulty bonus and empowered-key bonus.
4. At resolution, add current `buff_amplify` and the hero's
   `debuff_cracked_sound` to each hit, then apply Block.

Thus an Act II empowered elite base hit of 3 at Difficulty 3 resolves as
`3 + 1 elite difficulty + 1 empowered = 5` before combat statuses.

### Rewards

| Tier | Exact reward |
|---|---|
| Normal | 16–20 gold (`16 + seeded 0…4`), choose one of three normal-pool cards or `不拿牌`, then the adaptive potion roll |
| Elite | 32–36 gold (`28 + 4 + seeded 0…4`), choose one of three elite-pool cards or skip, one non-duplicate relic, then the adaptive potion roll |
| Act I/II boss | 96–104 gold, choose one of three Rare cards, then choose one of three Boss relics |
| Act III boss | 96–104 gold and the Rare-card choice, then finish the normal run; no Boss relic is offered |
| Event fight | Only the reward stated by that event; it does not also grant normal-fight gold/cards |
| Act IV elite | The ordinary elite reward; it never drops a key, and the fixed route proceeds directly to the final boss |
| Act IV boss | Mastery victory, run score, and discovery record; no further economy reward |

## Encounter selection and controlled randomness

Use independent, serializable seeded streams for map topology, room outcome,
encounter, enemy behavior, rewards, and combat. Animation, speech, particles,
and UI inspection never consume gameplay RNG.

- Act I's first three completed normal fights draw from its easy recipes. Acts II
  and III use easy recipes for their first two completed normal fights. Event
  fights do not consume this quota.
- Later normal fights draw from the hard pool. A recipe cannot repeat within the
  next two completed normal fights. If filtering empties the pool, forget the
  older of those two entries and roll again.
- Each act owns exactly three elite definitions. An elite cannot repeat the
  previous elite in the same act. An empowered key elite obeys the same rule.
- One of three bosses is rolled when the act map is generated, stored in the
  save, and shown on the map immediately. Reopening a save cannot reroll it.
- Multi-enemy members act left to right. Recipes list enemies in that order.
- Weighted behavior is not required in this roster: every normal and elite uses
  a visible deterministic cycle. Boss phase changes are deterministic and are
  triggered immediately after the player action that crosses the threshold.

Legacy saves remain resolvable: `fangPair` aliases `strikerFodder`, `earlyMix`
aliases `swarmFodder`, and `eliteDuo` may finish as its old
`eliteBee + slimeWeak` fight but is never newly generated. Deprecated `boss`
resolves as `boss1`. No saved ID is silently redirected to a mechanically
different fight.

All 24 live enemy-definition IDs are therefore accounted for: 21 appear as
active rows below, `tutorialSlime` remains the isolated tutorial enemy,
`fangSoft` remains the documented helper, and `boss` remains the compatibility
alias. Expansion must add definitions around those IDs rather than invalidating
an in-progress save.

## Act I — 入門塔

### Normal enemies

The first six rows preserve the existing definitions. `fangSoft` remains a
legacy encounter helper and is not a standalone pool entry.

| Stable id | Name | HP | Base cycle | Teaching job | Advanced at Difficulty 17 |
|---|---|---:|---|---|---|
| `slimeWeak` | 軟軟史萊姆 🟢 | 10 | `A3, A3, M2×2` | Safe damage race and first target in a pair | Cycle becomes `A3, M2×2, A4` |
| `slime` | 小史萊姆 🟢 | 13 | `A4, B4, A4, A5` | Read an enemy Block turn | Second `A4` becomes `A5` |
| `rock` | 小石怪 🪨 | 17 | `B7, A4, B6, A5` | Break Block before it attacks | First Block becomes `B9` |
| `bat` | 小蝙蝠 🦇 | 12 | `M2×2, M2×3, A4, M2×2` | Read hit count as well as total | Second move becomes `M3×2` |
| `ember` | 小火苗 🔥 | 14 | `A3, H7, B4, A4, H7` | Save Block for a visible heavy hit | Each `H7` becomes `H8` |
| `fang` | 尖牙怪 🦷 | 16 | `A5, A5, M3×2, A6` | Consistent pressure | First two moves become `A5, A6` |

For compatibility, `fangSoft` remains a 12-HP helper with
`A4, A4, M2×2, A5`; it appears only inside `strikerFodder` and legacy saves.

### Normal encounter recipes

| Pool | Stable id | Enemies, left to right | Primary test |
|---|---|---|---|
| Easy | `a1_soft_start` | `slimeWeak` | First non-tutorial damage race |
| Easy | `a1_small_guard` | `slime` | Attack versus Block intent |
| Easy | `a1_bat_solo` | `bat` | Multi-hit reading |
| Easy | `slimePair` | `slimeWeak, slimeWeak` | Automatic target and finishing one enemy |
| Hard | `tankFodder` | `rock, slimeWeak` | Target priority: exposed fodder or guarded tank |
| Hard | `swarmFodder` | `bat, slimeWeak` | Multi-hit defense with two intentions |
| Hard | `strikerFodder` | `fangSoft, slimeWeak` | Remove the softer attacker first |
| Hard | `heavyFodder` | `ember, slimeWeak` | Block the heavy turn while managing a second target |
| Hard | `slimeTriple` | `slimeWeak, slimeWeak, slimeWeak` | Area damage and three simple intents |
| Hard | `a1_stone_and_fang` | `rock, fangSoft` | Defense clock versus steady pressure |

### Elites

| Stable id | Name | HP | Base cycle and rule | Capability test | Advanced at Difficulty 18 |
|---|---|---:|---|---|---|
| `eliteArmor` | 重甲守護 🛡️ | 30 | `B10, A5, M3×2, H9, B8` | Sustained damage through Block | Start with 6 Block; `H9→H10` |
| `eliteBee` | 蜂刺菁英 🐝 | 25 | `M2×3, A6, M2×3, B5` | Efficient Block against repeated hits | Both multi moves become `M3×3` |
| `eliteBoom` | 爆裂菁英 💣 | 26 | `A5, H10, M3×2, B6` | Frontload before repeated heavy pressure | `H10→H12`; after its first Heavy, gain `Amp1` |

### Bosses

| Stable id | Name | HP | Exact behavior | Deck test | Advanced at Difficulty 19 |
|---|---|---:|---|---|---|
| `boss1` | 塔守護獸 🐉 | 42 | Repeat `A6, B8, M3×2, H10, M2×3, A7` | Balanced attack and defense | Starts with 8 Block; `H10→H12` |
| `bossTempoGolem` | 節拍石像 🥁 | 46 | Repeat `A5, B9, M2×3, Amp1, H10`. `Amp1` has no damage that turn. | End a scaling fight before amplification wins | First `Amp1` also gains 5 Block; `H10→H11` |
| `bossBellMother` | 鐘母 🔔 | 40 | Repeat `A4+N1, B8, M2×3, H9`. At ≤20 HP, immediately gain 8 Block once, then use `M3×3` before returning to the cycle. | Draw consistency under light deck pollution | The phase Block is 12 and adds `N1` |

## Act II — 迴音機房

### Normal enemies

Four definitions preserve current values. Two original enemies replace Act I
reuse so this act has its own complete normal pool.

| Stable id | Name | HP | Base cycle | Teaching job | Advanced at Difficulty 17 |
|---|---|---:|---|---|---|
| `armor` | 盔甲怪 🛡️ | 22 | `B9, A5, B7, M3×2, A6` | Plan damage around repeated Block | Second Block becomes `B10` |
| `spike` | 尖刺怪 🌵 | 24 | `A6, M3×2, A7, B5, M2×3` | Defend while maintaining output | `A7→A8` and `B5→B7` |
| `fangHard` | 兇尖牙怪 🦷 | 20 | `A5, H9, M3×2, B5, A6` | Read a faster heavy cycle | `H9→H11` |
| `toad` | 毒蛙 🐸 | 21 | `M2×3, A6, M3×2, B6` | Multi-hit defense | First move becomes `M3×3` |
| `bellMoth` | 鐘粉蛾 🦋 | 19 | `A4+N1, B6, M2×3, A6` | Recognize a harmless-looking Status cost | First move adds `N2` instead of `N1` |
| `dustDrum` | 塵鼓怪 🥁 | 26 | `B8, A6, Amp1, M3×2` | Decide when to race permanent scaling | `Amp1` also gains 6 Block |

### Normal encounter recipes

| Pool | Stable id | Enemies, left to right | Primary test |
|---|---|---|---|
| Easy | `a2_armored_entry` | `armor` | Higher-HP Block timing |
| Easy | `a2_hard_fang_entry` | `fangHard` | Heavy preparation |
| Easy | `a2_moth_entry` | `bellMoth` | First 雜音 tutorial |
| Easy | `a2_toad_entry` | `toad` | Multi-hit arithmetic |
| Hard | `midPair` | `armor, toad` | Tank plus multi-hit pressure |
| Hard | `midStrike` | `spike, slime` | Remove the lower-HP support target |
| Hard | `a2_spike_moth` | `spike, bellMoth` | Damage pressure plus deck pollution |
| Hard | `a2_drum_slime` | `dustDrum, slimeWeak` | Scaling target priority |
| Hard | `a2_toad_chorus` | `toad, toad` | Area damage and repeated hits |
| Hard | `a2_fang_moth` | `fangHard, bellMoth` | Heavy defense with reduced draw quality |

### Elites

`eliteBee`, `eliteBoom`, and `eliteArmor` leave the generated Act II pool; old
saves can still finish them. This makes the act's three elite tests distinct.

| Stable id | Name | HP | Base cycle and rule | Capability test | Advanced at Difficulty 18 |
|---|---|---:|---|---|---|
| `eliteStorm` | 風暴菁英 ⛈️ | 34 | `M3×3, B8, A8, H12` | Survive burst, then exploit its Block turn | `M3×3→M4×3` |
| `eliteConductor` | 失控指揮 🎼 | 38 | `A6+N1, B8+Amp1, M3×3, H12` | Race scaling while managing Status draws | First move adds `N2`; Block becomes 10 |
| `eliteMuteDrum` | 無聲大鼓 🥁 | 40 | Starts with 8 Block; repeat `A8+O1, H13, B10, M3×3` | Produce damage despite temporary Attack reduction | `O1→O2`; starts with 12 Block |

### Bosses

| Stable id | Name | HP | Exact behavior | Deck test | Advanced at Difficulty 19 |
|---|---|---:|---|---|---|
| `boss2` | 雙翼監守 🦅 | 58 | Repeat `A8, M4×2, B10, H13, M3×3, A9` | Dependable output against alternating burst | Starts with 10 Block; `H13→H15` |
| `bossFurnaceOrgan` | 熔炉風琴 🎹 | 62 | Repeat `A7, add st_scorch_note to discard, B10, M4×2, H14`. At ≤31 HP, immediately add two `st_scorch_note` once. | Exhaust/status tolerance and ending a long fight | Each regular Status move adds two Scorch Notes; phase adds three |
| `bossEchoSerpent` | 迴音蛇 🐍 | 56 | Starts with `buff_refrain`. Repeat `A7, M3×3, B9, H13`. At ≤28 HP, gains `Amp1` once. | Efficient attacks instead of many low-impact attacks | `buff_refrain` grants 3 Block per damaging Attack card |

## Act III — 星聲塔頂

### Normal enemies

`spike` and `fangHard` stop appearing as native Act III singles. Three original
definitions complete the act alongside the current `wraith`, `owl`, and
`crystal`.

| Stable id | Name | HP | Base cycle | Teaching job | Advanced at Difficulty 17 |
|---|---|---:|---|---|---|
| `wraith` | 幽影 👻 | 28 | `A7, B7, M3×3, H11, A8` | Late-game mixed pressure | `M3×3→M4×3` |
| `owl` | 夜梟 🦉 | 27 | `A6, H12, M3×2, B8, H11` | Repeated heavy coverage | Second Heavy becomes `H13` |
| `crystal` | 晶盾怪 💠 | 30 | `B12, A7, B10, M4×2, A8` | High Block and efficient damage | Starts with 8 Block |
| `mirrorNote` | 鏡音 🪞 | 26 | `A7+O1, B9, M3×3, H11` | Attack through temporary 失準 | First move applies `O2` |
| `crownBell` | 冠鐘 👑 | 32 | `A8, B6+Amp1, M3×3, H12` | Prioritize a permanent scaler | Block becomes 9 |
| `voidChoir` | 空洞合唱 🌌 | 25 | `N2, A8, M3×3, B9` | Win through repeated draw pollution | Status move adds `N3` |

### Normal encounter recipes

| Pool | Stable id | Enemies, left to right | Primary test |
|---|---|---|---|
| Easy | `a3_wraith_entry` | `wraith` | Baseline late-act pressure |
| Easy | `a3_owl_entry` | `owl` | Heavy timing |
| Easy | `a3_mirror_entry` | `mirrorNote` | First 失準 reminder |
| Easy | `a3_crystal_entry` | `crystal` | Efficient damage through Block |
| Hard | `latePair` | `crystal, owl` | Tank plus heavy target priority |
| Hard | `lateMix` | `wraith, toad` | Late striker plus multi-hit support |
| Hard | `a3_crown_mirror` | `crownBell, mirrorNote` | Scaling versus output reduction |
| Hard | `a3_void_crystal` | `voidChoir, crystal` | Deck pollution behind a tank |
| Hard | `a3_twin_wraith` | `wraith, wraith` | Area damage and sustained defense |
| Hard | `a3_rooftop_trio` | `mirrorNote, voidChoir, slimeWeak` | Three-target priority with two statuses |

### Elites

| Stable id | Name | HP | Base cycle and rule | Capability test | Advanced at Difficulty 18 |
|---|---|---:|---|---|---|
| `eliteShadow` | 暗影菁英 🌑 | 36 | `A8, H12, M4×2, B9` | High-output fundamentals | `H12→H15` |
| `elitePrism` | 七音晶棱 🔷 | 44 | Starts with `buff_refrain`; repeat `B12, A9, M4×3, H14` | Fewer, higher-value Attacks | Starts with 10 Block; Refrain grants 3 Block |
| `eliteCrownChoir` | 冠冕合唱 👑 | 46 | `N2, A9+O1, B11+Amp1, M4×3` | Scaling and draw consistency under debuff | Status move adds `N3`; `O1→O2` |

### Bosses

| Stable id | Name | HP | Exact behavior | Deck test | Advanced at Difficulty 19 |
|---|---|---:|---|---|---|
| `boss3` | 注音終焉王 👑 | 72 | Repeat `A9, M3×3, B12, H14, M4×2, A10, H12` | Complete deck consistency and scaling | Starts with 12 Block; `H14→H17` |
| `bossMirrorChoir` | 萬鏡合唱 🪞 | 76 | Phase 1 repeats `A8+O1, B12, M3×3, N1`. At ≤38 HP, clear its debuffs, gain 15 Block and `Amp1`, then phase 2 repeats `M4×3, H15, B10`. | Switch from setup to a short damage race | Transition gains 22 Block and `Amp2` |
| `bossSilentCrown` | 寢靜之冠 🌑 | 68 | Starts with 12 Block. Repeat `A9+C1, B10, H15, N2, M4×3`. At ≤17 HP, immediately gains 14 Block once. | Prevent compounded per-hit damage while retaining finishers | Starts with 18 Block; low-HP Block becomes 20 |

## Act IV — 最後回音

Act IV opens only when all three keys were collected before the Act III boss.
It is a short, fixed route: campfire → shop → elite → final boss.

### Original key opportunity costs

| Stable id | Name | Exact opportunity cost | Presentation |
|---|---|---|---|
| `warmToneKey` | 暖音鑰 🔥 | At one campfire, choose the key instead of Rest, Smith, or any relic-added campfire action. The room is consumed. | Show the crossed-out campfire choices beside the key before confirmation. |
| `hiddenToneKey` | 藏音鑰 💎 | At the guaranteed treasure, choose the key instead of its relic. The room's ordinary gold is still granted, but no relic or potion replaces the sacrificed relic. | Show `拿鑰匙` versus the exact relic being forfeited, with retained gold shown separately. |
| `braveToneKey` | 勇音鑰 💚 | Choose a visibly empowered elite: +25% maximum HP, rounded up, and +1 damage to every attack hit. Victory grants the key in addition to the ordinary elite reward. | The elite node pulses with the key icon and shows both modifiers before entry. |

### Elite and final boss

| Stable id | Name | HP | Exact behavior | Advanced rule |
|---|---|---:|---|---|
| `eliteFinalRehearsal` | 終曲彩排 🎭 | 64 | Starts with 12 Block. Repeat `N2, A10, M4×3, B12+Amp1, H16`. At ≤32 HP, add one `st_scorch_note` to discard once. Reward uses the Act IV elite contract. | It always uses its advanced form: `N3`, starts with 18 Block, and phase adds two Scorch Notes. |
| `bossHeartOfSound` | 萬音之心 💖 | 108 | Starts with 15 Block. Phase 1 repeats `A10+C1, B14, M4×4, N2, H18`. At ≤72 HP, clear its debuffs, gain 18 Block and `buff_refrain`. At ≤36 HP, clear its debuffs, gain 22 Block and `Amp2`, then repeat `M5×4, H20, B14`. | On Difficulty 19+, phase Blocks are 24 and 30; the final multi becomes `M6×4`. |

The final boss never deals invisible start-of-turn damage and has no one-turn
kill timer. Its difficulty comes from familiar Block, hit-count, Status, and
scaling rules presented in earlier acts.

## Event rules

### Exact operation semantics

- `Lose N HP` bypasses Block. A paid-HP choice is disabled unless the hero will
  remain at 1 HP or more after paying it.
- Maximum-HP loss lowers current HP only when current HP would exceed the new
  maximum. Maximum-HP gain also heals by the same amount.
- `Remove` selects one removable physical deck instance. Story-locked cards are
  excluded; ordinary Basics and Curses are legal.
- `Upgrade` selects one physical instance with an authored remaining upgrade.
  `Upgrade two` requires two legal instances and resolves both selections before
  consuming the event.
- `Transform` removes the selected instance and rolls an unlocked card owned by
  the same character with the same rarity, excluding the removed definition.
  If that pool is empty, search Common, then Uncommon, then Rare. The new card is
  not upgraded. All rolls use the event RNG and are stored before reveal.
- A `random card` means an unlocked card from the stated character, rarity, and
  type. A `random relic` cannot duplicate an owned relic. A `random potion`
  follows potion rarity rules and requires an empty slot; otherwise its button
  is disabled.
- `Fight` saves the event and encounter before entering combat. Victory returns
  to the event reward; defeat ends the run normally. Saving cannot reroll it.
- `Leave` is always available, has no effect, and is never worsened at A15.

These four authored event rewards use the exact IDs and effects in the relic
bible. The first is also in the ordinary Common pool; the remaining three are
the complete Event relic pool:

| Stable id | Name | Exact effect |
|---|---|---|
| `pocketMetronome` | 口袋節拍器 | The first time the player successfully plays a third card in one turn, draw 1 card. Triggers at most once per turn. |
| `moonMusicBox` | 月光音樂盒 | On acquisition, bind one removable Attack, Skill, or Power. The first time that physical card is correctly cast each combat, draw 1 card. |
| `rainSoundTube` | 雨聲筒 | At the start of the enemy turn, if the hero has 0 Block, gain 2 Block before the first enemy acts. |
| `choirRibbon` | 合唱緞帶 | After every third combat victory following acquisition, heal 5 HP and reset its visible counter. |

Three persistent Curse dependencies are exact here and must use the same IDs in
the card bible:

| Stable id | Name | Exact effect |
|---|---|---|
| `cu_silence` | 失聲 | Unplayable persistent Curse. No additional effect. |
| `cu_heavy_beat` | 沉拍 | Unplayable persistent Curse. When drawn, draw 1 fewer card next turn; multiple copies stack. |
| `cu_stage_fright` | 怯場 | Unplayable persistent Curse. While in hand, the first Attack hit each turn deals 2 less damage, minimum 0. |

### Act I events: 7

| Stable id | Title | Eligibility | Exact choices | Difficulty 15 result | Preschool presentation and rationale |
|---|---|---|---|---|---|
| `event_a1_whispering_door` | 和聲門 🚪 | At least one upgradeable card | **貼著聽:** lose 4 HP; upgrade one card. **輕輕敲:** gain 35 gold. **離開.** | Listening costs 6 HP; knocking grants 25 gold. | Door speaks each result aloud; buttons show `-4❤️ → 升級` or `+35🪙`. Trades present safety for deck quality. |
| `event_a1_tuning_fountain` | 調音噴泉 ⛲ | Hero is damaged or has an empty potion slot | **洗洗臉:** heal 10 HP. **裝一瓶:** lose 2 maximum HP; gain one random potion. **離開.** | Heal 7; bottling loses 3 maximum HP. | Water rises to the exact new HP mark before confirmation. Offers recovery versus a portable tool. |
| `event_a1_lost_metronome` | 迷路的節拍器 ⏱️ | Does not own `pocketMetronome` | **帶著它:** lose 5 HP; gain `pocketMetronome`. **交給收藏家:** gain 45 gold. **離開.** | Taking it costs 7 HP; selling grants 35 gold. | Three pulsing card lamps preview the relic trigger. Teaches immediate value versus flexible gold. |
| `event_a1_bell_rope` | 低垂的鐘繩 🪢 | At least one unlocked Uncommon card | **輕拉:** gain 22 gold. **大力拉:** lose 5 HP; gain one random Uncommon card. **離開.** | Light pull grants 16 gold; hard pull costs 7 HP. | The rope has a small coin tag and a large card tag. This is a simple certainty-versus-quality choice. |
| `event_a1_dusty_score` | 灰塵樂譜 📜 | At least one removable card | **擦乾淨:** lose 6 HP; remove one card. **改寫:** transform one card. **離開.** | Cleaning costs 8 HP; rewriting also costs 2 HP. | The selected physical card is shown before and after. Introduces deck repair without hidden odds. |
| `event_a1_sleeping_chime` | 睡著的風鈴 🎐 | Hero is damaged or valid Common relic remains | **一起睡:** heal 8 HP. **叫醒它:** gain a random Common relic and `cu_silence`. **離開.** | Heal 6; waking also loses 2 HP. | The Curse appears beside the relic before selection. Teaches that a shiny reward can occupy future draws. |
| `event_a1_lantern_choir` | 燈籠合唱 🏮 | At least one removable card or current gold ≥20 | **點一盞燈:** pay 20 gold; remove one card. **一起唱:** gain 2 maximum HP and heal 2. **離開.** | Lamp costs 28 gold; singing grants 1 maximum HP and heals 1. | One button visibly shrinks the deck; the other lengthens the heart bar. Offers precision versus durable safety. |

### Act II events: 7

| Stable id | Title | Eligibility | Exact choices | Difficulty 15 result | Preschool presentation and rationale |
|---|---|---|---|---|---|
| `event_a2_heated_organ` | 發熱風琴 🎹 | Hero is damaged or has an upgradeable card | **調弦:** lose 7 HP; upgrade one card. **暖暖手:** heal 10 HP. **離開.** | Tuning costs 10 HP; warming heals 7. | Red and green heart previews make the direction obvious. Tests whether the deck or body needs repair. |
| `event_a2_broken_bridge` | 斷掉的音橋 🌉 | Jump requires enough HP to survive; repair requires the displayed gold and an upgradeable card | **跳過去:** lose 8 HP; gain 60 gold. **修橋:** pay 40 gold; upgrade one card. **繞路離開.** | Jump costs 11 HP and grants 50 gold; repair costs 50. | A before/after path animation labels both costs. Converts current resources into later flexibility. |
| `event_a2_echo_market` | 回音小集 🎪 | Buy appears at ≥60 gold; exchange requires two removable cards | **買一對:** pay 60 gold; gain two distinct random Uncommon cards. **交換:** pay 25 gold; transform two cards. **離開.** | Buying costs 75; exchange costs 35. | Both incoming cards are revealed together; duplicate definitions are excluded. Offers quantity versus directed repair. |
| `event_a2_moth_rehearsal` | 鐘蛾彩排 🦋 | A valid Uncommon relic remains | **加入彩排:** fight `bellMoth, bellMoth`; victory grants one random Uncommon relic. **拍拍手:** pay 5 gold; heal 5 HP. **離開.** | Fight has three `bellMoth`; clapping costs 10 gold and heals 4. | Enemy portraits and their first `A4+N1` intents appear on the choice. A voluntary fight buys focused power. |
| `event_a2_glass_fork` | 月光音樂盒 🌙 | Does not own `moonMusicBox` and has a removable Attack, Skill, or Power to bind | **收好:** lose 4 maximum HP; gain `moonMusicBox` and bind one eligible card. **拆開:** gain 80 gold and `cu_silence`. **離開.** | Taking it loses 5 maximum HP; dismantling grants 65 gold. | The bound card and max-heart segment, or the Curse card, sit beside the reward. Tests build consistency against lasting cost. |
| `event_a2_dripping_rhythm` | 滴滴節拍 💧 | Bottle requires two empty potion slots; wash requires a removable card | **接住:** lose 4 HP; gain two random potions. **洗牌:** transform one card. **離開.** | Catching costs 6 HP; washing also costs 10 gold. | Empty potion slots and the selected card are shown physically. Values consumable flexibility against deck variance. |
| `event_a2_silent_classroom` | 寧靜教室 🏫 | At least one of: upgradeable Skill, removable Curse, or missing HP | **學習:** lose 5 HP; upgrade one Skill. **整理:** remove one Curse. **午睡:** heal 7 HP. **離開.** | Studying costs 7 HP; resting heals 5; Curse removal is unchanged. | Only legal desks light up, each with one large icon. A flexible event that rewards arriving with a specific need. |

### Act III events: 7

| Stable id | Title | Eligibility | Exact choices | Difficulty 15 result | Preschool presentation and rationale |
|---|---|---|---|---|---|
| `event_a3_static_crown` | 靜電雨聲筒 🌧️ | Take requires not owning `rainSoundTube`; Ground requires enough HP and two removable cards | **收下:** lose 3 maximum HP; gain `rainSoundTube`. **導電:** lose 10 HP; remove two cards. **離開.** | Taking it costs 4 maximum HP; Ground removes only one card for 10 HP. | A zero-Block enemy-turn example previews the relic. Offers a small safety net or precise late-run deck repair. |
| `event_a3_mirror_stage` | 鏡子舞台 🪞 | At least one non-Basic card or two removable cards | **模仿:** lose 6 HP; add an unupgraded copy of one selected non-Basic card. **轉身:** transform two cards. **離開.** | Copying costs 9 HP; transforming also adds `cu_stage_fright`. | Two exact card faces appear side by side. Tests focused duplication against broad repair. |
| `event_a3_last_rehearsal` | 最後彩排 🎭 | At least one unupgraded Basic card or hero is damaged | **練到底:** lose 15 HP; upgrade every Basic card in the deck. **睡到飽:** heal to full HP; gain two `cu_silence`. **離開.** | Practice costs 18 HP; sleep heals only 75% of missing HP, rounded down, and still adds two Curses. | All affected Basics or both Curse cards fan out before confirmation. A large, legible preparation gamble. |
| `event_a3_star_bell` | 星光鐘 🌟 | At least one unlocked Rare card | **接住星光:** lose 8 HP; gain one random Rare card. **收集碎光:** gain 75 gold and `cu_heavy_beat`. **離開.** | Rare costs 11 HP; gold falls to 60. | The next-turn draw penalty is spoken and pictured. Trades a specific power class against shop flexibility. |
| `event_a3_backward_song` | 倒放的歌 ⏪ | At least one removable card | **跟著唱:** transform one card; the result is upgraded once. **按下停止:** remove one Curse and lose 6 HP. **離開.** | Transformed result is not upgraded; Curse removal costs 9 HP. | The before/after card flips visibly; the remove option appears only with a Curse. Makes late uncertainty calculable. |
| `event_a3_empty_audience` | 空空觀眾席 🎟️ | At least 11 current HP | **演奏:** lose 10 HP; gain 2 maximum HP and start the act boss with +1 Energy on turn one. **找找座位:** gain 40 gold. **離開.** | Performing costs 13 HP, grants no maximum HP, and retains the boss Energy bonus; searching grants 30 gold. | A boss crown beside the Energy icon shows the delayed reward. Tests present HP against boss preparation. |
| `event_a3_roof_wind` | 塔頂長風 🌬️ | Hero is damaged or has at least two upgradeable cards | **迎風練習:** lose 12 HP; upgrade two cards. **慢慢呼吸:** heal 15 HP. **離開.** | Practice costs 16 HP; breathing heals 10. | Two green upgrade arrows contrast with one large heart. The final deck-quality-versus-safety check. |

### Shared and shrine events: 9

| Stable id | Title | Eligibility | Exact choices | Difficulty 15 result | Preschool presentation and rationale |
|---|---|---|---|---|---|
| `event_shared_phonetic_shrine` | 注音神龕 🔤 | Practice requires one upgradeable card and at least 10 HP; wish requires missing HP | **練習三題:** complete three full casts; each wrong answer loses 2 HP; after all three, upgrade one card. **安靜許願:** heal 6 HP. **離開.** | Each mistake costs 3 HP; wishing heals 4. | One large symbol appears at a time and mistakes reveal the answer normally. Learning is the explicit risk, never a hidden shortcut. |
| `event_shared_humming_well` | 哼唱井 🪣 | Remove requires ≥25 gold and a removable card; listen requires an empty potion slot | **丟硬幣:** pay 25 gold; remove one card. **趁近聽:** gain one random potion. **離開.** | Removal costs 35 gold; listening also loses 2 HP. | The well echoes the selected icon before confirmation. Offers precise cleanup or a small tactical resource. |
| `event_shared_traveling_luthier` | 旅行調音師 🪕 | Repair requires ≥50 gold and an upgradeable card; sell requires a removable card | **修理:** pay 50 gold; upgrade one card and heal 5 HP. **賣舊譜:** remove one card; gain 20 gold. **離開.** | Repair costs 65 and heals 3; selling grants 10. | The chosen card, coin change, and heart change share one preview. Creates a small specialist shop without a full inventory. |
| `event_shared_memory_album` | 回憶相簿 📖 | Copy requires a non-Basic card; let go requires a removable card | **記住:** add an unupgraded copy of one non-Basic card; lose 4 HP. **放下:** remove one card; lose 4 HP. **離開.** | Either action costs 7 HP. | A plus-card and minus-card animation makes the opposite deck effects unmistakable. Tests commitment to a good card versus trimming. |
| `event_shared_three_doors` | 三扇彩門 🚪 | Hero is damaged or a Rare card remains unlocked | **紅心門:** heal 12 HP. **金幣門:** gain 55 gold. **星星門:** lose 3 maximum HP; gain one random Rare card. **離開.** | Heal 8; gain 40 gold; Rare costs 4 maximum HP. | All outcomes are printed on the closed doors; there is no surprise reveal. Provides a clean three-resource comparison. |
| `event_shared_tiny_conductor` | 小小合唱 🤝 | Buy requires the displayed gold and no `choirRibbon`; help requires enough HP to survive | **買下緞帶:** pay 60 gold; gain `choirRibbon`. **幫忙搬箱:** lose 5 HP; gain 45 gold. **離開.** | Purchase costs 75; helping costs 7 HP and grants 35 gold. | Three victory pips preview the delayed heal. Rewards planning for a longer route with visible progress. |
| `event_shared_moon_gong` | 月光鑼 🌕 | Ring requires a valid Rare relic; polish requires missing HP | **敲響:** gain one random Rare relic; the next two normal encounters have +20% enemy max HP, rounded up. **擦亮:** heal 8 HP. **離開.** | Future enemy HP bonus is +30%; polishing heals 5. | Two marked future-fight icons appear beside the relic. Turns delayed danger into a countable promise. |
| `event_shared_resonant_anvil` | 共鳴鐵砧 ⚒️ | Forge requires one upgradeable Attack and Skill; melt requires a removable card | **一起鍛造:** lose 8 HP; upgrade one Attack and one Skill. **熔掉舊牌:** lose 4 HP; remove one card. **離開.** | Forging costs 11 HP; melting costs 7. | Two type-colored card slots prevent selecting an illegal pair. Encourages mixed deck foundations. |
| `event_shared_quiet_library` | 靜音圖書室 📚 | At least three eligible unlocked cards across available types | **選一本:** view one random Attack, Skill, and Power of Common/Uncommon rarity; take exactly one or take none. **關燈休息:** take no card and heal 4 HP. | The three offers are Common when possible; resting heals 2. | Cards are full-size and taking none is a positive button. Teaches that skipping can protect deck quality. |

Count check: **7 Act I + 7 Act II + 7 Act III + 9 shared/shrine = 30
events exactly**.

## Unknown-room outcome rules

Add `event`/Unknown as a map node kind. On entering it, roll one outcome from a
saved `UnknownOutcomeState` before rendering the room:

1. Event weight is `65 + 10 × nonEventUnknownStreak`, capped at 95.
2. The remaining weight is split fight:shop:treasure in a 4:2:1 ratio.
3. An event resets `nonEventUnknownStreak` to zero; any other outcome increments
   it by one. The streak persists across acts.
4. Unknown fights use the act's current easy/hard quota and normal reward.
   Unknown shops use the normal shop inventory. Unknown treasure cannot replace
   or satisfy the guaranteed mid-act treasure.
5. Do not roll shop when fewer than two path rows remain before the boss, or
   treasure after the pre-boss row. Redistribute an ineligible outcome's weight
   proportionally before rolling.

Event filtering and anti-repeat:

- An event ID occurs at most once per run.
- Act events are eligible only in their named act; shared events are eligible in
  all three main acts. Act I events are excluded from the first map row.
- Keep the last four resolved event IDs; exclude them before rolling even across
  act boundaries. The once-per-run rule normally supersedes this, but keeping the
  history supports future repeatable events.
- Apply the row/HP/gold/deck/relic/potion eligibility stated in the table before
  selection. An event is eligible if at least one non-Leave choice is legal.
- Choose uniformly among remaining eligible act events and shared events, with a
  2:1 total weight in favor of act-specific events. If one category is empty,
  give all weight to the other.
- If no event qualifies, resolve the node as the current act's normal encounter;
  record that fallback so loading cannot reroll it.
- Difficulty-15 status, selected event ID, offered random objects, selected
  physical card UIDs, and any pending event combat are serialized immediately.

## Preschool presentation standard

- Show at most three choices plus `離開`, each at least 64 px tall.
- Lead with a large object illustration and one spoken sentence. Adult rationale
  and exact rule details live in the coach strip or inspect panel.
- Encode every consequence twice: icon plus signed number/text. Examples:
  `-7❤️`, `+35🪙`, `移除 1 張`, `獲得 🎁遺物`.
- Preview exact selected cards and known relic effects before confirmation.
  Random rewards state their rarity/type and reveal only after confirmation.
- Require a second confirmation for HP/max-HP loss, Curse gain, card removal,
  transformation, duplication, a fight, and all three key choices.
- Disabled choices remain readable and say why: `還差 12🪙`, `沒有可升級的牌`,
  or `藥水格已滿`. Never simply dim an unavailable action.
- Reduced motion removes shakes and object movement but keeps before/after bars,
  card previews, sounds, labels, and confirmation pauses.

## Implementation and validation checklist

### Minimum data shapes

Implementation may split files, but it must preserve these concepts:

```ts
type EventAct = 1 | 2 | 3 | 'shared';

interface EventChoiceDef {
  id: string;
  label: string;
  eligibility: EventCondition[];
  base: EventEffect[];
  a15: EventEffect[];
  confirm: boolean;
}

interface EventDef {
  id: string;
  act: EventAct;
  title: string;
  icon: string;
  eligibility: EventCondition[];
  choices: EventChoiceDef[];
  presentation: string;
  rationale: string;
}

interface EnemyDefV2 {
  id: string;
  act: 1 | 2 | 3 | 4;
  tier: 'normal' | 'elite' | 'boss';
  maxHp: number;
  pattern: EnemyMove[];
  phases?: EnemyPhase[];
  advanced?: EnemyRulePatch;
}

interface EncounterDefV2 {
  id: string;
  act: 1 | 2 | 3 | 4;
  pool: 'easy' | 'hard' | 'event' | 'elite' | 'boss';
  enemyDefIds: string[];
}
```

`EventEffect` must be a tagged union rather than executable callbacks so choice
previews, save/load, debug inspection, and tests all read the same payload.
`EnemyMove` must express ordered attack hits, Block, card insertion, status,
buff, and phase transition without deriving hidden behavior from display text.

### Data validation

- Exactly 30 unique event IDs with a 7/7/7/9 distribution and no duplicated
  title/icon pair.
- Every event has at least one unconditional or eligibility-protected legal
  choice plus Leave, an explicit A15 result, presentation text, and rationale.
- Event dependencies resolve to existing card/relic/potion IDs before release;
  cross-bible IDs in this document match exactly.
- Each main act has at least six native normal enemies, ten normal encounter
  recipes split into easy/hard, exactly three elites, and exactly three bosses.
- Every enemy pattern contains a damaging move and every referenced status has
  timing, stacking, expiry, UI text, and save serialization rules.
- Every multi-enemy recipe respects the simultaneous-intent damage budget; no
  Act I hard recipe pairs two full-strength strikers.
- Deprecated encounter/enemy IDs load, but no new map emits them.

### Deterministic tests

- The same seed and choices reproduce map boss, Unknown outcomes, event IDs,
  event reward objects, combat recipes, and rewards after save/load.
- The opening encounter quotas count completed normal fights, not floor number,
  and event fights do not consume them.
- Normal recipes respect the two-fight anti-repeat window; elites never repeat
  consecutively; boss selection is visible and stable for the act.
- Unknown adaptive weights update exactly, exclusions redistribute correctly,
  and an empty event pool falls back without rerolling on load.
- Base and A15 versions apply the displayed result exactly, including rounding,
  HP floors, max-HP changes, potion-slot checks, and physical card selection.
- Event combat grants only its specified reward and returns to the saved event.
- Difficulty HP/damage modifiers, advanced patterns, empowered elite modifiers,
  and boss phase transitions compose in a fixed documented order.
- Each key can be obtained at most once; all three are required for Act IV; the
  sacrificed campfire/chest reward cannot also be claimed.

### Browser acceptance

- At 1280×720, 1024×768, and 768×1024, event choices do not cause horizontal
  page overflow and all primary controls retain 64px targets.
- Exact consequences, unavailable reasons, confirmation, focus trap, focus
  restoration, speech, mute, and reduced-motion feedback work with touch and
  keyboard input.
- Enemy intent labels match actual hit totals/statuses at base difficulty and
  advanced difficulty, including every phase change.
- Orientation changes do not reroll an event, encounter, reward, or boss and do
  not duplicate a paid consequence.

## Review gates

1. Approve event names, choices, A15 variants, and cross-bible dependencies.
2. Approve the per-act enemy/recipe/elite/boss tables and damage budgets.
3. Implement schema and deterministic selection without activating new content.
4. Add one act at a time, run seeded simulations, then playtest with casting off
   and on before enabling the next act.
5. Unlock Act IV only after all three main acts and the key opportunity costs
   pass tablet, save/load, and accessibility tests.
