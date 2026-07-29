# Full Visual Review and Production Art Pass

This approval package covers the 15 game states at the three approved primary
viewports:

- 1024×768 tablet
- 390×844 phone portrait
- 844×390 phone landscape

## Art direction

- Enemy concept boards:
  - `../production-art/contact-sheets/act-1-garden-enemies.png`
  - `../production-art/contact-sheets/act-2-library-enemies.png`
  - `../production-art/contact-sheets/act-3-observatory-enemies.png`
- Runtime miniature proof:
  - `../production-art/runtime-enemy-assets.png`
- Transition concepts:
  - `../production-art/garden-to-library-concept.png`
  - `../production-art/library-to-observatory-concept.png`

## Final visual evidence

- `screenshots/tablet-1024x768-all-states.jpg`
- `screenshots/phone-portrait-390x844-all-states.jpg`
- `screenshots/phone-landscape-844x390-all-states.jpg`
- `screenshots/visual-audit.json`

Each viewport folder contains the 15 individual primary-state captures plus
both explicit act-transition captures. The capture utility is
`scripts/capture-visual-review.mjs`.

## Review records

- `visual-mismatch-ledger.md`
- `test-report.md`

The package is approval-ready. Physical-device QA, final accessibility and
performance certification, commit, push, and pull request creation remain
deferred to the next stage.
