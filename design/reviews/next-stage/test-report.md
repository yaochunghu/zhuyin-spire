# Test Report

## Final automated results

| Check | Result |
| --- | --- |
| TypeScript and Vite production build | Passed |
| Vitest unit suite | 12 files, 70 tests passed |
| Playwright seven-project suite | 93 discovered, 56 passed, 37 expected project skips |
| Focused production-art and transition coverage | 4 passed |
| Distribution verification | 38 production files verified |
| Production security suite | 2 passed |

## Device-QA stage rerun — 2026-07-29

| Check | Result |
| --- | --- |
| Production build | Passed |
| Vitest unit suite | 12 files, 70 tests passed |
| Playwright seven-project suite | 93 discovered, 56 passed, 37 expected project skips |
| Distribution verification | Passed; 38 production files verified |
| Production security suite | 2 passed |
| Live in-app browser combat smoke | Passed; local enemy art and alt text visible, enemy target interaction succeeded, 0 console errors |

No actionable visual mismatches were found during this rerun. Physical-device certification remains pending on connected iPad, iPhone, and Android hardware.

## Added coverage

- Every canonical enemy definition resolves to an existing registry asset.
- All slime definitions intentionally share `enemySlime`.
- Deprecated `boss` resolves to `enemyBoss1`.
- Every asset retains non-empty alt text and emoji fallback.
- Every enemy family loads its expected art in rendered combat.
- Image failure switches to the fallback state.
- Development visual states cover 1–5 enemy formations.
- Development visual states cover 5, 6, 8, and 10 card hands.
- Both act-transition assets load.
- Transition and ambient animations stop under reduced motion.
- Ambient layers are `aria-hidden` and pointer-free.
- The existing title-to-reward, tutorial, dialogs, deck viewer, rotation,
  gestures, casting pause/resume, map routes, target sizes, and responsive
  combat tests remain green.

## Visual audit result

- 45 primary captures produced.
- 6 additional explicit transition captures produced.
- Missing images: 0.
- Console/page errors: 0.
- Horizontal page overflow: 0.
- Non-scrollable horizontally clipped controls: 0.

## Deferred by stage boundary

- Physical iPad, iPhone, and Android testing.
- Final accessibility certification.
- Final performance certification on slower physical devices.
- Commit, push, and draft pull request.
