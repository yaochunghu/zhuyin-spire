# Encounter audit

Baseline is `main` at `b154f51` (enemy block already expires on that enemy's next action). The tables below are the live roster, not the proposal in [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md).

Notation: `A6` attack 6, `H10` heavy 10, `B8` block 8, `M3×2` two hits of 3 (total 6). Peaks below are unblocked totals for one intent. Weak is not baked into the pill; the UI floors each hit to 75% only while Weak is still up.

Preschool bands already on `main`: Act I normals peak at 7 (小火苗 `H7`), Act II at 9 (兇尖牙怪 `H9`), Act III at 12 (夜梟 `H12`; the `~8–11` note in `enemies.ts` is the common range). Elite peaks: Act I 10, Act II 12, Act III 12. Boss peaks: 10, 13, 14. Hero HP is 40.

## What a fight was asking

Almost every enemy was a loop of the same four pills: attack, heavy, multi, block. Pairs stood next to each other and did not interact. Nothing in a fight changed because the child spelled a 注音. Acts II and III raised the numbers and reused Act I elites.

## Act I before

| Fight | Enemies | HP | Pattern | Tests |
| --- | --- | --- | --- | --- |
| 軟軟史萊姆 `slimeWeak` | fodder | 10 | `A3, A3, M2×2` | Block a small hit, or race it |
| 小史萊姆 `slime` | fodder | 13 | `A4, B4, A4, A5` | One shield turn in a short loop |
| 小石怪 `rock` | tank | 17 | `B7, A4, B6, A5` | Hit through a shield, then block 4–5 |
| 小蝙蝠 `bat` | swarm | 12 | `M2×2, M2×3, A4, M2×2` | Many small hits |
| 小火苗 `ember` | heavy | 14 | `A3, H7, B4, A4, H7` | Read 下回合 and block a 7 |
| 尖牙怪 `fang` | striker | 16 | `A5, A5, M3×2, A6` | Several attacks, almost no shield |
| 小尖牙 `fangSoft` | striker, packs only | 12 | `A4, A4, M2×2, A5` | Softer 尖牙 |

| Pack | Bodies | Roll |
| --- | --- | --- |
| 史萊姆雙人組 `slimePair` | two 軟軟史萊姆 | About a third of fights were multis; this id was listed twice, so it was the common pair |
| 石怪小隊 `tankFodder` | 小石怪 + 軟軟史萊姆 | Same multi roll |
| 蝠與黏液 `swarmFodder` | 小蝙蝠 + 軟軟史萊姆 | Same |
| 尖牙前哨 `strikerFodder` | 小尖牙 + 軟軟史萊姆 | Same |
| 火苗雙人 `heavyFodder` | 小火苗 + 軟軟史萊姆 | Same |
| 史萊姆小隊 `slimeTriple` | three 軟軟史萊姆 | Rare, row ≥ 3 |
| `fangPair`, `earlyMix` | Same bodies as 尖牙前哨 and 蝠與黏液 | Kept for old saves, also inside the Act II/III multi lists |

No easy quota. A 15% danger room rerolled a solo into 尖牙怪, 小火苗, or 小石怪 and could repeat the room just fought. The first room could be a pair.

| Elite | HP | Pattern | Tests |
| --- | --- | --- | --- |
| 重甲守護 `eliteArmor` | 30 | `B10, A5, M3×2, H9, B8` | Thick shield, then a 9 |
| 蜂刺菁英 `eliteBee` | 25 | `M2×3, A6, M2×3, B5` | Three small hits |
| 爆裂菁英 `eliteBoom` | 26 | `A5, H10, M3×2, B6` | Block a 10 |
| 菁英雙人 `eliteDuo` | 蜂刺菁英 + 軟軟史萊姆 | — | 35% of elite rooms. Not an elite test; the bee's pattern plus a fodder |

Boss 塔守護獸 `boss1` (and the `boss` alias), 42 HP, one loop: `A6, B8, M3×2, H10, M2×3, A7`. No phase, no friend, no cast interaction. The 10 can be the fourth intent, with no extra telegraph beyond the usual 下回合 pill.

## Act II before

| Fight | HP | Role | Pattern | Tests |
| --- | --- | --- | --- | --- |
| 盔甲怪 `armor` | 22 | tank | `B9, A5, B7, M3×2, A6` | Same question as 小石怪, higher shield |
| 尖刺怪 `spike` | 24 | striker | `A6, M3×2, A7, B5, M2×3` | Same question as 尖牙怪 |
| 兇尖牙怪 `fangHard` | 20 | heavy | `A5, H9, M3×2, B5, A6` | Block a 9 |
| 毒蛙 `toad` | 21 | swarm | `M2×3, A6, M3×2, B6` | Three small hits |
| 尖牙怪 `fang` | 16 | reused Act I | Act I pattern | An Act I striker inside the Act II solo pool |

Multis: 中層雙怪 `midPair` (盔甲怪 + 毒蛙), 刺與黏 `midStrike` (尖刺怪 + 小史萊姆), plus `fangPair` and `eliteDuo`.

Elites: Act I 蜂刺, 爆裂, and 重甲, plus 風暴菁英 `eliteStorm` 34 HP `M3×3, B8, A8, H12`. 35% of elite rooms were still `eliteDuo`.

Boss 雙翼監守 `boss2`, 58 HP: `A8, M4×2, B10, H13, M3×3, A9`. One loop. Peak 13.

## Act III before

| Fight | HP | Role | Pattern | Tests |
| --- | --- | --- | --- | --- |
| 幽影 `wraith` | 28 | striker | `A7, B7, M3×3, H11, A8` | Attack, shield, then an 11 |
| 夜梟 `owl` | 27 | heavy | `A6, H12, M3×2, B8, H11` | Block a 12 |
| 晶盾怪 `crystal` | 30 | tank | `B12, A7, B10, M4×2, A8` | Break a 12 shield |
| 尖刺怪, 兇尖牙怪 | — | reused Act II | — | Earlier acts inside the Act III solo pool |

Multis: 塔影雙怪 `latePair` (晶盾怪 + 夜梟), 影與蛙 `lateMix` (幽影 + 毒蛙), plus `midPair` and `eliteDuo`.

Elites: 風暴菁英, 爆裂菁英, 暗影菁英 `eliteShadow` 36 HP `A8, H12, M4×2, B9`.

Boss 注音終焉王 `boss3`, 72 HP: `A9, M3×3, B12, H14, M4×2, A10, H12`. One loop. Peak 14.

## Gaps

1. Four pills, one shape. Tank, striker, swarm, and heavy are the same loop with different numbers. There is no buffer, listener, summoner, or enemy that grows.
2. Pairs do not interact. 石怪小隊 is "a shield and a small bite," not a shared plan.
3. No fight listens to the 注音 cast. A correct spell and a fizzle change nothing about the monsters.
4. Bosses have no phase. The heavy is just the next number in the loop.
5. Acts feel the same. Act II solos include 尖牙怪. Act III solos include 尖刺怪 and 兇尖牙怪. Act II elites include all three Act I elites. Act III elites include 風暴菁英 and 爆裂菁英.
6. `eliteDuo` is 35% of every act's elite rooms, so the elite node often fails the elite test.
7. Map picks are memoryless. Nothing stops the same recipe twice in a row. Danger gold can replace the monster after the pick. The first fights are not held to an easy pool.
8. The bible's 雜音, 灼音, 失準, 裂音, 擴音, and 疊唱 need new statuses and card types. They are not in this engine. Act IV in that doc is not live.

## Act I after

Easy solos for the first three normal fights on every path: 軟軟史萊姆, 小史萊姆, 小蝙蝠. The first fight is always a solo. 史萊姆雙人組 can appear after that, still inside the easy quota.

| New or changed | HP | Role | Pattern | Tests |
| --- | --- | --- | --- | --- |
| 跟讀蟲 `echoBug` | 13 | listener | `A4, A5, B4, A4` | Each correct cast reduces a later hit by 1 (minimum 1 before Weak). This pill does not change. A fizzle does nothing |
| 小鼓手 `drumlet` | 11 | buffer, pack only | `A3, B3` and neighbors +1, `A4` | The drum turn is a shield. 小石怪's current hit stays put; a later hit shows +1, once |
| 鼓手與石怪 `drumSquad` | 11 + 17 | buffer + tank | — | Kill the drum before the rock's later hit grows |
| 跟讀與史萊姆 `echoPair` | 13 + 10 | listener + fodder | — | Spelling helps the bug; the slime does not listen |

Hard solos add 跟讀蟲 to 小石怪, 小火苗, and 尖牙怪. Hard packs keep the four old pairs and add the two above. 史萊姆小隊 stays a rare row ≥ 4 hard extra. `fangPair` and `earlyMix` still load, and are not rolled.

| Elite | HP | Pattern | Tests |
| --- | --- | --- | --- |
| 重甲守護, 蜂刺菁英, 爆裂菁英 | unchanged | unchanged | Same as before |
| 和聲蛹 `eliteChorus` | 28 | `A5, H8, B6` summons 軟軟史萊姆, `M2×3` | Block the 8 first. The friend arrives on the next shield and rests that phase |

`eliteDuo` is not rolled. Peak stays 10 (爆裂菁英). 和聲蛹's heavy is 8.

Boss 塔守護獸, still 42 HP. Opening loop `A6, B8, M3×2` until HP ≤ 21. 下回合 becomes `B8` and the current pill stays. After that brace, `H10`, then `B6` summons 軟軟史萊姆 (the slime rests that phase), then `M2×3, A7`. The `boss` alias uses the same phase. Peak stays 10. The first heavy does not share a turn with the new slime.

## Act II after

Easy solos, first two fights: 盔甲怪, 毒蛙, 鐘粉蛾. No Act I bodies.

| New | HP | Role | Pattern | Tests |
| --- | --- | --- | --- | --- |
| 鐘粉蛾 `bellMoth` | 19 | listener | `A5, B6, M2×3, A6` | Same soothe rule as 跟讀蟲, Act II numbers |
| 塵鼓 `dustDrum` | 23 | scaling, cap 1 | `B8` and self +1, `A6, M2×3, A6` | The shield turn is the moment to hit. The next attack shows 7, and the multi shows 3×3 |
| 小指揮 `littleConductor` | 18 | summoner | `A6, B5` summons 小音符, `M2×3` | A friend appears on the shield and does not act yet |
| 小音符 `noteWisp` | 9 | fodder, summoned | `B3, A3`, cap 1 | First real action is a shield, then a 3 |
| 鐘音符 `bellWisp` | 14 | fodder, summoned | `A4, A4, B3, A3`, cap 1 | Rests the summon phase. Its shield lines up with 樂團指揮's later heavy |

Hard solos: 尖刺怪, 兇尖牙怪, 塵鼓, 小指揮. 尖牙怪 is gone.

Hard packs: 中層雙怪, 盔甲與鐘蛾 `a2_armor_moth` (盔甲怪 + 鐘粉蛾), 塵鼓與毒蛙 `a2_drum_toad` (塵鼓 + 毒蛙). `midStrike` still loads and is not rolled.

| Elite | HP | Pattern | Tests |
| --- | --- | --- | --- |
| 風暴菁英 | 34 | unchanged, peak 12 | Unchanged |
| 樂團指揮 `eliteConductor` | 36 | `A7, H12, B8` summons 鐘音符, `A6` and the friend +1 | Block the 12 while the friend is not out yet. The +1 appears on the friend's later pill |
| 慢拍鼓 `eliteMuteDrum` | 38 | `A7, B10` and self +1, `M3×2, H11` | After the shield, hits show +1. The heavy pill becomes 12 |

Act I elites are not in this pool. Peak stays 12.

Boss 雙翼監守, still 58 HP. Opening `A8, M4×2, B10` until HP ≤ 29. Brace `B12`, then `H13`, then `B8` summons 小音符, then `M3×3, A9`. Peak stays 13. The first 13 is alone.

## Act III after

Easy solos, first two fights: 幽影, 夜梟, 鏡音.

| New | HP | Role | Pattern | Tests |
| --- | --- | --- | --- | --- |
| 鏡音 `mirrorNote` | 26 | listener | `A7, B8, M3×2, H11` | Soothe can lower the later heavy. This pill stays |
| 冠鐘 `crownBell` | 30 | scaling, cap 1 | `B8` and self +1, `A8, M3×2, H11` | Opens on a shield. Later heavy shows 12, the same peak as 夜梟 |
| 星螢 `starWisp` | 12 | fodder, summoned | `B4, A4`, cap 1 | Shield first, then a 4. The shield lines up with the caller's heavy |

Hard solos: 晶盾怪, 冠鐘. 尖刺怪 and 兇尖牙怪 are gone.

Hard packs: 塔影雙怪, 影與蛙, 冠鐘與鏡音 `a3_crown_mirror`, 晶盾與鏡音 `a3_crystal_mirror`. Opening turns stay at or under 影與蛙's 13 (冠鐘 opens on a shield, so the pair's first turn is 鏡音's 7).

| Elite | HP | Pattern | Tests |
| --- | --- | --- | --- |
| 暗影菁英 | 36 | unchanged, peak 12 | Unchanged |
| 七音晶 `elitePrism` | 44 | `B12, A8, B10, M3×3, H12` | The 12 shield expires on its next action |
| 喚星使 `eliteStarCaller` | 40 | `A8, H12, B10` summons 星螢, `M4×2` | Block the 12 before the friend exists. 星螢's first action is a shield, including on the caller's later heavies |

風暴菁英 and 爆裂菁英 are not in this pool. Peak stays 12.

Boss 注音終焉王, still 72 HP and cap 1. Opening `A9, M3×3, B12` until HP ≤ 36. Brace `B14` grants itself +1. 下回合's heavy shows 14, not 13. Then `H14`, then `B10` summons 星螢, then `M4×2` (shows 10), `A9` (shows 10), `H12` (shows 13). Peak stays 14, matching the old heavy. The first 14 does not share a turn with 星螢.

## Map rules after

Baked at generation, so a reload does not reroll the room.

- Easy quota uses the fewest normal fights on any parent path. Act I: 3. Acts II and III: 2. A node that a short path can still reach stays easy.
- A normal key is excluded for the next two normal fights along the nearest parents. An elite key is excluded for the nearest previous elite. If that would empty the pool, the oldest exclusion drops.
- Hard fights are about 40% multi. Easy fights are about 25% multi, and only after the first fight.
- Danger gold still adds the bonus. It does not swap the monster.
- About 8% of Act I hard fights at row ≥ 4 can be 史萊姆小隊, unless that key is recent.

## Intent contract

Every new step is still `attack`, `heavy`, `multi`, or `block`. Children read ⚔️, 💥, the multi total, and 🛡️. Strength and soothe are already inside that number. The current number does not change when a neighbor drums or when a spell lands; 下回合 does. A summoned enemy is a new body that shows its own pill next turn and does not act on the turn it appears. Summoning once into a full row of three does not add a fourth body.

Damage still goes through the existing enemy-intent pipeline. Block on an enemy clears at the start of that enemy's next action, then a guard can grant a fresh shield.

## Left for a UI pass

This pass does not add icons. New enemies reuse portraits:

| Enemy | Reused art |
| --- | --- |
| 跟讀蟲, 鐘粉蛾 | 小蝙蝠 |
| 小鼓手 | 小石怪 |
| 塵鼓 | 盔甲怪 |
| 小音符, 鐘音符 | 小火苗 |
| 小指揮 | 尖刺怪 |
| 鏡音, 七音晶 | 晶盾怪 |
| 冠鐘 | 夜梟 |
| 星螢 | 幽影 |
| 和聲蛹 | 蜂刺菁英 |
| 樂團指揮 | 風暴菁英 |
| 慢拍鼓 | 重甲守護 |
| 喚星使 | 暗影菁英 |

Still missing, on purpose: a strength pip, a soothe mark, and a "friend arrived" cue beyond the new monster and its next-turn pill. The combat log line 「叫來了」 is adult text. Coach lines (with 注音) show when combat tips are on.

## Questions for Yao

1. Keep Act II and Act III from rolling Act I elites and Act I normals. Recommendation: yes. A later act should ask a new question.
2. Keep one boss per act until each boss has its own portrait. Recommendation: yes. The bible's three-boss pools wait on art.
3. A correct cast soothes a listener; a fizzle does not punish. Recommendation: keep that. The current pill stays a promise.
4. New enemies reuse old portraits. Recommendation: a later art pass, not part of this fight pass.
5. No new strength, soothe, or summon icon. Recommendation: a later UI pass. The pill number is the contract for now.
6. Easy quota and anti-repeat are chosen when the map is built. Recommendation: keep them baked so continue does not reroll.
7. This pass uses the enemy-block expiry from #50. Recommendation: leave that rule as shipped.
8. Act I now has four elites, after adding 和聲蛹. Recommendation: keep four. Drop an older elite only if the pool must stay at three.
9. 塔守護獸's friend is the shared 軟軟史萊姆, so a later heavy can share a turn with the slime's 3 or 4 if the slime is still alive. The first heavy is alone. Recommendation: keep the familiar slime. If a family playtest feels hot, give the boss its own shield-first friend instead of retuning 軟軟史萊姆.
