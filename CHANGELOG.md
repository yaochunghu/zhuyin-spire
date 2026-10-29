# Changelog

All notable changes to **注音之塔 / Zhuyin Spire** are documented here.

Format: human-readable summary per version. For code archaeology use `git log` and tags.

---

## [Unreleased]

### Layout

- During the first tutorial fight, the lesson banner stays in the battlefield column while a cast is open and sits under the combat HUD, so the whole banner is readable at 640×360, 844×390, and 568×320. The cast slots and the hinted answer stay clear
- At 568×320, the math dock's 「語音暫時無法播放…」 note fits on screen together with the question, the three answers, and 家長協助

### Content

- 余, 于, and 閑 were corrected to 餘, 於, and 閒
- Shape prompts use 球 ⚽, 魔術方塊的一面 🟦, and 書本 📘. 三角飯糰 stays 🍙
- Make-10 tier 2 asks 「N 和 M 合起來是幾？」. N+M is from 1 to 10, never 0 and 0, and a single zero is still allowed. The other two choices sit near that total, each distinct and inside 0–10. Tier 1 still asks 「10 可以分成 N 和幾？」
- 問 uses 🙋. 為什麼 stays ❓
- Saves stay version 4

---

## [0.4.5] — 2026-10-29

### Save fixtures and seed replay (#67)

- Ten version-4 checkpoints for 共鳴武者 and 珠算武者, plus a seeded choice replay, live under `tests/fixtures/`. `npm test` checks that a load-then-save matches the file, and that an in-session resume matches an uninterrupted replay. Test-only. Saves stay version 4

### Playtest fixes (#68)

- The hinted 注音 answer sits on the mana line, so 送出, 🗑️, and 家長協助 stay inside the dock. Practice and 注音神龕 use that same dock
- The math dock keeps the question, the three answers, 家長協助, and 「語音暫時無法播放…」 inside the viewport. On a 640×360 correction, focusing 繼續 does not scroll the question away
- At 360×740 in listen mode, four 48px slots stay on one line. During the first tutorial fight at 640×360 and 844×390, the lesson banner stays in the battlefield column. At 390×844, practice and shrine controls, including the speech note, stay on screen
- Pause and the potion belt follow the cast gate: 算題暫停 / 先算完 for math, 注音暫停 / 先念完注音 otherwise
- 注音神龕 家長協助 shows the spelling once per event. A second tap says 家長協助已用完. Practice can still show the answer again. Saves stay version 4. An unused hint is left out of the checkpoint; a spent hint is saved as `true`. Older saves omit the flag and still load

### Playtest cast log (#69)

- Each resolved cast, for 注音 and for math, in combat, practice, and the shrine, is one local `cast` event. The export schema is `zhuyin-spire-playtest-v2`. The storage key stays `zhuyin-spire-playtest-v1`, so events already on the device still export
- The event stores the gate, family, tier, whether it was correct, whether 再算一次 was used, the hint level, an error tag, and a time bucket (`<5s`, `5-15s`, `15-30s`, `>30s`). It does not store the question, the attempt, or the answer. Opening 再算一次 does not emit. Debug skip-cast does not emit
- New `combatEnd` events include `characterId`. Debug, skip-cast, webdriver, and the child-error model mark `synthetic: true`

### Content (#70)

- 輕聲 is stored and checked with ˙ first: 們 `˙ㄇㄣ`, 呢 `˙ㄋㄜ`, matching 《重編國語辭典修訂本》
- 仔 (👶) is `ㄗㄞˇ`. 子 stays `ㄗˇ`
- Grade 1 never asks 公分 or another length unit. 長尺掃 asks which side has more (`compare`). 公分 stays on the grade-2 tier-5 prompt
- Cue batch 2: 為什麼 `ㄨㄟˋ` replaces 為 `ㄨㄟˊ`; 采 is removed (彩, 彩虹, and 踩 still cover `ㄘㄞˇ`); 種子 replaces 種; the clock face matches the hour; 三角飯糰 is the triangle and 魔術方塊的一面 is the square; make-10 tier 2 shows the split and the join; the 共鳴武者 theme says 「易傷」空檔
- Standard Taiwan forms: 餘, 於, and 閒 replace 余, 于, and 閑. The 注音 for those rows stays ㄩˊ, ㄩˊ, and ㄒㄧㄢˊ

### Child-error model (#71)

- One debug-only model can miss, hesitate, and choose for both characters. `?childModel` is ignored unless debug is also on. A normal production bundle does not contain it. Headless Act I checks run from `scripts/simulate-resonance-pool.mjs`

---

## [0.4.4] — 2026-10-28

### 共鳴武者 注音 cast dock (#64)

- The 注音 word sits in a parchment box with dark walnut ink (about 14:1 contrast), and the box grows to fit the word instead of clipping it at 30px. Listen mode keeps the hidden 「？」, now legible
- Every slot, 注音 key, tone key, ⌫ 🗑️ ✓, 🔊 再聽 and 💡 家長協助 is at least 48px, fully on screen and not overlapping at 640×360, 844×390, 1280×720 and 390×844, with no scrolling inside the dock. On short landscape phones the dock takes the right half of the screen: the word, coach and note on the left, the slots, keys and controls on the right
- The 語音暫時無法播放… note for adults is fully visible at all four sizes
- The 珠算武者 math dock, the practice screen, game logic and saves (version 4) are unchanged. Screenshots are in docs/screenshots/zhuyin-dock/

---

## [0.4.3] — 2026-10-28

### 珠算武者

- 珠算武者 is playable. The starter deck is 撥珠拳 ×5, 算珠盾 ×4, and 十全掌 ×1, with starter relic 木珠串. The card pool is 27 designs. Score gates stay 0 / 300 / 1,000 / 2,000
- Math prompts are three large choices at every tier. Grade 1 is the default. 二年級 is a parent opt-in and only lifts 倍數連拳 to tier 5. A wrong answer fizzles the card. One scaffolded 「再算一次」 is allowed per combat. Adaptivity only lowers the tier
- 算珠, 湊十, and 十串 are combat-only. There is no 勁. Direct damage from 木珠串 skips Block and 易傷. The 注音 tutorial stays on 共鳴武者
- Chest, elite, boss, and random event relics roll the current character's pool. 共鳴武者 keeps the existing five. 珠算武者 rolls 算珠袋, 小尺子, 十響鈴, and 橡皮擦. Owning that pool still pays 20 gold. Legacy relics still load. Potions stay the shared six. Saves stay version 4
- 💡 on one card no longer spends 「再算一次」 for a later card. The retry is blocked only when that card's own answer was revealed before the first try
- 注音神龕 is not offered to 珠算武者. The other shared events do not quiz. A shrine miss cannot cost that character HP
- Math casts say 算一算, 顯示答案, and 仍需選出答案. The coach changes after 「再算一次」 is used. 口袋節拍器 and 月光音樂盒 keep 念錯 / 拼對 for 共鳴武者 and say 算錯 / 算對 for 珠算武者. Screen readers announce the math card's name
- Tier-4 subtraction does not borrow or subtract 0. Ordinal choices never include 0. Counting ones is never 0, and tens stay inside 1–9. Grade-2 groups are not always off by one. Three ordinal misses warm up at 湊十 tier 1
- The math question sits in its own parchment strip with dark walnut ink, and the strip grows to fit the question. The three answers sit in a full-width row below it, never overlap, and stay on screen at 640×360, 844×390, 1280×720, and 390×844. They are 96px tall where there is room and 54px on short landscape phones. 家長協助 sits below them. The 注音 dock is unchanged
- On landscape phones, character select shows both characters side by side without scrolling. Screenshots are in docs/screenshots/pr61-math-ui/
- Yao's grade-2 question stays open. Option A remains what is built: tier 5 ignores the grade-1 ceiling until an adaptive drop pulls it inside

### Playtest v0.4.2 layout fixes

- Map: the 家長提示 coach now has its own space beside the map (above it in portrait) instead of floating over it. Collapsed or open, it never covers a room dot, so a tap on a dot's centre always enters the room. Opening or closing it scrolls the next rooms back into view.
- Map at 640x360: the top bar fits on one line and the ☰ menu and tower rail get their own strip, so the visible map grows from about 84px to about 198px tall.
- Campfire: the three choices (休息, 刪牌, 升級) sit side by side in landscape and are a little shorter, so all three are on screen without scrolling at 640x360, 844x390, 1280x720 and 390x844.
- Shop: the 🗑️ remove-card button is disabled when you can't afford it, like the card and potion offers, and its label says there isn't enough gold.
- New `tests/e2e/layout-fit.spec.ts` checks all of the above. No game rules or save data changed (saves stay on version 4).

---

## [0.4.2] — 2026-10-27

### Shop layout

- On a phone, each shop offer keeps its full card, price, and the remove-card button on screen. Short landscape no longer hides the price under the fold.

### Cast prompt stream

- Each run stores `castSeed` and `castCounter`. Mode rolls, shuffle-bag refills, and distractor banks read that stream, so a reloaded checkpoint replays the same later prompts
- 注音神龕 and other event casts draw from that same stream. The question still on screen is not stored, so a reload shows the next prompt
- A save from before these fields still loads. The missing seed is filled in and the counter starts at 0
- Learner shuffle bags stay on the profile
- Debug score, tutorial start, and scene setup follow the run's character, or 共鳴武者 before one is chosen

### Encounter diversity

- Each act gains native listeners, buffers or scalers, and summoners. Act II and Act III elites are no longer recycled Act I fights. Bosses telegraph a brace, then one heavier hit. A small friend arrives on the shield after that hit, and the Act III boss grows one point during the brace.
- A correct 注音 cast softens a listening enemy's later attack. The current intent number stays put. Fizzles are not punished.
- Map fights use an easy opening quota and do not repeat a normal recipe across the next two fights on a path.

### Potion belt

- Added a 3-slot belt and six bottles: 護盾泡泡, 音波小石, 蜂蜜暖茶, 火花汽水, 翻頁果汁, and 合唱爆泡
- Combat, elite, and boss rewards can drop one bottle. Chance starts at 40 each act and steps by 10 inside 10–80. Treasure does not drop a bottle
- Shops sell two different bottles at 18 gold. A full belt must replace or leave a reward bottle before taking a card, and must discard before buying
- Potion damage that is not marked 直傷 still loses to Block and is not an Attack. No live bottle is 直傷, and none stops HP 0 from ending the run
- Moved saves to version 4. A v3 checkpoint loads with an empty belt

### Relic pool

- Added five 共鳴 relics for chests, elites, and bosses: 尋隙指套, 練功護腕, 換拍木魚, 聽勁護心, and 練功起勢
- Chests give gold and one relic. Elites and bosses still offer a card and also drop a relic. A repeated drop pays 20 gold
- 練功起勢 adds 練功 only for the first player turn, then that point is removed
- 聽勁護心 gives 3 Block the first time the run gains 勁. Block from a full defense arrives on the next player turn, so it cannot create another 勁. Block from a card arrives with that card. The parent note names 破綻借力 and 剛柔並濟 as immediate cases.
- Kept 初心音叉 as the starter. The four legacy relics still load for old saves and are not offered
- Moved saves to version 3. A v1 or v2 `relicId` becomes the ordered `relicIds` list
- Added tappable relic badges that show the Chinese name and effect. No relic skips casting
- On a short landscape screen the combat badges sit on their own full-width row, so six tokens stay on screen at 640×360

### Combat preview

- The next-turn intent pill applies Weak only when that status is still up after this enemy action ticks.

### Act I–III events

- Add ? rooms to every act and resolve each one once into an event, a normal fight, a shop, or a treasure.
- Ship the 30 events from the event bible, including act pools, shared events, and difficulty-15 results.
- Keep mid-event progress in the run save. Older saves still load.
- Random event relic rewards draw the five-relic pool and leave 初心音叉 in place. Named event relics are granted by id.
- Event potion rewards fill empty slots on the three-slot belt. A full belt stays visible and says the slots are full.
- Saves stay on version 4. Event progress is optional, so older checkpoints still load, including ones that also carry `castSeed` and `castCounter`.
- Event moth fights use the act-native 鐘粉蛾. A ? that becomes a fight uses the same easy and hard pools as a map fight.

### Engine seams for a future character

- Reserve a pluggable casting task, with 注音 as the only registered task and `math` still unimplemented in the game.
- Keep character select and score buckets per character id, and add an attempt model for a future three-choice row and number pad. 共鳴武者 prompts, saves, and the cast screen are unchanged.

### Board and phone layout

- Event screens use a felt intro panel, with the choices in a second column, so a short phone landscape keeps every option on screen.
- The potion belt reads as one strap, with a clear full or empty slot.
- Act I–III enemies and elites, including 鐘粉蛾, each have their own toy miniature. The moth no longer uses a bat portrait.
- Brace, strength, and a called friend show on the board as portrait badges and coloured intent pills. Hit targets stay the same size. A phone that hides the next-turn pill still shows these cues.

### Docs

- Design docs describe the tree after the Oct 27 merges: relics, potions, events, act-native fights, the cast seed, and the 珠算武者 seams.

---

## [0.4.1] — 2026-10-26

### Zhuyin corrections

- Correct Zhuyin readings and Traditional headwords in the card cues and phrase bank against 《重編國語辭典修訂本》, without changing the phrase schema or run-save format.
- Point pictured phrases at the 《重編國語辭典修訂本》 headword for that picture: 幹 ㄍㄢˋ, 更 ㄍㄥˋ, 卷 ㄐㄩㄢˋ, 期 ㄑㄧˊ, 甚 ㄕㄣˊ, 鑽 ㄗㄨㄢˋ, 撒 ㄙㄚˇ, and 微 ㄨㄟˊ.
- Remove the 還 ↩️ and 傳 📣 rows whose readings did not match the picture, because 歸還 ㄏㄨㄢˊ and 傳播 ㄔㄨㄢˊ were already in the bank.
- Remove the extra 桌 rows that repeated the same word and spelling.
- Keep 余 for the surplus picture. The revised dictionary defines 剩下、多餘 on 余, so it is not rewritten as 餘.
- Give the fourteen open phrase pictures the 《重編國語辭典修訂本》 reading for that picture: 背 ㄅㄟ, 鋪 ㄆㄨˋ, 興 ㄒㄧㄥˋ, 熟 ㄕㄨˊ, 掃 ㄙㄠˋ, 艘 ㄙㄠ, and 應 ㄧㄥˋ. 表, 量, 困, 將, 閑, 血, and 于 already had that reading.

### Combat and campfire fixes

- Searching the discard for a card type no longer deletes the cards still in the draw pile.
- The campfire remove-card screen can return to rest without deleting a card.
- Attack damage that is not marked 直傷 respects block and 易傷. Enemy block expires at that enemy's next action. This-turn cost discounts expire, and next-enemy-phase riders stack and expire with their text.
- Ambiguous single-character prompts for 了, 覺, and 樂 are removed. Pictured 還 and 傳 readings from the dictionary cleanup stay as they are.

### Playtest kit

- Add the parent kit for the two open human gates: a physical-device checklist, an Act I family session with Traditional Chinese read-aloud lines, and a blank record that stays out of git.
- Relic work may proceed in parallel and merges only after both playtests pass.
  That sentence is the published v0.4.1 note. The pool later merged on main; see [0.4.2].

### Browser stabilization

- Keep the 75-card score progression and current catalog while repairing dependencies and checking three browser engines.
- Add native menus/inspection, overlapping pause ownership, speech fallback, visible save failures, and animation cancellation recovery.
- Make B041 choose its physical Attack before casting; retain upstream B144 and B051 corrections with regression coverage.
- Preserve save/profile compatibility and separate historical audit results from integrated validation.

### Fight stays on screen

- Keep the hero on the board while a card is spelled, and play a monster's defeat before rewards when a cast ends the fight

### Complete card meta progression

- Replaced the temporary reviewed-wave offer gate with the designed cumulative
  score progression: 12 cards at 0, 33 at 300, 54 at 1,000, and all 75 at 2,000
- Added debug Meta controls that persistently set the active learner to any card
  unlock milestone
- Kept Act I on its nine-card teaching reward pool while score expands
  Acts II–III fights, shops, and treasure

### Combat layout

- Pinned the command deck to the bottom of the viewport so tall screens no
  longer show a band of empty garden under the hand

### Local playtest

- `npm start` opens the Vite game at `http://localhost:5173` on this computer

---

## [0.4.0] — 2026-08-21

### Resonance Wave 2 obtainability

- Added an explicit `reviewedWave` flag and `LIVE_REVIEWED_WAVE = 2` so character
  score can still unlock catalog rows in the 🃏 progress UI without leaking
  unreviewed English cards into later-act fights, shops, or treasure
- Act I remains the ten-card starter plus nine reward designs
- After character score 300, later acts can offer 13 reviewed Commons (深呼吸,
  邊擋邊唱, 試探拳, 開窗掌, 趁隙直拳, 掃堂尋隙, 練拳, 基本步, 低樁拳, 掃堂基本式,
  溫習, 基本防線, 守攻換拍) with Chinese faces, icons, and `+` text
- Uncommons and Rares that share the 300-point catalog band stay gated
- Fixed 邊擋邊唱 (`ne`) so its draw matches the card text
- Smith still upgrades one physical copy; reviewed live faces now stay Chinese
  after upgrade

---

## [0.3.1] — 2026-07-23

### Card-system foundation and Resonance Warrior

- Migrated run decks from ordered definition strings to validated physical
  `DeckCardV2` copies with stable UIDs and per-copy upgrade levels; valid V1
  saves migrate without losing, grouping, or reordering duplicates
- Added Attack/Skill/Power/Status/Curse categories, rarity/pool/tag metadata,
  ordered typed effects, authored upgrade resolution, and catalog validation
- Replaced the grouped deck popup with an exact-copy player deck and searchable
  designer catalog showing IDs, effects, targets, rarity, tags, upgrades,
  casting cues, unlock data, and balance notes
- Reframed the first character as 🧒🥋 共鳴武者 while preserving internal
  `echoMage` save compatibility; replaced Echo with additive 🎯 易傷 and added
  tagged basic-Attack scaling through the true Power 聲波架式
- Changed universal 🎵 初心音叉 to +1 on the first resolved Attack hit every
  player turn, including accurate failed-cast, blocked-hit, multi-hit, and area
  behavior
- Added live base-to-effective damage previews, tappable enemy status help,
  persistent player Power/relic badges, and fixed-height combat cards
- Consolidated sound, Options, deck/designer access, and development debug tools
  into one global pause menu on every viewport
- Updated the StS expansion roadmap and froze the old Echo-specific card,
  relic, potion, and upgrade rows pending a reviewed Resonance rewrite

---

## [0.3.0] — 2026-07-22

### Phone-screen optimization

- Added dedicated portrait and landscape phone layouts for combat, casting, the
  tower map, rewards, shops, rests, character selection, and title screens
- Rebuilt the phone hand as a full-width, snap-scrolling carousel with fixed card
  heights, a persistent action bar, and gesture arbitration between horizontal
  scrolling, tapping, and intentional upward casting
- Added a single large phone pause menu for sound, Options, the current deck, and
  development-only debug tools; its modal focus trap and scroll lock are shared
  with Options and the deck viewer
- Paused auto-submit, teaching reveals, and speech while the phone menu is open,
  then resumed the exact pending lesson without changing combat state
- Kept phone map nodes at least 48px while panning the route plane internally,
  preserving route alignment and keeping act/floor progress outside the map web
- Preserved browser pinch zoom and added reduced-height landscape layouts without
  remounting combat on orientation changes
- Added gesture and pause-timer unit tests plus Chromium/WebKit phone smoke tests
  alongside the existing three tablet viewport projects

### 共鳴武者 first playable wave

- Replaced the player-facing Echo Mage with 共鳴武者 while retaining the
  internal `echoMage` id for save compatibility
- Added 易傷、基礎攻擊／練功、轉拍、and 化勁／勁 combat rules with dedicated
  status and hit feedback
- Added the 5/4/1 starter, nine-card reward wave, and 初心音叉 first-hit relic
- Migrated decks and offers to stable physical card instances with V1 save
  compatibility
- Kept the remaining generated 75-card catalog, upgrades, Smith, and upgraded
  offers behind human review gates

---

## [0.2.1] — 2026-07-22

### Privacy and public-release hardening

- Added strict, size-bounded validation for saved runs, learner profiles, map
  topology, identifiers, and persisted display strings
- Removed third-party font requests, limited the development server to loopback,
  and added a restrictive production Content Security Policy
- Removed the debug panel from ordinary production bundles; query and storage
  flags can no longer enable release cheats
- Added local-only nickname guidance, a clear-all-data control, privacy notice,
  security policy, third-party notices, and a source-visible/no-license notice
- Added dependency automation, pinned GitHub Actions workflows, structured
  privacy-safe Issues, and security regression tests for the public release

---

## [0.2.0] — 2026-07-22

### Casting variety and learner profiles

- Replaced run-local recent-word avoidance with per-learner, persistent
  distinct-spelling shuffle bags and variant bags
- Added a reusable casting-provider contract and character gate id; Zhuyin is
  live now, while English and math remain reserved future providers
- Added vowel-family teaching for ㄚ／ㄛ／ㄜ, preschool core/broad vocabulary
  tiers, authored coverage floors, and promoted familiar starter-family words
  into the default core
- Expanded Options with up to four learner profiles plus topics, tones, answer
  length, distractors, prompt-mode weights, gentle adaptation, and word lists
- Added ambient mana-state cues without introducing another combat resource;
  combat currency remains 能量 and wrong casts keep the normal card/Energy cost
- Migrated existing runs, tutorial state, badges, practice totals, and phrase
  settings into the first learner while keeping audio and animation device-global
- Added unit/browser coverage for migration, profile isolation, persistent bags,
  vowel families, content floors, unsafe filters, and tablet profile controls

### Preschool onboarding and tablet polish

- Added a persistent global Options dialog: volume, 1×/2× gameplay motion,
  tutorial controls/replay, and phrase packs
- Added a first-run, single-enemy scripted lesson with deterministic cards,
  wrong-answer recovery, automatic targeting, and completion-on-victory
- Expanded successful spelling to a two-second animated teaching reveal; wrong
  casts now show the correct spelling
- Replaced aggregate player hit FX with ordered shield/HP impacts and distinct
  monster shield clang/crack/break feedback
- Parallelized end-turn card movement and centralized 1×/2× gameplay timing
- Rebuilt map/combat stages for landscape and portrait tablets, normalized map
  positions, scrollable 15-floor maps, larger touch targets, and higher route contrast
- Added reduced-motion handling, tutorial/speed debug controls, Vitest unit coverage,
  and Playwright smoke tests for three viewport sizes

### First character deck prototype

- Added 🧙‍♂️ 回音法師 with a character-bound starter deck and 🎵 初心音叉 relic
- Replaced the broad placeholder Act I pool with 3 starter designs and exactly 9
  reward designs organized by combat job
- Added the two-turn 🔔 Echo monster status, once-per-turn bonus damage,
  battle-long Echo defense scaling, status badges, and explanatory hit FX
- Added stable card icons and job labels so card identity is separate from the
  changing spelling-prompt emoji
- Preserved v1 run saves and documented a deliberate, instance-based upgrade path
- Kept remaining cards playable after the tutorial's first shield cast; End Turn
  is now a recommendation instead of an energy-breaking action lock

### Design research

- Added a source-backed StS1 systems reference covering combat, cards, character
  structure, enemies, maps, economy, relics, potions, progression, inspection,
  accessibility, balance metrics, and explicit copy/adapt/defer guidance
- Added review-ready design bibles for 75 base Echo Mage cards and their
  upgrades, 12 Colorless cards, five Statuses, eight Curses, 40 relics, 20
  potions, 30 events, complete encounter rosters, three optional-ending keys,
  and Act IV; these are documented targets and are not activated runtime content

### Distribution

- Added an official GitHub Pages release build, publishing the playable game
  under `/zhuyin-spire/`

---

## [0.1.0] — 2026-07-21

Baseline snapshot of the preschool Spire + 注音 game, documented for long-term resume.

### Gameplay & systems

- 3-act climb; **15×7** maps with STS-style path generation (silverua-inspired pipeline)
- Modular combat (`src/game/battle/*`): multi-enemy, intents (attack/heavy/multi/block), roles
- Drag-and-drop card play; shield drop zone; draw/discard card FX
- Full first-syllable 注音 cast gate + listen mode; large phrase bank; practice room
- Hand rules: draw 5 / max hand 10
- Rest heals **40% max HP**; **no** post-combat heal; gold/shop retuned for longer acts
- Starter relics; shop buy/remove; treasure rooms; elite/boss content
- localStorage run save on stable screens
- Adult coach strip; procedural SFX + Web Speech

### Tooling & docs

- Debug overlay (skip cast, resource cheats, jump screens/encounters)
- Project documentation under `docs/` + `AGENTS.md` + this changelog
- Standalone git repository for the game folder (tag `v0.1.0`)

[Unreleased]: #unreleased
[0.4.5]: #045--2026-10-29
[0.4.4]: #044--2026-10-28
[0.4.3]: #043--2026-10-28
[0.4.2]: #042--2026-10-27
[0.4.1]: #041--2026-10-26
[0.4.0]: #040--2026-08-21
[0.3.1]: #031--2026-07-23
[0.3.0]: #030--2026-07-22
[0.2.1]: #021--2026-07-22
[0.2.0]: #020--2026-07-22
[0.1.0]: #010--2026-07-21
