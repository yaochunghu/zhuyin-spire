# Child-error model

Debug-only stand-in for a child playing Act I. P46-11 re-measures balance with
these same numbers, so a rate changes only when this file changes with it.

The only implementation is `src/debug/childModel.ts`. The dev page
(`src/debug/childModelBridge.ts`) and the headless runner
(`scripts/simulate-act.ts`) both import that module. Neither copies the rates.

There was no `mathChildModel.ts`. One model covers 共鳴武者 (`zhuyin`) and
珠算武者 (`math`).

## How to run it

```bash
node scripts/simulate-resonance-pool.mjs --sample
node scripts/simulate-resonance-pool.mjs --mode offer --runs 40000 --seed 1
node scripts/simulate-resonance-pool.mjs --mode turns --character both --runs 1 --seed 17665
node scripts/simulate-resonance-pool.mjs --castSkip --character echoMage --zhuyinP 0.7,0.8,0.9 --runs 1
```

`--sample` is the P45-04 check: 40,000 direction drafts (A2), then one Act I
per character for `firstGrader`, `struggling`, and `strong` (A4), the 共鳴
`zhuyinP` sweep at 0.7 and 0.9 (0.8 is the `firstGrader` default), and one
cast-skip Act I per character (A3). Full A3/A4 volumes in the design note are
2,000 and 1,000 runs. Pass `--runs` for those. This check is one run each.

A flag on `scripts/simulate-resonance-pool.mjs` starts that runner under Vitest,
because the game reads `import.meta.env.DEV` and Node's type stripper does not
set it. With no `--` flag the script is still the Final-75 markdown proxy for
共鳴武者. `npm run simulate:resonance` is that proxy.

Headless runs call `markTutorialComplete()` before the first room. The measured
fight is the map fight. The scripted tutorial slime is not in the sample.
They also replace `Math.random` and `crypto.getRandomValues` with the run
seed. Child choices use a second stream, `childDecisionSeed(runSeed)`
(`runSeed ^ 0xc411d500`), so both characters see the same map from the same
`--seed`. The browser `seed` query seeds only that child stream. The live map
stays on `crypto` until a later task seeds the run.

## Who may turn it on

`?childModel=<persona>` is ignored unless the query also has `debug`, `debug=1`,
or `debug=true`. `?debug=0` and `?debug=false` stay off. `localStorage`
`zhuyin-debug=1` can open the debug panel in a debug build, and it does **not**
install the model.

The bridge is imported only inside the existing `import.meta.env.DEV ||
VITE_ENABLE_DEBUG_TOOLS` fold in `src/main.ts`. A normal production bundle does
not contain `childModel`, `ChildModel`, `__zsDebug`, or `firstGrader`.
`npm run verify:dist` checks the built files.

On a debug page the model does not play by itself. `window.__zsDebug.answerCast()`
answers the open cast, or returns `idle` when nothing is open. Normal play,
with no `childModel` query, is unchanged.

## What a run records

`runActI` and the browser bridge call `markSyntheticPlaytest()` before any
event. Headless Node has no `?debug` query and no `navigator.webdriver`, so
the mark is what sets `synthetic: true`. Clearing the mark returns later
events to the human rule. A headless Act I run also emits the schema v3 run
fields (boss entry, shop gold, rests, potions, exhaust floor, fight turns,
and sitting start/end). They are synthetic because this mark is already set.
See [TELEMETRY.md](../TELEMETRY.md).

A cast's `responseBucket` is the persona's delay. The model moves
`prompt.createdAt` back by that many milliseconds, and the existing recorder
buckets `now - createdAt`. Buckets are `<5s`, `5-15s`, `15-30s`, and `>30s`.
Sampled delays stay inside 0.8s–90s, under the recorder's 300s clamp.

`errorTag` on a live cast stays null until a provider implements `diagnose`.
The model still builds a wrong attempt (wrong tone, wrong symbol, off-by-one,
and the other tags below). It does not write that tag into telemetry, and it
does not change the providers.

Skip-cast combat (`--castSkip` / `setDebugSkipCast`) resolves the card without
opening a cast, so those plays emit no `cast` event. An event shrine still
calls `answerEventShrine` and does emit `cast`. The cast-skip sample answers
the shrine correctly.

A fight that reaches turn 37 sets HP to 0 and ends the turn, so a stall is a
real loss. The third identical screen submits a correct cast or leaves the
room. That escape is not a second model.

## Personas

Roadmap names: `firstGrader` is steady, `strong` is fast, `struggling` stays
struggling. P46-D01 adds `confusable` and `mistap` later. These three are the
P45-04 set.

`firstTryP` is P(correct on the first math try) by tier, before the family
delta. Tier 5 is the grade-2 tail. It is not a live Act I prompt yet, and it
is here so a later binding has a rate. `retryP` is P(correct | the one
scaffolded math retry). 注音 has no retry. The family delta is not applied
on a retry.

`zhuyinP` is P(correct on a 注音 prompt) before the symbol delta. The sweep
0.7, 0.8, 0.9 is the comparison set from the design note until a measured
注音 rate replaces it. `firstGrader` is 0.8, `struggling` is 0.7, `strong`
is 0.9, so a persona run is also one point on that sweep.

| | firstGrader (steady) | struggling | strong (fast) |
|--|--|--|--|
| firstTryP T1–T5 | 0.92, 0.85, 0.72, 0.60, 0.45 | 0.60 flat | 0.97, 0.97, 0.97, 0.85, 0.75 |
| retryP | 0.55 | 0.40 | 0.80 |
| zhuyinP | 0.80 | 0.70 | 0.90 |
| padTypoP | 0.03 | 0.08 | 0.01 |
| hintP | 0.06 | 0.20 | 0.02 |
| skipCastP | 0.12 | 0.22 | 0.05 |
| zhuyinWrongToneP | 0.55 | 0.70 | 0.35 |
| `<5s` | 0.18 | 0.08 | 0.62 |
| `5-15s` | 0.52 | 0.28 | 0.30 |
| `15-30s` | 0.24 | 0.40 | 0.07 |
| `>30s` | 0.06 | 0.24 | 0.01 |

Why these, not a flat 80%:

- Steady tier rates are the grade-1 curve in the character design note: most
  make-10 and count prompts land, word problems and larger numbers miss more,
  and tier 5 is a guess more often than not. The flat 0.60 struggling row is
  the same child on a bad day, not a harder tier. Strong is a fast child who
  still drops on tier 4 and tier 5.
- `retryP` is lower than the tier-1 first try. The scaffold helps, and it is
  not a second independent draw at the same skill.
- `padTypoP` flips a correct pad or build entry into a typo (a swapped pair
  of digits, or one extra digit). Choice prompts ignore it. Act I math is
  mostly choices, so this stays rare until a pad prompt is bound.
- `hintP` is the chance a miss becomes a hinted correct, only when 💡 is
  still available and this is not already a retry. The hint reveals the
  answer, so realized accuracy is higher than `firstTryP`. A balance read
  should report both. Struggling asks for help often. Strong almost never does.
- `skipCastP` ends the turn after at least one play this turn, including a
  fizzle, while another card is still playable. That is the uncast pile.
  Struggling bails out of a long hand. Strong usually finishes it.
- `zhuyinWrongToneP` is how a 注音 miss fails: a wrong tone mark when the
  prompt has one, otherwise a distractor symbol. Tone marks are the usual
  mix-up, so the share is above half except for the strong child.
- Response weights match the names. Steady sits in 5–15s. Struggling spends
  time in 15–30s and sometimes past 30s. Strong is mostly under 5s. The
  millisecond is uniform inside the bucket (`<5s` starts at 0.8s so a tap
  is not a zero).

### Math error mix

Weights over the tags a prompt can actually produce. A carry tag needs an
answer of at least 10. A reversed-digits tag needs two different digits.
An operand echo needs a number in the question that is not the answer.
Anything else falls through to off-by-one.

| tag | firstGrader | struggling | strong |
|--|--|--|--|
| carryMissed | 0.25 | 0.15 | 0.10 |
| offByOne | 0.25 | 0.30 | 0.40 |
| operandEcho | 0.15 | 0.20 | 0.15 |
| reversedDigits | 0.10 | 0.10 | 0.10 |
| borrowMissed | 0.15 | 0.15 | 0.10 |
| other | 0.10 | 0.10 | 0.15 |

Steady splits carry, off-by-one, and borrow the way a first grader does on
paper. Struggling echoes an operand more and misses by one more. Strong's
remaining mistakes are mostly off-by-one, which is what a fast child still
does. The attempt is snapped to a wrong choice when the prompt has choices,
so the click is a real distractor.

### Family and symbol deltas

Added to the miss rate (subtracted from p), first try only, then clamped to
[0.05, 0.98]. A missing key is 0. Grade-1 cells a child meets in Act I sit
near 0. Larger numbers and word problems miss more.

| math family | delta | why |
|--|--|--|
| count | −0.04 | counting is the easiest live cell |
| make10 | −0.03 | Act I teaching cell |
| compare | −0.03 | same early band |
| sort | −0.02 | still concrete |
| add10 | −0.02 | sums inside 10 |
| sub10 | +0.03 | subtraction is the first real miss |
| add20 | 0 | the tier rate is enough |
| sub20 | +0.04 | borrow starts here |
| placeValue | +0.02 | tens and ones |
| ordinal | +0.02 | language plus number |
| shapes | +0.01 | mostly recognition |
| length | +0.03 | a unit gets in the way |
| clock | +0.04 | clock faces miss more than facts |
| calendar | +0.05 | less drilled |
| word | +0.06 | the question hides the operation |
| money | +0.06 | units plus the operation |
| add100 | +0.07 | three-digit carry |
| g2Column, g2Times, g2Cm, g2ClockMin, g2Money1000, g2Missing | +0.08 | grade 2, not live; one harder step than add100 |

| 注音 symbol | delta | why |
|--|--|--|
| ㄅ ㄇ ㄚ | −0.02 | starter glyphs |
| ㄛ ㄜ | −0.01 | starter vowels, slightly less drilled |
| ㄆ ㄈ ㄉ ㄊ | +0.04 | aspiration pairs |
| ㄋ ㄌ | +0.03 | nasal / lateral pair |
| ㄓ ㄔ ㄕ ㄖ ㄗ ㄘ ㄙ | +0.04 | retroflex and sibilant mix-ups |
| ㄣ ㄥ | +0.04 | front / back nasal |

A 0.8 sweep stays near 0.8. The symbol delta is a few points, not a new persona.

## Shared run policy

Personas differ in accuracy, speed, hints, and uncast cards. They share this
policy so a balance read is not three different players. Answers do not read
HP, gold, or enemy intents. Path, shop, and rest may.

| parameter | value | why |
|--|--|--|
| takeBestRewardP | 0.74 | floor is 0.70; 0.74 leaves a visible tail |
| secondBestGivenNotBestP | 0.62 | of the other rolls, most still take a card |
| restBelowHpFraction | 0.60 | rest under 60% HP, otherwise Smith |
| eliteMinHpFraction | 0.40 | fight an elite now at or above 40% HP |
| healPotionBelowHpFraction | 0.55 | a hurt child buys a potion before a card |
| secondPurchaseP | 0.22 | one required buy, then sometimes a second |
| shopCardFloorPrice | 22 | cheapest live shop card; a potion is 18 |

The 30% that skip the best card are allowed to skip the reward. That is the
tail. Skipping every reward would starve the deck, so most of that tail still
takes the second card.

Path weights, before a ±1.5 jitter:

| weight | value | when |
|--|--|--|
| eliteNow | 80 | an elite is legal, none fought yet, and HP ≥ 40% or this is the last elite on the routes |
| eliteLater | 36 | a non-elite step still leads to an elite |
| eliteDelayed | 12 | the elite is legal but HP is under 40% and another route still reaches one |
| restWhenHurt | 28 | this node is a rest and HP is under 60% |
| restWhenFine | 4 | a rest while healthy |
| shopWhenAffordable | 22 | gold ≥ 18 and no shop visited yet |
| shopWhenPoor | 2 | a shop that cannot buy, or a second shop |
| treasure | 14 | a chest |
| fight | 8 | a normal fight |
| unknown | 5 | a ? room |
| boss | 3 | the boss, so it is taken when it is the way forward rather than instead of an elite |
| jitter | 3 | `±1.5`, so a near tie can flip and a 80-vs-8 choice cannot |

A rest that still leads to an elite outranks a hurt elite (28 + 36 against 12).
That is the "fight at least one elite when a route offers one" rule without
walking into it at 20% HP. The last chance to reach an elite uses `eliteNow`
even when hurt.

Shop: if gold covers the cheapest shelf item, buy at least one. Under 55% HP
the cheapest potion comes first. Otherwise the best affordable card by
`printedCardScore` (printed value per energy: attack hits, block × 0.85,
skill value × 0.55, power 6 + value × 0.45, draw × 2.2, divided by cost with
a 0.6 floor). Remove is the purchase only when nothing else fits. Then leave.
A second buy happens 22% of the time when gold remains.

Events are plausible, not solved. Under half HP, take a heal that costs no
HP. Under 40% HP, leave if that is legal. Otherwise take a safe gold choice
70% of the time, then a heal, then any other safe choice. A healthy child
(at least 70% HP) may take one hit of 8 or less. Bigger losses and unknown
costs are left.

Combat, after the accuracy roll: if the incoming hit is bigger than block,
play the biggest block. Otherwise play a power, otherwise the biggest attack,
otherwise the best block or draw. `skipCastP` can end the turn after one play.
Potions: drink a heal under 35% HP, or a block potion when the incoming hit
beats block by more than 4. Other potions stay in the belt.

Smith picks the card whose printed score gains the most from `+`. No legal
upgrade means rest.

## A2, A3, A4

A2 (`--mode offer`) is a direction draft, not the 70% reward policy. Fifteen
drafts, four foci per character. 共鳴武者: 聽隙爆發 `tingxi`, 百鍊連環
`bailian`, 聽勁反擊 `tingjin`, hybrid `hybrid`. 珠算武者: 湊十 `couShi`,
存串 `cunChuan`, 順招 `xuZhao`, hybrid `general`. Drafts 11 and 14 are rare.
Other drafts are 8% rare, 35% uncommon, the rest common. The pick is the
highest `printedCardScore(card, focus)` plus ±0.175 noise. The report is pick
rate and cohort score spread. A card outside 3–80% is listed. It does not
fail the run. The pool is every non-basic, non-curse card of that character,
not only the Act I teaching wave.

A3 is `--castSkip`: `skipCastP` is forced to 0 and combat casts resolve as
success. A4 is the persona runs above, cast on.

The same map seed is `seed + runIndex` for a multi-run job, and the bare
`--seed` for `--sample`, so the six persona runs share a map.
