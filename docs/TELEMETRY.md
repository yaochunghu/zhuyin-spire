# Local playtest telemetry

The balance export is a JSON file written only on this device. Options →
Privacy downloads it. Nothing in this log is sent to a server.

The storage key stays `zhuyin-spire-playtest-v1`. A browser that already has
events keeps them. The file's `schema` string is `zhuyin-spire-playtest-v3`.
Export copies the stored array as it is. An event written by an older build
is not upgraded and is not dropped. A v0.4.4 file (`zhuyin-spire-playtest-v1`)
and a schema v2 file still load in `scripts/balance-report.mjs`. A field that
file does not have prints as `n/a`.

## `cast`

One event per resolved prompt, for every gate. 共鳴武者 (注音) and 珠算武者
(math) both emit it, including practice and an event shrine. Opening
「再算一次」 does not emit. The resolving attempt does, with `retried: true`
when that prompt was the combat's scaffolded retry. Debug skip-cast does not
emit `cast`, because the gate never ran.

| Field | Meaning |
|-------|---------|
| `gateId` | Open string. Live values are `zhuyin` and `math`. `english` is reserved and needs no schema bump. |
| `family` | Open string. The lesson family that was asked. A `family@tier` id drops the `@tier` suffix so the tier is not stored twice. Other ids are kept whole, including `initial:ㄅ` and `vowel:ㄚ`. |
| `tier` | Asked tier. Math uses the prompt tier (after a warm-up drop, that is the tier the child saw). 注音 prompts have no tier, so the card rarity tier is used (`basic` 1 through `rare` 4). |
| `correct` | The resolving attempt was right. |
| `retried` | This prompt used 再算一次. |
| `hintLevel` | `0` if 💡 was not used on this prompt. `1` if 家長協助 showed the answer. `2` through `9` are reserved for later ladder steps. |
| `errorTag` | A short diagnosis code such as `offByOne`, or `null`. On a retry, this is the first wrong attempt's code. |
| `responseBucket` | `<5s`, `5-15s`, `15-30s`, or `>30s`. |

Cuts are half-open. 5.000s is `5-15s`, 15.000s is `15-30s`, and 30.000s is
`>30s`. A negative duration is treated as zero. A duration past 300 seconds
is clamped before the bucket is chosen. The milliseconds are not stored.

`errorTag` is kept only when it matches a short identifier
(`[A-Za-z][A-Za-z0-9]{0,31}`). Digits, spaces, and answer text are dropped.
Neither live provider implements `diagnose` yet, so a cast today stores
`null` until a provider returns a code. A code that fails the identifier
check is stored as `null`.

`gateId` and `family` are single tokens of at most 80 characters. A value
with spaces, including a question or a typed answer, is stored as an empty
string rather than the original text.

The event does not store the attempt, the chosen choice, the correct answer,
the question, the correction line, or any other free text. `contentId` is
not copied, because a math content id contains the question and the answer.

A later gate calls `recordCastMeasurement` with its own `gateId` and `family`.
That does not change the schema string.

## `combatEnd`

A fight records this when it ends, after hero HP is copied out of combat and
before a boss clear restores full HP or adds that fight's gold. P46-11 reads
the boss row from here. The full heal still happens; it no longer overwrites
the logged HP.

| Field | Meaning |
|-------|---------|
| `characterId` | Live ids are `echoMage` and `abacusFist`. A string, so another hero does not need a new schema. |
| `turns` | Player turns taken. A fight starts at turn 1. |
| `nodeKind` | `fight`, `elite`, `boss`, `unknown`, or `event`. A fight with no map node is `fight`. |
| `floor` | Map floor, 1-based (row + 1). `0` when the fight has no map node. |
| `hp` | Hero HP when the fight ended, before a boss restores full HP. |
| `gold` | Gold when the fight ended, before that fight's gold is added. |
| `deckSize` | Cards in the deck at the end of the fight. |
| `hpLost` | HP lost during the fight. Already on older events. |

A v1 `combatEnd` has no `characterId` and none of the v3 fields. A v2
`combatEnd` has `characterId` and still lacks turns, floor, HP, and gold.
Both still export.

## Run fields

| Kind | When | Fields |
|------|------|--------|
| `sittingStart` | A character is picked, or a saved run is resumed. | `characterId` |
| `sittingEnd` | The run is lost, or Act III is cleared. An Act I or Act II clear does not end the sitting. | `reason` `defeat`, `victory`, or `leave`; `characterId` |
| `actClear` | A boss reward is taken and that act's node completes, including Act III. | `act`, `characterId`, `hp`, `gold`, `deckSize` |
| `shopEnter` | A shop room opens, before anything is bought. | `act`, `floor`, `gold` |
| `bossEntry` | A boss fight starts, before damage and before the payout. | `act`, `floor`, `characterId`, `hp`, `gold`, `deckSize` |
| `rest` | A campfire choice completes: heal, smith, or remove. A shop remove stays the existing `remove` event and does not emit `rest`. | `act`, `floor`, `choice` `rest`, `smith`, or `remove` |
| `potionUsed` | A bottle is used successfully. | `act`, `potionId`, `inCombat` |
| `relicPoolExhaust` | A chest, elite, or boss would drop a relic and that character's pool is already owned. Recorded before the exhaust gold is added. | `act`, `floor`, `characterId` |

`floor` is the map row plus 1. The balance report takes the earliest exhaust
floor in each sitting.

## Balance report

`node scripts/balance-report.mjs <export.json>` prints B1–B24. Rows the
family sheet still writes by hand print `session record`. Events with
`synthetic: true` print under `cohort: synthetic (child-model)`. Every other
event prints under `cohort: real play`. The row meanings are in
[BALANCE.md](./BALANCE.md).

## Synthetic runs

`synthetic: true` is set on events recorded while any of these is true:

- `markSyntheticPlaytest()` was called. The child-error model does this for a
  headless Act I run and for a debug page that actually installed
  `?childModel`. `clearSyntheticPlaytestMark()` turns it back off. A human
  session never calls it. Headless Node has no debug query and no webdriver
  flag, so the mark is what labels those runs;
- debug tools are on (`isDebugEnabled()`: `?debug`, `?debug=1`, `?debug=true`,
  or `localStorage` `zhuyin-debug` in a debug-capable build);
- skip-cast is on;
- `navigator.webdriver` is true (Playwright and other automation).

The flag is omitted otherwise. A human session on `npm start` without those
switches is not marked synthetic. A production build ignores the debug
switch; webdriver still counts. Events already in storage are not relabeled.
The balance report puts every flagged event in the synthetic cohort, including
a child-model run.

## What this log is not

Learning history on the learner profile is separate. It still stores counts
and a clamped response total for the profile's own practice record. The
parent report and the family-session rows (the three explanations, wanting to
play again, mis-taps, and speech failures) stay on the paper sheet. This file
is only the local playtest export.
