# Key screen dependency trees

All screens enter through `src/main.ts`; only visually relevant local dependencies are shown.

## Title

Entry: `src/ui/screens.ts` → `renderTitle`

- `src/main.ts`
  - `src/ui/screens.ts`
    - `src/ui/runtime.ts`
    - `src/ui/options.ts`
      - `src/ui/modal.ts`
    - `src/ui/outcome.ts`
    - `src/game/state.ts`
    - `src/game/profiles.ts`
    - `src/game/audio.ts`
  - `src/ui/phoneMenu.ts`
    - `src/ui/modal.ts`
  - `src/styles/main.css`

## Character selection

Entry: `src/ui/screens.ts` → `renderCharacterPick`

- `src/ui/screens.ts`
  - `src/data/characters.ts`
  - `src/data/relics.ts`
  - `src/game/profiles.ts`
  - `src/game/state.ts`
  - `src/ui/runtime.ts`
  - `src/styles/main.css`

## Tower map and act clear

Entry: `src/ui/mapView.ts`

- `src/ui/mapView.ts`
  - `src/data/map.ts`
  - `src/game/state.ts`
  - `src/game/audio.ts`
  - `src/ui/runtime.ts`
  - `src/ui/responsive.ts`
  - `src/styles/main.css`

## Combat

Entry: `src/ui/combatView.ts`

- `src/ui/combatView.ts`
  - `src/ui/cards.ts`
  - `src/ui/cardFx.ts`
  - `src/ui/dragPlay.ts`
  - `src/ui/outcome.ts`
  - `src/ui/runtime.ts`
  - `src/ui/responsive.ts`
  - `src/game/combat.ts`
  - `src/game/state.ts`
  - `src/data/enemies.ts`
  - `src/data/cards.ts`
  - `src/styles/main.css`

## Cast check and practice

Entry: `src/ui/castView.ts`

- `src/ui/castView.ts`
  - `src/game/castCheck.ts`
  - `src/game/phraseSettings.ts`
  - `src/game/speech.ts`
  - `src/game/state.ts`
  - `src/ui/pauseTimers.ts`
  - `src/ui/runtime.ts`
  - `src/ui/responsive.ts`
  - `src/styles/main.css`

## Reward, shop, rest, smith, and removal

Entry: `src/ui/screens.ts`

- `src/ui/screens.ts`
  - `src/ui/cards.ts`
  - `src/ui/runtime.ts`
  - `src/game/state.ts`
  - `src/data/cards.ts`
  - `src/data/relics.ts`
  - `src/styles/main.css`

## Options, profiles, and privacy

Entry: `src/ui/options.ts`

- `src/ui/options.ts`
  - `src/ui/modal.ts`
  - `src/game/settings.ts`
  - `src/game/profiles.ts`
  - `src/game/privacy.ts`
  - `src/styles/main.css`

## Deck viewer

Entry: `src/ui/deckViewer.ts`

- `src/ui/deckViewer.ts`
  - `src/ui/cards.ts`
  - `src/ui/modal.ts`
  - `src/game/cardInstances.ts`
  - `src/data/cards.ts`
  - `src/styles/main.css`

## Defeat and victory

Entry: `src/ui/screens.ts` → `renderEnd`

- `src/ui/screens.ts`
  - `src/ui/outcome.ts`
  - `src/game/state.ts`
  - `src/game/progression.ts`
  - `src/styles/main.css`
