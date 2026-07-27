# 注音之塔 design playbook

This is the governing workflow for character, card, relic, encounter, map, and
economy design. It combines the project's design bibles, the verified lessons in
[STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md), the destructive character
process recorded in
[RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md),
and the supplied “Procedural Architecture and Systems Design in Roguelike
Deckbuilders” memo.

The goal is not to copy Slay the Spire's content or numbers. Copy useful
**decision structures**, then adapt them to full 注音 casting, preschool
readability, adult co-play, persistent HP, and touch-first play.

## 1. Source and decision hierarchy

When sources disagree, use this order:

1. Product non-negotiables in `AGENTS.md`.
2. Live runtime and tests for current behavior.
3. Explicitly approved project design decisions.
4. This playbook and current character specification.
5. Verified primary-source lessons in `STS_DESIGN_REFERENCE.md`.
6. Historical project bibles and prototypes.
7. Reverse-engineered or community implementation details.
8. Unsourced claims, analogies, and hypotheses.

Every imported claim receives one label:

- **Adopt:** strong evidence and a direct fit for this product.
- **Adapt:** sound structure, but values or presentation must change.
- **Test:** plausible hypothesis requiring project data.
- **Defer:** valuable later, but premature for the current implementation.
- **Reject:** conflicts with the product or lacks enough support to govern work.

The supplied memo contributes useful systems principles, but its exact
Slay the Spire 2 class names, probabilities, engine internals, reinforcement
learning results, and telemetry correlations are not project facts unless they
are independently sourced and reverified.

| Memo lesson | Decision for 注音之塔 |
|---|---|
| Constrain procedural generation instead of using unconstrained randomness | Adopt |
| Keep exact enemy intent honest from preview through resolution | Adopt |
| Separate gameplay RNG streams from animation, speech, and UI inspection | Adopt |
| Decouple combat state/rules from rendering so headless testing is possible | Adopt |
| Use offer, pick, skip, outcome, and HP-loss telemetry contextually | Adopt |
| Require cross-pollination between card directions | Adopt |
| Treat map uncertainty as a player-managed risk economy | Adapt for preschool visibility |
| Use pity/anti-drought systems when the content pool can support them | Defer until the mature pool ships |
| Copy exact map percentages, sequel biome odds, or reported entropy multipliers | Reject as governing values |
| Let machine simulation dictate balance | Reject; simulation finds questions, humans decide |

## 2. Product lens applied to every system

Every design must pass all five lenses:

1. **Readable:** a child can identify the immediate action from icon, number,
   target, and feedback; adult detail can explain the deeper rule.
2. **Observable:** every stored resource, duration, trigger, and delayed promise
   has a visible owner, counter, badge, or preview.
3. **Touchable:** routine card play uses one target gesture. Repeated sliders,
   two-target selectors, and nested modals carry a high interaction cost.
4. **Cast-aware:** successful effects require full 注音 casting. Failed casts
   spend the card and Energy, so long chains and Powers have a real reliability
   cost absent from ordinary deckbuilders.
5. **Consequential:** HP persists and death ends the run. Rewards, paths, and
   defensive decisions must change expected survival, not merely score.

## 3. The design funnel

### Gate A — Foundation before content

Lock these before generating cards:

- fantasy and the action verbs the player should feel;
- one unique combat promise and three to four signature mechanics;
- starter deck lesson and starter relic lesson;
- three overlapping directions, expressed as mechanic pairs rather than sealed
  archetypes;
- expected fight length, Energy, draw, hand, HP, and output baselines;
- implementation and presentation budget for each new state.

A signature mechanic is incomplete until it has:

- exact timing and stacking;
- failed-cast behavior;
- multi-hit and multi-enemy behavior;
- save/load representation;
- icon, counter, preview, log text, animation, and tooltip;
- at least one low-rarity setup, payoff, defensive use, and hybrid use.

### Gate B — Destructive ideation

Generate at least twice the intended pool size. Concrete ideas include type,
cost, target, exact seed text, provisional rarity, mechanics, and intended job.
Do not protect prototypes or names.

The first cull removes a card when any answer is “no”:

1. Does it solve a combat problem without its perfect partner?
2. Does it change how at least one other reward is evaluated?
3. Is it distinct from every cheaper or lower-rarity option?
4. Can its trigger and result be shown before or immediately after play?
5. Is the interaction cost justified by repeated strategic value?
6. Can deterministic rules and tests represent it without card-specific hacks?

### Gate C — Coverage before numbers

Map every survivor by:

- direction and cross-direction bridge;
- primary role: staple, build-around, glue, scaling, front-load, engine, or
  situational tech;
- combat capability: single-target damage, area, defense, draw, Energy,
  consistency, scaling, status tolerance, and target priority;
- rarity, type, target count, keywords, and implementation hooks.

Each direction needs low-rarity access to front-load, defense, consistency, and
one bridge. It also needs area access and long-fight scaling somewhere in the
pool. No direction may require one named Rare to function.

### Gate D — Interaction-debt budget

Complexity is a spendable budget. Assign one debt point for each:

- additional card or enemy selector;
- slider or variable resource choice;
- new persistent counter;
- card-specific memory across turns;
- delayed promise that needs a badge;
- dynamic cost not obvious from the card face;
- rule exception to a signature mechanic;
- random selection whose outcome matters tactically.

Guidelines:

- Basic: 0 debt.
- Common: normally 0; at most 1 with immediate visual feedback.
- Uncommon: normally at most 2.
- Rare: may exceed 2 only when it defines a strategy and reuses existing UI.
- A mechanic-specific badge should support at least three cards; otherwise
  simplify the card rather than adding bespoke state.
- A frequently played card should avoid a repeated modal even when the modal is
  technically implementable.

### Gate E — Numbers

Start from this game's live ratios, not Slay the Spire's absolute numbers:

- 3 Energy and 5 cards per turn;
- starter Attack: 3 damage for 1 Energy;
- starter defense: 4 Block for 1 Energy;
- Common plain Attack reference: 6 damage for 1 Energy;
- Common plain defense reference: 7 Block for 1 Energy;
- 40 maximum HP and no normal post-fight heal;
- full casting adds time, failure probability, and working-memory cost.

Price value using:

```text
effective value
  = immediate output
  + expected conditional output × trigger probability
  + future output discounted by turns-to-payback
  + consistency value
  - Energy, draw, setup, resource, targeting, and failure costs
```

Do not use one universal damage-per-Energy formula. Area, multi-hit, duration,
Retain, Exhaust, draw limits, target availability, and fight length change the
rate. A Power should usually show feedback immediately and repay setup within
about two turns in the short preschool combat model.

## 4. Evidence ladder and iteration loop

Balance evidence is promoted through six levels:

1. **Static audit:** counts, duplicate text, impossible targets, missing
   low-rarity roles, trigger bounds, and interaction debt.
2. **Offer model:** noisy draft heuristics identify automatic picks, dead offers,
   rarity starvation, and package isolation.
3. **Headless turn simulation:** deterministic legal-action combat with actual
   draw, Energy, targeting, intents, durations, and pile movement.
4. **Seeded regression:** fixed maps, offers, enemies, rewards, and save/load
   checkpoints reproduce changes.
5. **Human debug-skip play:** measures combat decisions without casting load.
6. **Human cast-on telemetry:** measures the actual product, including fizzle
   rate, answer time, fatigue, and adult intervention.

Never present levels 1–3 as player telemetry. A proxy bot's pick rate mostly
describes its evaluator. Use it to find outliers and missing interactions, then
form a testable human question.

### Required card telemetry

Record by stable definition ID, physical-copy UID, act, encounter, learner
experience, and cast mode:

- offers, alternatives, picks, skips, removals, and upgrades;
- draws, plays, holds, discards, Exhausts, and Energy left unused;
- correct and failed casts, attempts, and answer time;
- damage dealt, overkill, Block generated, and Block actually consumed;
- status applications, resource gained/spent, and trigger counts;
- Power setup turn, trigger value, and payoff turn;
- HP lost, turns taken, encounter result, and run result;
- deck size, duplicate count, direction density, and hybrid composition.

Interpretation rules:

- High win association can indicate strength, player skill, late acquisition,
  rarity, or selection bias.
- Low pick rate is acceptable for situational tech when it is highly valuable
  in the intended encounters.
- Prefer improving cards with no credible context before flattening exciting
  high-synergy cards.
- Nerf a strong card when it erases route, reward, or sequencing decisions—not
  merely because its number is high.
- Separate cast-on from debug-skip results; they answer different questions.

## 5. Encounter and procedural design

Enemy intent is a contract. Preview and resolution use the same calculated
values without consuming different random results. Normal fights teach one
rule; elites test a capability; bosses combine already demonstrated rules.

Capability tests include:

- front-loaded damage;
- sustained defense;
- area damage and target priority;
- multi-hit mitigation;
- scaling speed;
- draw/status tolerance;
- ability to function when a preferred package is disrupted.

Map and encounter generation use controlled randomness:

- guaranteed onboarding and pre-boss beats;
- easy encounters by completed-fight quota, not raw floor alone;
- no immediate recipe repeats;
- visible boss and voluntary elite risk;
- separate serializable streams for topology, rooms, encounters, enemy
  behavior, rewards, and combat;
- animation, audio, speech, tooltips, and UI inspection never consume gameplay
  RNG.

Risk must be legible. Events show exact costs and gains; paths communicate elite,
rest, shop, and boss preparation tradeoffs; unknown outcomes remain bounded by
eligibility and anti-drought rules.

## 6. Pool, rarity, and reward rules

- Basic cards teach and leave room for improvement.
- Commons solve immediate problems and work without a named partner.
- Uncommons provide glue, package access, and stronger utility.
- Rares change drafting priorities, scaling, or rules; they are not merely
  bigger Commons.
- Upgrades improve the primary job and belong to a physical copy, not a new
  definition.
- Reward screens never contain duplicate definitions and always allow a
  positively worded skip.
- Unlocks add breadth to future pools, never permanent combat stats or required
  teaching material.
- Activate rarity odds and anti-drought logic only when every source has enough
  authored cards to honor its promise.

## 7. Release and approval gates

A mature 75-card design is a target catalog, not a one-patch instruction.
Release in reviewed waves:

1. Starter plus nine-card Act I prototype.
2. Low-rarity direction access and missing encounter answers.
3. Uncommon glue and engines.
4. Rare build-arounds and rule changes.
5. Upgrades, Smithing, relic hooks, potions, and events only after their data
   contracts and save migration are approved.

Before a wave ships:

- static definition and phrase coverage validation passes;
- fixed-height tablet cards and every selector are usable by touch;
- every new trigger has inspectable feedback;
- failed casts, full hands, empty piles, multi-enemy targets, and lethal
  mid-resolution outcomes are tested;
- debug-skip and cast-on seeded runs both pass;
- the wave has a rollback-safe save path.

## 8. Review template

Use this compact record for every design review:

```text
Decision:
Player-facing purpose:
System state changed:
Directions and roles affected:
Standalone floor:
Best three interactions:
Interaction debt:
Failure and edge cases:
Static/simulation evidence:
Human evidence:
Change, keep, cut, or defer:
Next falsifying test:
```

The final question is not “is this clever?” It is: **does this create a visible,
masterable decision that remains interesting across different decks, encounters,
routes, and casting outcomes?**
