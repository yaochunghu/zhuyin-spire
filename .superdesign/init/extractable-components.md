# Extractable Superdesign components

The app has no declarative component framework. Most renderers combine game state and event wiring, so they should be supplied as context rather than converted into standalone Superdesign components before the faithful reproduction.

## GlobalControls

- Source: `src/main.ts`
- Category: layout
- Description: persistent pause/menu trigger outside the title screen.
- Extractable props: `screen` (string), `canViewDeck` (boolean).
- Hardcoded: menu icon, button classes, placement.

## AdultCoach

- Source: `src/main.ts`
- Category: layout
- Description: collapsible co-play guidance shared by game screens.
- Extractable props: `collapsed` (boolean), `title` (string), `body` (string), `castMode` (string).
- Hardcoded: family icon, toggle symbols, classes.

## CardFace

- Source: `src/ui/cards.ts`
- Category: basic
- Description: reusable physical-card face used in combat and collection surfaces.
- Extractable props: `cost`, `type`, `zhuyin`, `name`, `description`, `job`, `upgraded`.
- Hardcoded: markup order and semantic class names.

## PhonePauseMenu

- Source: `src/ui/phoneMenu.ts`
- Category: layout
- Description: focus-trapped phone pause sheet with resume, volume, options, and deck actions.
- Extractable props: `screen`, `canViewDeck`, `volume`, `open`.
- Hardcoded: action labels, icons, and modal structure.

## OptionsDialog

- Source: `src/ui/options.ts`
- Category: layout
- Description: settings, profiles, privacy, and data controls in a native DOM dialog.
- Extractable props: `open`, `activeSection`, `allowProfileSwitch`.
- Hardcoded: settings copy and semantic controls.

## Decision

No components are pre-extracted for the first draft: the faithful reproduction needs the complete screen composition, while the listed primitives are simple enough to reproduce directly. Reconsider extraction only after the approved direction stabilizes.
