# Zhuyin Spire: release test plan

Date: 2026-09-09. Baseline: integrated 0.4.0 with all 75 cards score-gated. Scope: approved stabilization changes and readiness for an Act I family playtest. Automated execution does not certify physical devices or learning outcomes.

## Automated gate (run now)

1. Unit suite: card effects and upgrades, cast validation, release pools, profile/save compatibility, pause ownership, speech failure.
2. Responsive suite: eight browser/viewport projects, touch hand scrolling versus upward play, rotation, native menus, curriculum and tutorial flows. Project-specific skips are intentional, not device passes.
3. Fresh production build in Chromium, Firefox and WebKit: full cast tutorial to saved reward; overlapping hidden/menu pauses; denied storage and unavailable speech; stalled animation recovery; debug exclusion, privacy reset and third-party request checks.
4. Distribution verification and desktop/phone title-screen inspection: meaningful content, no runtime error overlay, no horizontal overflow.

Pass criterion: all active tests pass; investigate failures before accepting a retry. Preserve logs and traces for failures.

## Physical-device gate (human execution required)

Use an iPhone and iPad with Safari, and an Android phone with Chrome. Record exact device, OS, browser, installed Mandarin voice, date and tester. Use a new test learner profile, debug casting skip OFF. Do not clear personal browser data.

| Test | Steps | Pass criterion |
|---|---|---|
| Mandarin and full casting | Complete tutorial with sound; submit an incomplete syllable, wrong tone, then correct answer. | Speech is intelligible; incomplete/wrong answers never cast; correct full answer casts. |
| Interrupted audio | During a prompt, background the app, lock/unlock, and interrupt audio with another app; return and request replay. | No duplicate/stale speech or automatic cast; deliberate replay works or adult fallback is usable. |
| Touch and rotation | Scroll a long hand sideways, deliberately drag upward to play, rotate during combat/casting. | Scrolling never casts; intended play works; state and reachable controls survive rotation. |
| Pause ownership | Open menu during casting, background and return while menu remains open, then close it. | Timer remains paused until both reasons clear; no hidden submission. |
| Checkpoint recovery | Reach reward/map checkpoint, reload; then reload during combat. | Stable progress restores; combat reload uses previous stable checkpoint as documented. |
| Accessibility | Use VoiceOver/TalkBack through menu, Options, deck and casting; test large text, zoom and reduced motion. | Labels understandable, modal focus contained, close restores usable focus, no trapped or unreachable controls. Record limitations explicitly. |
| Death | With casting enabled, allow HP to reach zero. | Run ends; player cannot continue the defeated run. |

Any cast bypass, unintended card play, lost stable save, focus trap preventing play or inability to finish tutorial blocks release. Fix and rerun the affected flow plus relevant automated tests.

## Adult-and-learner Act I session

Allow 30–45 minutes plus breaks; do not force completion if the learner is tired. Adult reads coaching text and helps with device operation without entering every answer. Continue another session if necessary until an entire Act I run or death has been observed.

Record room reached, elapsed play time, incorrect casts, adult interventions, accidental taps, confusing card/enemy effects, speech failures, HP at room exits, and whether the learner wants another run. Use no identifying child information.

Observe tutorial -> map -> battles -> rewards -> available shop/rest/Smith -> boss or death. If a route omits a room type, cover it in a separate run. Verify the adult can explain damage, block and enemy intent. Do not treat automated tutorial success as evidence that Act I balance or learning quality is approved.

Exit decision: no blocking device issues; full run/death observed; adult can support casting; learner can operate primary controls with age-appropriate help. Turn repeated confusion into small fixes before expanding the released content roster. Balance findings require more than one run before broad tuning.

## Session record template

Device / OS / browser / voice:
Build or git revision plus working-tree status:
Scenario / steps:
Expected / observed:
Pass / fail / not run:
Screenshot or reproduction evidence:
Severity / follow-up / retest result:
