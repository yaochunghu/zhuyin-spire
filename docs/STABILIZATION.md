# Stabilization integrated with 0.4.0

The integration starts from GitHub main `f673085` and preserves its 75-card catalog, localized descriptions, command-deck layout, npm start, and simulation command. The prior local work is preserved on `codex/stabilization-snapshot` (`e58284c`).

## Product and compatibility boundary

- Character scores 0 / 300 / 1,000 / 2,000 unlock 12 / 33 / 54 / 75 cards. Act I rewards retain the nine-card teaching pool. Later-act rewards, shops and treasure follow score eligibility.
- The earlier proposed blanket 12-card release allowlist is superseded and is not part of this integration. No card IDs or existing owned copies are removed.
- Current Smith and upgraded offer behavior remain available. Existing learner histories and V1/V2 save handling are preserved; no new migration or exact combat autosave is introduced.
- Full syllable and tone casting remains required outside debug; HP zero ends a run.

## Integrated fixes

Dependency repairs and pinned npm installation support Chromium, Firefox and WebKit checks. See [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) for browser build floors and interrupted-session behavior.

Menus, Options, deck/pile inspection and card choice use native modal shells. Hidden pages, menus and modals each own their pause reason. Speech cancellation invalidates pending replay; failed or unavailable Mandarin synthesis gives an adult read-aloud cue. Stable checkpoint failures are visible and clear after the next successful write.

Card animations preserve upstream timing and its fallback, adding cancellation cleanup and reduced-motion handling without remounting combat mid-animation.

B041 now selects a physical Attack before casting and converts it before drawing. Cancel costs nothing; invalid targets fail before spending energy; a failed cast neither converts nor draws. With no Attack available it still draws. The optional hand-choice argument is transient combat state, not a saved schema change. B144 Weak/block and B051 tempo block were already corrected upstream; regression tests cover both faces without changing those designs.

The catalog generator requires --draft because its prose parser cannot preserve all authored combat semantics. Output is for comparison, not direct replacement of the runtime catalog.

## Delivery and remaining validation

The integration PR is intentionally not merged; main pushes trigger Pages deployment. Historical audit and stabilization reports are retained with explicit earlier-checkout labels. See the integration HTML report for current validation results.

Physical iPhone/iPad/Android speech, screen-reader focus and family Act I playtesting remain human release gates. After they pass, the next feature remains the small relic pool in [NEXT_PHASE.md](NEXT_PHASE.md); potions/events and later expansions are deferred.
