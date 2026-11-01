# Art inventory

What is on screen, and what is only stored. The loader is `src/ui/assets.ts`
(`ART_ASSETS`, `THEME_ASSETS`, `RELIC_ART`, and `sceneKeysFor` for room
backdrops). A file that no `ART_ASSETS` entry imports is not shipped by the
build and the game does not show it.

Regular and elite enemy sprites stay on their existing `ART_ASSETS` keys.
The hero and the three bosses now also have damage-stage stills, and the hero
has combat poses. See [Hero and boss damage stages](#hero-and-boss-damage-stages).

Sizes below are the file on disk. KB is bytes ÷ 1024, to one decimal.

## How the live slots draw

- **Plates.** 1920×1080 opaque WebP. `sceneKeysFor(state, screen)` picks
  the room for each screen (see [Which screen shows which backdrop](#which-screen-shows-which-backdrop)).
  `applyVisualTheme` sets `--scene-image` to the first two keys of that chain,
  stacked (`url(primary), url(next)`), so a failed load shows the next room.
  CSS paints it with `background-size: cover`.
- **Transitions.** 1536×1152 (4:3), opaque WebP. `.act-transition-art img`
  uses `object-fit: cover`. Phone portrait
  (`max-width: 760px` and `orientation: portrait`) uses
  `object-fit: contain` and `object-position: center top`, so the full 4:3
  frame stays visible.
- **Tokens.** 320×320 with transparency. Map dots paint
  `--room-token-image` at `center / 126%`.
- **Props.** Source art is 214×320 with transparency. The corner box uses
  `background-size: contain` (`src/styles/toy-board.css`). The base rule is a
  square `clamp(74px, 12vw, 138px)`. From 761 px to about 1150 px wide, 12vw
  is between the 74 px floor and the 138 px cap, so the box grows with the
  window. At `max-width: 760px` that rule is overridden and the prop renders
  at **72 px** (opacity 0.42). The prop is not drawn on the map, in combat,
  or on the cast screen.
- **Relic icons.** 128×128 with transparency, inside the relic badge (36 px
  in the 48 px badge; 32 px when combat squeezes the badge to 44 px). A relic
  with no file keeps its emoji. The inspect dialog and the character-pick
  starter use the same face.

The four visual themes (`data-visual-theme`) are `garden`, `library`,
`observatory` and `heart` (Act IV and the victory screen), plus `foyer`. A
theme sets the tint, token and prop; the backdrop comes from the resolver.
`heart` uses `tokenHeart`, borrows `propTelescope` and the observatory
ambience until Design picks its own.

## Plates in use

| File | Key | px | Bytes | KB |
|---|---|---|---|---|
| `src/assets/art/act-garden.webp` | `sceneGarden` | 1920×1080 | 212,602 | 207.6 |
| `src/assets/art/act-library.webp` | `sceneLibrary` | 1920×1080 | 139,180 | 135.9 |
| `src/assets/art/act-observatory.webp` | `sceneObservatory` | 1920×1080 | 157,576 | 153.9 |

## Transitions in use

| File | Key | px | Bytes | KB |
|---|---|---|---|---|
| `src/assets/art/transitions/garden-to-library.webp` | `transitionGardenLibrary` | 1536×1152 | 194,890 | 190.3 |
| `src/assets/art/transitions/library-to-observatory.webp` | `transitionLibraryObservatory` | 1536×1152 | 128,378 | 125.4 |

These replace the old 1536×1024 (3:2) files (386,126 and 370,952 bytes).

## Tokens in use

| File | Key | px | Bytes | KB |
|---|---|---|---|---|
| `src/assets/art/token-garden.webp` | `tokenGarden` | 320×320 | 8,814 | 8.6 |
| `src/assets/art/token-library.webp` | `tokenLibrary` | 320×320 | 8,762 | 8.6 |
| `src/assets/art/token-observatory.webp` | `tokenObservatory` | 320×320 | 8,820 | 8.6 |

## Props in use

| File | Key | Where | px | Bytes | KB |
|---|---|---|---|---|---|
| `src/assets/art/prop-blossom.webp` | `propBlossom` | Act I | 214×320 | 12,112 | 11.8 |
| `src/assets/art/prop-books.webp` | `propBooks` | Act II | 214×320 | 9,766 | 9.5 |
| `src/assets/art/prop-telescope.webp` | `propTelescope` | Act III | 214×320 | 10,588 | 10.3 |
| `src/assets/art/prop-lantern.webp` | `propLantern` | Foyer screens | 214×320 | 8,702 | 8.5 |

On a phone (viewport at most 760 px wide) all four render at 72 px. Wider windows use the 74 px clamp floor until 12vw is larger.

## Relic icons in use

Files are `src/assets/art/relics/<file>`. Each is 128×128 with transparency.
`RELIC_ART` in `src/ui/assets.ts` is the map. The fallback is still the relic emoji.

| File | Relic id | Bytes | KB |
|---|---|---|---|
| `relic-tuning-fork.webp` | `tuningFork` | 4,936 | 4.8 |
| `relic-gap-thumb.webp` | `gapThumb` | 4,796 | 4.7 |
| `relic-training-wrap.webp` | `trainingWrap` | 4,826 | 4.7 |
| `relic-tempo-wood.webp` | `tempoWood` | 4,458 | 4.4 |
| `relic-listening-heart.webp` | `listeningHeart` | 5,174 | 5.1 |
| `relic-training-stance.webp` | `trainingStance` | 5,674 | 5.5 |
| `relic-wood-beads.webp` | `woodBeads` | 4,490 | 4.4 |
| `relic-bead-pouch.webp` | `beadPouch` | 5,324 | 5.2 |
| `relic-ruler-charm.webp` | `rulerCharm` | 5,066 | 4.9 |
| `relic-ten-bell.webp` | `tenBell` | 4,484 | 4.4 |
| `relic-eraser.webp` | `eraser` | 4,376 | 4.3 |
| `relic-pocket-metronome.webp` | `pocketMetronome` | 4,166 | 4.1 |
| `relic-moon-music-box.webp` | `moonMusicBox` | 4,336 | 4.2 |
| `relic-rain-sound-tube.webp` | `rainSoundTube` | 3,390 | 3.3 |
| `relic-choir-ribbon.webp` | `choirRibbon` | 6,530 | 6.4 |

Emoji placeholders that stay, because this drop has no file for them:

- Legacy: `shieldCharm`, `coinPouch`, `morningSpark`, `luckyDraw`
- Any relic added later that is not listed above

## Hero and boss damage stages

Ruling 25A. The rule is `damageStageFor(hp, maxHp)` in `src/ui/damageStage.ts`:

| HP % (`hp / maxHp × 100`, hp clamped to max) | Stage |
|---|---|
| above 66 | `fresh` (the existing still) |
| above 33, up to 66 inclusive | `scuffed` |
| 33 or below, hp ≤ 0, or maxHp ≤ 0 | `beaten` |

Fractions between 33 and 34 count as scuffed: 66 → scuffed, 66.01 → fresh,
34 → scuffed, 33.5 → scuffed, 33 → beaten. 1/3 HP (33.33%) is scuffed.

`stageArtKeyFor(actor, stage)` maps the stage to art. It covers `hero`,
`boss1`, `boss2`, `boss3`, the `boss` alias (boss1 art), and `tempoGolem`.
Every other enemy, and any stage with no file, falls back to the fresh still.
If a stage or pose image fails to load, the `<img>` retries the fresh still
(`data-fallback-src`), then shows the emoji.

Hero poses (`src/ui/heroPose.ts`, `flashHeroPose`). The img `src` is swapped in
place, never by a remount. A pose shows for 600 ms (scaled by game speed),
then the HP still returns:

- **attack:** an attack card resolves, or a `playerStrike` FX
- **cast:** a skill or power card resolves, or energy / 練功 / 勁 / 轉拍 FX
- **defend:** a shield card resolves, a `playerBlock` FX, or a shield soaks the whole hit
- **hurt:** an enemy hit gets through to HP
- **faint:** held as the still at 0 HP (the battle outro before the defeat screen).
  Transient poses are skipped while fainted.

Under `prefers-reduced-motion: reduce` the transient poses are skipped. Damage
stages still apply, because they are state.

All hero stills share the idle's 512×512 canvas with the feet at y=492. Boss
stages share each fresh boss canvas (512×512, ground y=489). They render in
the same `.combat-hero-art` / `.enemy-miniature-art` box with no per-image
offset. Combat preloads the hero and boss stills.

Only 共鳴武者 (`echoMage`) has hero art. 珠算武者 stays on its emoji.

| File | Key | Use | px | Bytes | KB |
|---|---|---|---|---|---|
| `hero-martial-artist.webp` | `heroMartialArtist` | fresh still (new batch-01 idle) | 512×512 | 19,862 | 19.4 |
| `hero-martial-artist-scuffed.webp` | `heroMartialArtistScuffed` | scuffed still | 512×512 | 17,020 | 16.6 |
| `hero-martial-artist-beaten.webp` | `heroMartialArtistBeaten` | beaten still | 512×512 | 16,776 | 16.4 |
| `hero-martial-artist-attack.webp` | `heroMartialArtistAttack` | attack pose | 512×512 | 34,116 | 33.3 |
| `hero-martial-artist-cast.webp` | `heroMartialArtistCast` | cast pose | 512×512 | 25,426 | 24.8 |
| `hero-martial-artist-defend.webp` | `heroMartialArtistDefend` | defend pose | 512×512 | 22,512 | 22.0 |
| `hero-martial-artist-hurt.webp` | `heroMartialArtistHurt` | hurt pose | 512×512 | 25,156 | 24.6 |
| `hero-martial-artist-faint.webp` | `heroMartialArtistFaint` | faint still at 0 HP (lying flat, bottom y=492) | 512×512 | 16,872 | 16.5 |
| `enemies/boss-1-scuffed.webp` | `enemyBoss1Scuffed` | boss1 / boss | 512×512 | 48,754 | 47.6 |
| `enemies/boss-1-beaten.webp` | `enemyBoss1Beaten` | boss1 / boss | 512×512 | 40,600 | 39.6 |
| `enemies/boss-2-scuffed.webp` | `enemyBoss2Scuffed` | boss2 | 512×512 | 50,710 | 49.5 |
| `enemies/boss-2-beaten.webp` | `enemyBoss2Beaten` | boss2 | 512×512 | 46,184 | 45.1 |
| `enemies/boss-3-scuffed.webp` | `enemyBoss3Scuffed` | boss3 | 512×512 | 53,156 | 51.9 |
| `enemies/boss-3-beaten.webp` | `enemyBoss3Beaten` | boss3 | 512×512 | 51,468 | 50.3 |
| `enemies/boss-tempoGolem-scuffed.webp` | `enemyTempoGolemScuffed` | dormant | 768×768 | 53,502 | 52.2 |
| `enemies/boss-tempoGolem-beaten.webp` | `enemyTempoGolemBeaten` | dormant | 768×768 | 46,706 | 45.6 |

Paths are under `src/assets/art/`. The fresh boss stills (`boss-1/2/3.webp`)
did not change.

**TempoGolem is dormant.** The two TempoGolem stills (768×768, ground y=740)
are registered so they ship, and `stageArtKeyFor('tempoGolem', …)` resolves
them. But there is no TempoGolem enemy and no fresh TempoGolem idle yet, so
nothing shows them. When the boss lands, add its enemy def, a fresh idle key,
and `tempoGolem.fresh` in `STAGE_ART`. Also map the def id to `tempoGolem` if
the id differs.

## Which screen shows which backdrop

All of this lives in `sceneKeysFor` in `src/ui/assets.ts`. It reads only saved
run fields (`screen`, `actIndex`, `activeNodeId`, `currentNodeId`, the node's
`row` and `kind`, `eventTrack.resolutions[nodeId]`, `eventTrack.active`), so a
reloaded save comes back in the same room. The lower/upper boundary is
`UPPER_FIRST_ROW = 8` in `src/data/map.ts`: rows 0–7 (第 1–8 層) are lower,
rows 8–14 (第 9–15 層) upper, row 15 the boss chamber.

| Screen / room (Acts I–III) | Scene | Falls back to |
|---|---|---|
| ⚔️ fight, 💀 elite, ❓ rolled as fight, 💎 treasure (`reward`), and their `castCheck` / `defeat` | lower plate (rows 0–7) or `scene<Act>Upper` (8–14) | lower plate |
| 🐉 boss, its reward, cast and defeat | `scene<Act>Boss` | lower plate |
| 🔥 `rest` / `smith` / `removeCard` (every camp, row 14 too) | `scene<Act>Camp` | floor scene, lower plate |
| 🏪 `shop` / `shopRemove` (map shop or ❓ shop) | `scene<Act>Shop` | floor scene, lower plate |
| ❓ `event` / `eventCast`, and a fight launched from the event | that event's `sceneEvent*` (`EVENT_SCENE_BY_ID`) | floor scene, lower plate |
| `map` | floor scene of the next row, capped at upper | lower plate |
| `actClear` | the next act's lower plate | — |

| Act IV / foyer / end | Scene | Falls back to |
|---|---|---|
| Act IV (`actIndex` 3) camp, shop, rehearsal (elite), boss | `sceneHeartCamp` / `sceneHeartShop` / `sceneHeartRehearsal` / `sceneHeartBoss` | `sceneHeartBoss`, `sceneObservatory` |
| Act IV map | the next room on the route; `sceneHeartCamp` before the first | same |
| `title`, `relicPick`, `practice` | `sceneFoyer` under a light tint | the foyer gradients |
| `victory` (after 萬音之心, or an Act III clear without keys) | `sceneHeartBossOpen` (open top door) | `sceneHeartBoss`, `sceneObservatory` |

No Acts I–III chain contains `sceneHeartBoss` or `sceneHeartBossOpen`
(Q81 A); `tests/unit/backdrop-wiring.test.ts` checks every context.

Three Design calls are one-line switches next to the resolver:
`EVENT_FIGHT_SCENE` (event room or floor scene), `MAP_SCENE_ROW` (next or
current row) and `ACT_CLEAR_SCENE` (next act's lower plate or the cleared
boss chamber).

Act IV is not in the game yet (`ActNumber` is 1–3), so its rows are tested on
synthetic state only. `sceneEventAbacusShrine` has no file and is not
registered; if that event ships first, it uses the floor scene.

The five Act III fixes are already these files: `scene-event-last-rehearsal`,
`scene-event-wind-hall`, `scene-event-empty-audience`,
`scene-event-backward-song` (regrade), and `scene-event-quiet-library`
(brass lamp).

### Act IV token

| File | Key | px | Bytes | KB |
|---|---|---|---|---|
| `src/assets/art/token-heart.webp` | `tokenHeart` (塔頂之心) | 320×320 | 7,534 | 7.4 |

### Per-floor rooms, foyer, camps, shops, victory

| File | Key | Bytes | KB |
|---|---|---|---|
| `backdrops/act-garden-upper.webp` | `sceneGardenUpper` | 200,704 | 196.0 |
| `backdrops/act-garden-boss.webp` | `sceneGardenBoss` | 212,672 | 207.7 |
| `backdrops/act-library-upper.webp` | `sceneLibraryUpper` | 219,858 | 214.7 |
| `backdrops/act-library-boss.webp` | `sceneLibraryBoss` | 157,344 | 153.7 |
| `backdrops/act-observatory-upper.webp` | `sceneObservatoryUpper` | 130,986 | 127.9 |
| `backdrops/act-observatory-boss.webp` | `sceneObservatoryBoss` | 169,338 | 165.4 |
| `backdrops/act-heart-boss.webp` | `sceneHeartBoss` | 216,402 | 211.3 |
| `backdrops/act-heart-camp.webp` | `sceneHeartCamp` | 131,372 | 128.3 |
| `backdrops/act-heart-rehearsal.webp` | `sceneHeartRehearsal` | 100,158 | 97.8 |
| `backdrops/act-heart-shop.webp` | `sceneHeartShop` | 219,720 | 214.6 |
| `backdrops/foyer.webp` | `sceneFoyer` | 163,622 | 159.8 |
| `backdrops/scene-garden-camp.webp` | `sceneGardenCamp` | 222,872 | 217.6 |
| `backdrops/scene-library-camp.webp` | `sceneLibraryCamp` | 217,430 | 212.3 |
| `backdrops/scene-observatory-camp.webp` | `sceneObservatoryCamp` | 188,530 | 184.1 |
| `backdrops/scene-garden-shop.webp` | `sceneGardenShop` | 202,908 | 198.2 |
| `backdrops/scene-library-shop.webp` | `sceneLibraryShop` | 215,972 | 210.9 |
| `backdrops/scene-observatory-shop.webp` | `sceneObservatoryShop` | 203,582 | 198.8 |
| `backdrops/scene-heart-boss-victory.webp` | `sceneHeartBossOpen` (open top door) | 216,338 | 211.3 |

### Event rooms

| File | Key | Bytes | KB |
|---|---|---|---|
| `backdrops/scene-event-humming-well.webp` | `sceneEventHummingWell` | 222,330 | 217.1 |
| `backdrops/scene-event-luthier.webp` | `sceneEventLuthier` | 216,934 | 211.8 |
| `backdrops/scene-event-memory-album.webp` | `sceneEventMemoryAlbum` | 200,872 | 196.2 |
| `backdrops/scene-event-moon-gong.webp` | `sceneEventMoonGong` | 207,892 | 203.0 |
| `backdrops/scene-event-phonetic-shrine.webp` | `sceneEventPhoneticShrine` | 211,928 | 207.0 |
| `backdrops/scene-event-quiet-library.webp` | `sceneEventQuietLibrary` | 215,490 | 210.4 |
| `backdrops/scene-event-resonant-anvil.webp` | `sceneEventResonantAnvil` | 220,724 | 215.6 |
| `backdrops/scene-event-three-doors.webp` | `sceneEventThreeDoors` | 194,488 | 189.9 |
| `backdrops/scene-event-tiny-conductor.webp` | `sceneEventTinyConductor` | 210,984 | 206.0 |
| `backdrops/scene-event-whispering-door.webp` | `sceneEventWhisperingDoor` | 217,754 | 212.7 |
| `backdrops/scene-event-tuning-fountain.webp` | `sceneEventTuningFountain` | 201,814 | 197.1 |
| `backdrops/scene-event-lost-metronome.webp` | `sceneEventLostMetronome` | 214,940 | 209.9 |
| `backdrops/scene-event-bell-rope.webp` | `sceneEventBellRope` | 211,202 | 206.3 |
| `backdrops/scene-event-dusty-score.webp` | `sceneEventDustyScore` | 209,502 | 204.6 |
| `backdrops/scene-event-sleeping-chime.webp` | `sceneEventSleepingChime` | 214,074 | 209.1 |
| `backdrops/scene-event-lantern-choir.webp` | `sceneEventLanternChoir` | 216,888 | 211.8 |
| `backdrops/scene-event-heated-organ.webp` | `sceneEventHeatedOrgan` | 213,724 | 208.7 |
| `backdrops/scene-event-broken-bridge.webp` | `sceneEventBrokenBridge` | 207,800 | 202.9 |
| `backdrops/scene-event-echo-market.webp` | `sceneEventEchoMarket` | 216,406 | 211.3 |
| `backdrops/scene-event-moth-rehearsal.webp` | `sceneEventMothRehearsal` | 202,242 | 197.5 |
| `backdrops/scene-event-moon-music-box.webp` | `sceneEventMoonMusicBox` | 213,554 | 208.5 |
| `backdrops/scene-event-dripping-rhythm.webp` | `sceneEventDrippingRhythm` | 219,508 | 214.4 |
| `backdrops/scene-event-silent-classroom.webp` | `sceneEventSilentClassroom` | 209,046 | 204.1 |
| `backdrops/scene-event-rain-tube.webp` | `sceneEventRainTube` | 215,190 | 210.1 |
| `backdrops/scene-event-mirror-stage.webp` | `sceneEventMirrorStage` | 201,376 | 196.7 |
| `backdrops/scene-event-last-rehearsal.webp` | `sceneEventLastRehearsal` | 210,070 | 205.1 |
| `backdrops/scene-event-star-bell.webp` | `sceneEventStarBell` | 214,548 | 209.5 |
| `backdrops/scene-event-backward-song.webp` | `sceneEventBackwardSong` | 215,820 | 210.8 |
| `backdrops/scene-event-empty-audience.webp` | `sceneEventEmptyAudience` | 216,642 | 211.6 |
| `backdrops/scene-event-wind-hall.webp` | `sceneEventWindHall` | 218,022 | 212.9 |

Paths are under `src/assets/art/`.

## Retired

`prop-star.webp` (`propStar`) is removed from `src/assets/art/` and from
`ART_ASSETS`. No theme assigned it. The old file was 214×320 and 8,466 bytes.

## Source

Original art generated with Grok Bot's built-in image generation. See
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Room plates came from
Grok Imagine. Relic icons, tokens, props, and transitions came from
GenerateImage. Prompts were text only.
