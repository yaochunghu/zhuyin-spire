# Local playtest telemetry

The balance export is a JSON file written only on this device. Options →
Privacy downloads it. Nothing in this log is sent to a server.

The storage key stays `zhuyin-spire-playtest-v1`. A browser that already has
events keeps them. The file's `schema` string is `zhuyin-spire-playtest-v2`.
Export copies the stored array as it is. An event written by an older build
is not upgraded and is not dropped.

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

New combat-end events include `characterId`. Live ids are `echoMage` and
`abacusFist`. The field is a string, so another hero does not need a new
schema. An older stored `combatEnd` has no `characterId` and still exports.

## Synthetic runs

`synthetic: true` is set on events recorded while any of these is true:

- debug tools are on (`isDebugEnabled()`: `?debug=1`, `?debug=true`, or
  `localStorage` `zhuyin-debug` in a debug-capable build);
- skip-cast is on;
- `navigator.webdriver` is true (Playwright and other automation).

The flag is omitted otherwise. A human session on `npm start` without those
switches is not marked synthetic. A production build ignores the debug
switch; webdriver still counts. Events already in storage are not relabeled.

## What this log is not

Learning history on the learner profile is separate. It still stores counts
and a clamped response total for the profile's own practice record. The
parent report, error tallies, and the rest of the balance fields are later
work. This file is only the local playtest export.
