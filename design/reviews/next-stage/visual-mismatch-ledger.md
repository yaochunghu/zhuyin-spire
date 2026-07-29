# Visual Mismatch Ledger

Reference system: approved Tabletop Diorama direction in
`.superdesign/design-system.md`, with Garden, Library, and Observatory as the
three sections of one tower.

## Resolved findings

| Area | Concept evidence | Render evidence | Resolution |
| --- | --- | --- | --- |
| Enemy imagery | Combatants should read as handcrafted tabletop miniatures, not emoji | Initial combat used emoji for 20 canonical enemies | Added 20 transparent 512×512 WebP miniatures and routed every enemy definition through the typed registry |
| Asset consistency | Resin/gouache figures, warm rim light, walnut bases | Early generated sheets contained two neighboring-cell fragments | Removed chroma backgrounds, isolated silhouettes, removed disconnected fragments, and verified the final 20-asset proof sheet |
| Enemy density | Combat must remain legible with 1–5 enemies | Five-enemy tablet and phone formations needed a common scale | Added shared `enemy-miniature-art` sizing for single, multi, and 4–5 enemy layouts; intents, art, bars, and targets remain distinct |
| Card density | Five cards should not overlap when space allows; ten must remain reachable | Ten-card capture requires horizontal travel between pile rails | Preserved separated cards and native horizontal hand scrolling; draw and discard rails remain fixed at the edges |
| Transition story | Act I roots become shelves; Act II shelves become Observatory architecture | The initial wide transition crop showed only one side on portrait phones | Portrait now displays the complete transformation strip above a centered DOM content panel; tablet and landscape stay full-bleed |
| Transition timing | A short controlled reveal should settle on a readable final frame | Deterministic capture initially froze image opacity mid-transition | Added a settled-frame capture gate; reduced motion removes both reveal and lift immediately |
| Ambience | Sparse Garden, Library, and Observatory motion must never interfere with play | No act-specific ambient layer existed | Added pointer-free, `aria-hidden` petals/fireflies, dust/page flutter, and star glint/orbit; reduced motion disables every loop |
| Fallback behavior | Offline local art with emoji only on failure | New images needed an explicit failure path | Every registry item has alt text and fallback; rendered failure coverage confirms emoji remains visible |
| Responsive layout | One system across tablet, portrait, and landscape | 45 captures needed overflow and clipping review | Final audit reports zero horizontal page overflow, missing images, console errors, or controls clipped outside non-scrollable regions |
| Typography and copy | Educational text and controls remain real DOM and preserve approved copy | Raster transitions could have encouraged baked-in labels | Transition and enemy assets contain no UI text; all headings, counters, glyphs, labels, and controls remain DOM |
| Palette and materials | Plum felt, brass, walnut, ivory learning tiles | Enemy families needed act distinction without becoming separate games | Garden uses moss/coral, Library uses indigo/parchment, Observatory uses navy/crystal while preserving common bases, light, and material treatment |

## 45-state review

All 15 states were inspected at 1024×768, 390×844, and 844×390:

1. Title
2. Character selection
3. Map
4. Rest
5. Smith
6. Remove card
7. Shop
8. Shop remove
9. Combat
10. Cast check
11. Practice
12. Reward
13. Act clear
14. Defeat
15. Victory

The three montage files in `screenshots/` were inspected with the individual
native-size combat and transition captures. The final machine ledger is
`screenshots/visual-audit.json`.

## Intentional behavior

- The map is vertically scrollable as one continuous page so routes reveal
  upward; it does not use a nested scrolling box.
- Card hands and card-picker rows use native horizontal scrolling when their
  full contents cannot fit.
- `tutorialSlime`, `slimeWeak`, and `slime` intentionally share the approved
  slime art.
- Deprecated `boss` intentionally resolves to the `boss1` asset.

## Above-the-fold copy check

No new title, combat, casting, map, shop, or reward copy was introduced. The
act-clear screen preserves its existing completion, heal, next-act, and
continue labels as DOM content. No baked-in text appears in production art.

No actionable visual mismatch remains in the approved viewport set.
