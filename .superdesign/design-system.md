# Zhuyin Spire — Magical Toy-Board Design System

## Product character

Zhuyin Spire is a child-first educational deckbuilder for early Zhuyin learners with adult co-play support. The interface should feel like a beloved tabletop playset opened at dusk: painted wooden pieces, molded resin tokens, stitched felt, warm lantern light, and tiny magical surprises. It must remain readable, sturdy, and calm enough for a young player to understand without relying on text alone.

The recommended direction is **Tabletop Diorama**. A **Vertical Tower Playset** branch should test a more literal stacked-tower composition without changing the interaction model.

## Non-negotiable architecture

- Keep Vite, TypeScript, imperative DOM rendering, SVG route paths, CSS animation, and native browser inputs.
- No PixiJS, canvas renderer, WebGL/WebGPU shader, engine ticker, or canvas-owned input.
- Cards, menus, Zhuyin keys, map nodes, enemies, HUD, and dialogs stay real DOM.
- Do not alter `RunState`, save keys, game rules, combat APIs, cast interfaces, progression, or balance.
- Runtime artwork is local and offline-friendly, referenced through a typed asset registry with emoji fallbacks.

## Palette

### World

- Night plum: `#18142A` — page edge and deep shadow.
- Twilight indigo: `#27234A` — room backdrop.
- Felt violet: `#3D356C` — main play surface.
- Ink: `#271C2D` — dark outlines and readable text on light pieces.

### Toy materials

- Birch cream: `#F7E7BE` — paper, card faces, labels.
- Honey wood: `#D99945` — board frame and warm structural pieces.
- Walnut edge: `#754629` — inset borders and toy seams.
- Lantern gold: `#FFD86A` — primary actions and rewards.
- Jade mint: `#79D3B5` — learning, energy, safe progress.
- Sky enamel: `#77BCE8` — shield and helpful information.
- Berry enamel: `#E96F8F` — danger and attack.
- Moss enamel: `#75A66E` — skill and rest.
- Chalk white: `#FFF8E8` — key glyphs and highlights.
- Muted lavender: `#C7B9D9` — secondary copy.

Use color plus shape/icon/text; never use color alone for state.

## Typography

- Chinese UI: system UI with `PingFang TC` / `Microsoft JhengHei` fallbacks for reliable local rendering.
- Display treatment: chunky, rounded, toy-label silhouette created with weight, letter spacing, layered text shadow, and cream/gold color—not a remote font.
- Zhuyin glyphs: high-weight system face, generous line height, no decorative distortion.
- Child prompts: 22–30px tablet, 18–24px phone, weight 800–900.
- Adult guidance: 13–16px tablet, 12–14px phone, weight 500–650.
- Numerical HUD: tabular numbers where supported.

## Spacing and geometry

- Base unit: 4px.
- Common gaps: 8, 12, 16, 20, 24, 32.
- Primary controls: minimum 64×64px.
- Map and enemy targets: minimum 48×48px.
- Small utility controls: minimum 44×44px.
- Cards: rounded physical silhouette, 16–22px radius, inset border, visible top/bottom material layers.
- Panels: 20–28px radius with double rim (highlight above, walnut shadow below).
- Safe-area insets are always respected.
- Depth should come from 2–3 restrained layers: contact shadow, material edge, top highlight.

## Shared shell

- Fill the viewport with a painted twilight room.
- Center a tactile board or play tray, up to roughly 960px at 1024×768.
- A warm wooden/felt frame visually unifies every state.
- Keep global pause/menu at the upper right, shaped as a small wooden gear or pause tile.
- Adult coach is a folded note or small instruction plaque that collapses away from primary play.
- Decorative props stay outside interaction hit areas and may crop safely.

## One tower, three themed sections

The run climbs one continuous tower. The materials and interaction language stay fixed while the scenery and ambient accents evolve by act. Transitions should feel like moving to a higher floor of the same handcrafted playset, never entering a different game.

### Act I — Enchanted Garden

- Narrative role: the welcoming tower base where the adventure begins.
- Atmosphere: lavender dusk, warm peach lanterns, open air, moss, plum blossoms, painted mountain cutouts.
- Map tokens: stepping stones, flowers, streams, bamboo, garden lanterns, and the garden tower gate.
- Accent balance: moss and jade are strongest; berry and sky remain card/HUD semantics.
- Surface detail: stitched violet felt, pale honey wood, painted river stones.
- Motion cue: drifting leaf or firefly accents implemented as sparse CSS decoration.

### Act II — Lantern Library

- Narrative role: the tower’s middle floors, where knowledge and deck mastery deepen.
- Atmosphere: cozy night library, scroll cubbies, book stacks, round windows, amber lantern pools.
- Map tokens: books, scrolls, ink stones, reading nooks, bridges, and archive doors.
- Accent balance: honey gold and cream become more prominent against the same violet felt.
- Surface detail: birch shelves, deckled paper, stitched labels, gently worn card edges.
- Motion cue: brief page-flutter or dust-mote accents implemented with restrained CSS.

### Act III — Celestial Observatory

- Narrative role: the tower summit and most magical, challenging section.
- Atmosphere: moonlit observatory, indigo sky, constellations, brass star paths, warm lantern counterlight.
- Map tokens: star charts, moon discs, telescope, astrolabe, observatory platforms, summit gate.
- Accent balance: midnight indigo and tarnished brass lead; jade, sky, berry, and gold keep their semantic meanings.
- Surface detail: dark walnut, brushed brass, dense violet felt, cream constellation paper.
- Motion cue: one slow star glint or orbit accent; remove it under reduced motion.

### Cross-act continuity

- Never recolor semantic card types, health, shield, energy, danger, or success by act.
- Use the same wooden board rim, cream paper, control geometry, card anatomy, HUD beads, map-node size, and focus treatment in every act.
- Title, character selection, practice, options, deck viewer, and profile/privacy screens use a neutral “tower foyer” blend of garden violet, library warmth, and observatory stars.
- Rest, shop, reward, combat, and map scenery inherit the current `actIndex`.
- Act-clear screens visibly transition the scenery upward: Garden → Library → Observatory.
- Victory uses the Observatory summit plus a restrained echo of garden leaves and library pages to represent the full climb.

## Components

### Buttons

- Primary: lantern-gold wooden tile, ink label, strong lower edge, visible focus ring.
- Secondary: cream or violet enamel tile with a lighter top rim.
- Danger: berry enamel with a dark lower rim.
- Pressed state translates 2–3px down while reducing the lower shadow.
- Disabled state loses saturation and depth but stays legible.

### Cards

- Cream paper center on a colored wooden/enamel frame.
- Cost is a raised circular bead at the top-left.
- Type is a stamped badge at the top-right.
- Zhuyin is the dominant art-room glyph; art supports it without competing.
- Name plate and rules compartment remain separate.
- Attack/defense/skill/power retain distinct frame colors and icons.
- Upgrades add a small star screw/badge, not a full recolor.

### HUD

- Life, shield, energy, gold, draw, and discard appear as toy counters or beads.
- Values remain text in the DOM.
- Compact clusters have strong silhouettes and no more than two visual depths.

### Map

- Route is stitched gold thread or painted inlay rendered by existing SVG.
- Nodes are raised room tokens with icon, shape, and label.
- Available nodes glow from beneath; completed nodes settle into the board; boss tokens are unmistakably larger.
- Preserve branch readability and all native button targets.

### Combat

- Enemies stand as painted cardboard/resin figures on small bases.
- Background is non-interactive scenery.
- Intent and HP attach to each enemy as small hanging plaques.
- Player hand reads as a fan or horizontal toy-card rail while retaining native horizontal scroll.
- Avoid covering the enemy stage with adult copy or card descriptions.

### Casting and practice

- Prompt appears on a small stage/easel.
- Zhuyin choices are chunky movable letter tiles arranged as real buttons.
- Attempt slots are shallow tray wells.
- Correctness feedback is celebratory but brief; timers pause under menus and dialogs.

### Dialogs and menus

- Present as an instruction-book page, wooden drawer, or folded felt panel.
- Keep `role=dialog`, focus trapping, Escape handling, and scroll lock.
- Do not disguise destructive data controls as playful rewards.

## Motion

- Default transitions: 120–220ms.
- Board entry: subtle lift and settle.
- Buttons: physical press.
- Map selection: token rise + underglow.
- Combat impact: short squash/recoil and dust/spark accent.
- Rewards: one controlled burst, not continuous confetti.
- No continuous background motion that competes with reading.
- Under reduced motion: remove parallax, shaking, floating, and long transitions; preserve immediate state indication.
- Timers and automated casting submission remain pause-aware.

## Asset treatment

- Production assets: local WebP for illustrated backdrops/figures and PNG where alpha or crisp UI detail is necessary.
- Visual language: hand-painted 3D storybook toy photography, soft gouache texture, rounded forms, warm rim light, no text baked into images.
- Isolated props should be generated on a flat chroma background for local removal when alpha is needed.
- Artwork must tolerate center-crop and edge-crop at every target viewport.
- Emoji remain functional fallbacks in the typed registry and must never become the only semantic label.

## Responsive behavior

### 1024×768 primary

- Use a broad tabletop tray with map/combat/casting centered.
- Keep major controls within comfortable reach, not at extreme corners.
- Allow two-column secondary screens where it improves scanning.

### Tablet portrait

- Stack stage and hand vertically.
- Keep route/web centered with no horizontal page scrolling.
- Dialogs use most width but maintain an outer board margin.

### Phone portrait

- Use a single-column toy tray.
- Compress decoration before compressing controls or type.
- Card hand remains horizontally scrollable.
- Coach defaults collapsed; global menu remains reachable.

### Phone landscape

- Stage and controls may split left/right.
- Respect short-height media behavior and safe areas.
- Maintain 64px primary controls whenever physically possible; never below existing tested targets.

## Screen coverage

The system must visibly cover all 15 states: title, character selection, map, act clear, rest, smith, rest removal, shop, shop removal, combat, cast check, practice, reward, defeat, and victory. It must also cover phone pause, deck viewer, options/profile/privacy dialogs, tutorial coach, multi-enemy combat, and reduced-motion states.

## Variant guidance

### Tabletop Diorama — recommended

- Wide felt play tray with miniature tower scenery at the back edge.
- Cards and tokens occupy the foreground.
- Strongest fit for combat readability and phone adaptation.
- Whimsical, handcrafted, warm, calm.

### Vertical Tower Playset — comparison

- Board is a tall sectional tower toy with rooms stacked upward.
- More architectural and adventurous.
- Must not reduce card readability or create excessive vertical travel.
- Phone portrait can lean into the tower; landscape must still become a practical tray.

## Acceptance cues

- A screenshot should immediately read as one coherent physical toy world.
- Every child action has a large, obvious affordance.
- Every screen uses the same material, lighting, border, and icon language.
- Text and controls remain crisp DOM content above art.
- No missing art, broken fallbacks, clipping, overlap, horizontal page overflow, console errors, or behavioral regressions.
