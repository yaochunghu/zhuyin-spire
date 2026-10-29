# Art inventory

What is on screen, and what is only stored. The loader is `src/ui/assets.ts`
(`ART_ASSETS`, `THEME_ASSETS`, `RELIC_ART`). A file in
`src/assets/art/backdrops/` or `token-heart.webp` is not imported, so the
build does not ship it and the game does not show it.

Enemy sprites and the hero portrait stay on their existing `ART_ASSETS` keys.
This drop did not change them.

Sizes below are the file on disk. KB is bytes ÷ 1024, to one decimal.

## How the live slots draw

- **Plates.** 1920×1080 opaque WebP. `THEME_ASSETS` points each act at one
  plate (`sceneGarden`, `sceneLibrary`, `sceneObservatory`). CSS paints
  `--scene-image` with `background-size: cover`.
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

There is no per-floor, shop, camp, event, foyer, or Act IV theme. Those plates
wait on a separate design spec.

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

## Registered, not shown

Same 1920×1080 opaque WebP spec as the plates in use. Nothing in
`THEME_ASSETS` or the screen code points at these. `sceneEventAbacusShrine`
was not in this drop.

The five Act III fixes are already these files: `scene-event-last-rehearsal`,
`scene-event-wind-hall`, `scene-event-empty-audience`,
`scene-event-backward-song` (regrade), and `scene-event-quiet-library`
(brass lamp).

### Act IV token

| File | Asset | px | Bytes | KB |
|---|---|---|---|---|
| `src/assets/art/token-heart.webp` | `tokenHeart` (塔頂之心) | 320×320 | 7,534 | 7.4 |

### Per-floor rooms, foyer, camps, shops, victory

| File | Asset id | Bytes | KB |
|---|---|---|---|
| `backdrops/act-garden-upper.webp` | `act-garden-upper` | 200,704 | 196.0 |
| `backdrops/act-garden-boss.webp` | `act-garden-boss` | 212,672 | 207.7 |
| `backdrops/act-library-upper.webp` | `act-library-upper` | 219,858 | 214.7 |
| `backdrops/act-library-boss.webp` | `act-library-boss` | 157,344 | 153.7 |
| `backdrops/act-observatory-upper.webp` | `act-observatory-upper` | 130,986 | 127.9 |
| `backdrops/act-observatory-boss.webp` | `act-observatory-boss` | 169,338 | 165.4 |
| `backdrops/act-heart-boss.webp` | `act-heart-boss` | 216,402 | 211.3 |
| `backdrops/act-heart-camp.webp` | `act-heart-camp` | 131,372 | 128.3 |
| `backdrops/act-heart-rehearsal.webp` | `act-heart-rehearsal` | 100,158 | 97.8 |
| `backdrops/act-heart-shop.webp` | `act-heart-shop` | 219,720 | 214.6 |
| `backdrops/foyer.webp` | `foyer` | 163,622 | 159.8 |
| `backdrops/scene-garden-camp.webp` | `scene-garden-camp` | 222,872 | 217.6 |
| `backdrops/scene-library-camp.webp` | `scene-library-camp` | 217,430 | 212.3 |
| `backdrops/scene-observatory-camp.webp` | `scene-observatory-camp` | 188,530 | 184.1 |
| `backdrops/scene-garden-shop.webp` | `sceneGardenShop` | 202,908 | 198.2 |
| `backdrops/scene-library-shop.webp` | `sceneLibraryShop` | 215,972 | 210.9 |
| `backdrops/scene-observatory-shop.webp` | `sceneObservatoryShop` | 203,582 | 198.8 |
| `backdrops/scene-heart-boss-victory.webp` | `sceneHeartBoss` victory variant | 216,338 | 211.3 |

The victory screen still uses `sceneObservatory`.

### Event rooms

| File | Asset id | Bytes | KB |
|---|---|---|---|
| `backdrops/scene-event-humming-well.webp` | `scene-event-humming-well` | 222,330 | 217.1 |
| `backdrops/scene-event-luthier.webp` | `scene-event-luthier` | 216,934 | 211.8 |
| `backdrops/scene-event-memory-album.webp` | `scene-event-memory-album` | 200,872 | 196.2 |
| `backdrops/scene-event-moon-gong.webp` | `scene-event-moon-gong` | 207,892 | 203.0 |
| `backdrops/scene-event-phonetic-shrine.webp` | `scene-event-phonetic-shrine` | 211,928 | 207.0 |
| `backdrops/scene-event-quiet-library.webp` | `scene-event-quiet-library` | 215,490 | 210.4 |
| `backdrops/scene-event-resonant-anvil.webp` | `scene-event-resonant-anvil` | 220,724 | 215.6 |
| `backdrops/scene-event-three-doors.webp` | `scene-event-three-doors` | 194,488 | 189.9 |
| `backdrops/scene-event-tiny-conductor.webp` | `scene-event-tiny-conductor` | 210,984 | 206.0 |
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
