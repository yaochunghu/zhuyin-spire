# Slay the Spire 1 design reference

This is a systems reference for designing **注音之塔**, not a specification to
clone *Slay the Spire* (StS) exactly. It records how StS1 joins combat,
deck-building, map risk, rewards, progression, and information design into one
coherent loop. Project decisions and live values remain in
[DECK_DESIGN.md](./DECK_DESIGN.md) and [BALANCE.md](./BALANCE.md). The workflow
for applying these lessons, including evidence confidence and interaction debt,
lives in [DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md).

## How to use this reference

When a new design question is unspecified, use the StS behavior as the starting
point. Then deviate when one of these product needs is stronger:

1. A preschooler must understand the choice without reading a paragraph.
2. Full 注音 casting adds time, cognitive load, and a chance for the card to fail.
3. Adult co-play, touch targets, speech, or reduced motion need a different UI.
4. The current content pool is too small to support StS-sized odds or rarity bands.

Every intentional difference should be documented. Copy the **decision
structure** before copying numbers.

Source labels in this document mean:

- **Verified:** official Mega Crit/GDC material or stable behavior documented by
  the maintained wiki and corroborating sources.
- **Implementation detail:** reverse-engineered or community-documented behavior;
  useful as a reference, but not a product requirement.
- **Design lesson:** an inference for 注音之塔, not a claim about developer intent.

## The complete loop at a glance

```text
Choose character
  → receive starter deck + starter relic
  → choose a visible route through an act
  → spend HP/cards/potions to survive a room
  → choose rewards or skip them
  → improve, specialize, heal, shop, or take greater risk
  → prepare for a visible boss
  → repeat for three acts
  → score the run and unlock more possibilities
```

The deck, HP, gold, relics, and potions belong to one run. Long-term progression
mostly adds cards, relics, characters, modes, and cosmetics to future runs; it
does not permanently raise the character's combat stats.

## 1. Combat foundation

### Turn and pile rules

- A normal player turn refills to **3 Energy** and draws **5 cards**.
- The hand limit is **10**. Excess draws do not enter the hand.
- Attacks and Skills normally go to the discard pile after use.
- Unplayed cards are discarded at turn end unless Retained or preserved by a
  special effect.
- When the draw pile is empty, the discard pile is shuffled into a new draw
  pile. This makes deck size and draw quality part of combat strength.
- Enemies act after the player; multiple enemies normally act left to right.
- Block absorbs damage and normally expires before its owner's next actions
  unless another effect preserves it.
- Combat ends immediately when all enemies die or the player's HP reaches zero.

Sources: [Mechanics](https://slaythespire.wiki.gg/wiki/Mechanics),
[Block](https://slaythespire.wiki.gg/wiki/Block).

### Why enemy intent matters

Each enemy shows its next action: exact attack damage and hit count, Block,
buff, debuff, escape, sleep, stun, or an unknown action. This changes combat
from guessing into resource planning:

- Can the player end the fight before the attack lands?
- Is spending Energy on Block better than improving the deck state?
- Which enemy must be targeted first?
- Is this a safe turn to play a slow Power?

The intent is a promise. Animation, damage numbers, status changes, and the
next intent must all agree with it. [Intent reference](https://slaythespire.wiki.gg/wiki/Intent)

### Damage, Block, buffs, and debuffs

StS uses several stacking models rather than treating every status alike:

| Model | Examples | Behavior |
|---|---|---|
| Intensity | Strength, Dexterity, Focus | Additive magnitude |
| Duration | Weak, Vulnerable, Frail | Remaining turns |
| Charges | Artifact | Consumed when triggered |
| Binary/rule change | Barricade-like effects | Present or absent |

Important baselines:

- Strength adds damage to each Attack hit, so multi-hit attacks scale strongly.
- Dexterity modifies applicable Block gained from cards.
- Weak reduces Attack damage by 25%, rounded down.
- Vulnerable increases Attack damage received by 50%.
- Frail reduces Block gained from cards by 25%.
- Poison bypasses Block, deals HP loss at the start of the target's turn, then
  loses one stack.
- Artifact spends one charge to negate a debuff application.

Sources: [Strength](https://slaythespire.wiki.gg/wiki/Strength),
[Dexterity](https://slaythespire.wiki.gg/wiki/Dexterity),
[Debuffs](https://slaythespire.wiki.gg/wiki/Debuffs),
[Poison](https://slaythespire.wiki.gg/wiki/Poison),
[Artifact](https://slaythespire.wiki.gg/wiki/Artifact).

### Design lesson for 注音之塔

Keep the base loop small and deterministic before adding more keywords. A new
status needs an icon, a numeric or yes/no state, timing rules, a tooltip, combat
log wording, animation feedback, and tests. If a child cannot tell when it
triggered, the mechanic is not finished.

## 2. Card model and lifecycle

### Types

StS separates what a card **is** from what it targets or which deck-building job
it performs.

| Type | Definition | Normal lifecycle |
|---|---|---|
| Attack | Deals direct Attack damage, even if it also Blocks or applies a status | Discard after use |
| Skill | One-time non-direct-Attack effect: Block, draw, energy, buff, debuff, deck manipulation, or indirect damage | Discard after use |
| Power | Adds an effect for the remainder of combat | Leaves ordinary draw/discard circulation after use |
| Status | Temporary combat junk, usually created by enemies | Removed after combat |
| Curse | Persistent deck junk | Remains until removed |

A Skill may target an enemy without becoming an Attack. A direct-damage Attack
may also apply Weak, Echo, draw, or Block without becoming a Skill.

For 注音之塔, the requested core taxonomy is therefore:

- **Attack:** every direct-damage card.
- **Skill:** every one-shot card without direct Attack damage, including all
  shield cards.
- **Power:** every remainder-of-combat effect.

A correctly cast Power should activate and leave draw/discard circulation. A
failed cast did not activate the Power, so it may still pay its normal Energy
cost and enter discard like another failed card.

Source: [Cards and types](https://slaythespire.wiki.gg/wiki/Cards).

### Keywords and exceptional movement

- **Exhaust:** move the card to the Exhaust pile for the rest of combat.
- **Ethereal:** Exhaust the card if it remains in hand at turn end.
- **Retain:** keep the card in hand between turns.
- **Innate:** include the card in the opening hand; it uses an opening draw slot.
- **Unplayable:** the card occupies hand/deck space but cannot normally be used.
- **X-cost:** spend the available Energy and scale the effect from that amount.

Common Status patterns show that deck pollution can attack different resources:
Dazed consumes a draw then Exhausts, Wound consumes a draw and hand slot, Burn
also damages at turn end, Void removes Energy when drawn, and Slimed can be paid
to Exhaust. [Keyword reference](https://slaythespire.wiki.gg/wiki/Keywords)

### Rarity and upgrades

Card rarity is **Basic, Common, Uncommon, Rare,** or limited-source **Special**.
Rarity controls availability and design complexity; it is not a promise that
every Rare has a larger raw number.

- Basics establish the weak-but-serviceable floor.
- Commons solve immediate combat problems and usually work without a combo.
- Uncommons commonly provide glue, stronger utility, or archetype support.
- Rares often provide scaling, rule changes, or unusually efficient effects.
- Powers are rarely Common because cheap generation of persistent effects can
  distort a pool.

Cards normally upgrade once. An upgrade can change numbers, cost, keywords, or
function. Permanent upgrades usually come from Smithing at a rest site.
[Upgrade reference](https://slaythespire.wiki.gg/wiki/Upgrade)

### Reward rarity

The documented base roll per card slot is:

| Source | Common | Uncommon | Rare |
|---|---:|---:|---:|
| Normal fight | 60% | 37% | 3% |
| Elite fight | 50% | 40% | 10% |
| Merchant | 54% | 37% | 9% |

An implementation-level rarity offset reduces early Rare odds, rises when
Commons are rolled, and resets after a Rare. This hidden anti-streak system is
more important than copying its exact percentages. Bosses in Acts I and II
offer three Rare cards and then three Boss Relics.

Sources: [Card distribution](https://slaythespire.wiki.gg/wiki/Card),
[Bosses](https://slaythespire.wiki.gg/wiki/Bosses).

## 3. Character and deck architecture

Each character combines four layers:

1. A clear fantasy and unique combat rule.
2. A starter deck that teaches it while remaining immediately survivable.
3. A starter relic that enables or rewards the identity.
4. Overlapping card packages with multiple ways to win.

| Character | Mechanical anchors | Packages the pool supports |
|---|---|---|
| Ironclad | High HP, post-fight healing, Vulnerable starter | Strength/multi-hit, Exhaust, self-damage, Status use, Block, costly attacks |
| Silent | Low HP, larger opening hand, Weak/discard starters | Poison, Shivs, discard, Dexterity, Weak, draw/control |
| Defect | Orbs with passive and Evoke effects; Focus scaling | Lightning, Frost, Dark, Plasma, Focus, Powers, energy, recursion |
| Watcher | Calm, Wrath, Divinity, stance-triggered Energy/damage | Stance timing, Retain, Scry, Mantra, small-card loops |

Sources: [Ironclad](https://slaythespire.wiki.gg/wiki/Ironclad),
[Silent](https://slaythespire.wiki.gg/wiki/Silent),
[Defect](https://slaythespire.wiki.gg/wiki/Defect),
[Watcher](https://slaythespire.wiki.gg/wiki/Watcher).

These are overlapping packages, not rigid prebuilt archetypes. A robust reward
pool contains:

- front-loaded damage for early threats;
- dependable defense;
- draw and Energy consistency;
- answers to multiple enemies and statuses;
- scaling for long fights;
- glue cards that help more than one package;
- conditional payoffs that remain usable before the ideal combo appears.

Starter decks are intentionally inefficient so that almost every run has room
to improve through rewards, removal, and upgrades. The supplied design notes'
suggestion of a 10–12 card starter and roughly 73–75 cards for a mature character
matches the broad StS shape. In that count, an upgraded face is a state of its
base card, **not another card design**: a 75-card character still has 75 cards
after all 75 authored upgrades exist. 注音之塔 will reach that scale through
reviewed content waves, with the complete base and upgrade roster approved
before Smithing becomes player-facing.

## 4. Enemy and encounter design

Enemy behavior may use deterministic cycles, weighted choices, anti-repeat
rules, HP/state phase changes, and Ascension-specific moves. The player sees the
resolved next intent, not the hidden selection logic.

Difficulty is paced by **combat count**, not only floor number:

- The first three Act I normal encounters use an easy pool.
- The first two normal encounters in Acts II and III use each act's easy pool.
- Later encounters use harder pools.
- A normal encounter cannot repeat among the next two normal encounters.
- The same elite does not appear twice consecutively.

Sources: [Monsters](https://slaythespire.wiki.gg/wiki/Monsters),
[Elites](https://slaythespire.wiki.gg/wiki/Elites).

Act I elites demonstrate capability tests rather than simple stat inflation:

- Gremlin Nob punishes repeated Skill use and asks for fast damage.
- Lagavulin allows setup, then becomes a damage and permanent-debuff clock.
- Three Sentries test target priority, multi-target damage, and resistance to
  deck pollution.

The lesson is to ask “what deck capability does this fight test?” Each encounter
should primarily test one or two of frontload, defense, multi-target output,
target priority, consistency, status tolerance, or scaling.

For preschool onboarding, protect the opening by completed normal-fight count.
Do not place multi-enemy or mechanic-heavy encounters inside the protected
quota merely because the player visited several non-combat rooms first.

## 5. Map and act structure

A standard run has three main acts and an optional fourth. Each main act uses a
17-floor rhythm: 15 pre-boss rows, a boss, and after Acts I/II a Boss Relic
choice. Maps are generated one act at a time and the boss is visible while the
player plans the route.

Important fixed beats include:

- the opening floor is a normal easy-pool fight;
- the middle of the act has a guaranteed treasure;
- the row immediately before the boss is a guaranteed rest site;
- paths branch but cannot be traversed backward.

The non-fixed room distribution is approximately:

| Room | Base share |
|---|---:|
| Normal fight | 53% |
| Elite | 8% |
| Rest | 12% |
| Merchant | 5% |
| Unknown | 22% |

Implementation details commonly documented for the generator include six paths
through a seven-column grid, no crossing edges, and restrictions against
repeating certain room types directly. The important design idea is stable
pacing landmarks surrounded by random route tradeoffs.

Sources: [Map generation](https://slaythespire.wiki.gg/wiki/Map_Generation),
[Mechanics](https://slaythespire.wiki.gg/wiki/Mechanics).

### Route choice

A useful path presents visible differences in:

- expected HP loss;
- elite/relic opportunity;
- rest/upgrade access;
- shop timing relative to available gold;
- unknown-event risk;
- whether the deck can prepare for the visible boss.

Elites are visible voluntary tests. Their payment is correspondingly strong:
more gold, better card rarity, and a guaranteed relic.

## 6. Rooms, resources, and economy

### Fight rewards and the value of skipping

| Encounter | Gold | Cards | Additional reward |
|---|---:|---|---|
| Normal | 10–20 | Choose one of three or skip | Possible potion |
| Elite | 25–35 | Choose one of three or skip; better rarity | Guaranteed relic, possible potion |
| Act I/II boss | 95–105 | Choose one of three Rares | Then choose one of three Boss Relics |

Sources: [Map locations](https://slaythespire.wiki.gg/wiki/Map_Locations),
[Gold](https://slaythespire.wiki.gg/wiki/Gold).

Skipping is essential. Adding a mediocre card has a future cost: it lowers the
chance of drawing the best cards after every reshuffle. “Take nothing” is
therefore a real deck-building choice, not a missing reward.

### Rest sites and persistent HP

HP persists between fights. A standard rest site offers one action:

- **Rest:** heal 30% of maximum HP, rounded down.
- **Smith:** upgrade one card.
- **Recall:** take the Ruby Key instead, after the optional ending is available.

Relics can add other rest-site actions. Rest versus Smith works because safety
has a visible opportunity cost. [Rest sites](https://slaythespire.wiki.gg/wiki/Rest_Sites)

### Merchants

The standard inventory contains:

- two character Attacks, two Skills, and one Power;
- two Colorless cards;
- three relics, including a shop relic;
- three potions;
- one card-removal service;
- one discounted character card.

Removal begins at 75 gold, can be purchased once per visit, and becomes 25 gold
more expensive after each purchase. The broader lesson is that shops exchange a
general resource for precise deck repair. Random rewards grow the deck; shops
let the player address a specific weakness.

Source: [The Merchant](https://slaythespire.wiki.gg/wiki/The_Merchant).

### Unknown rooms and events

Unknown nodes may become an event, normal combat, merchant, or treasure. Their
non-event outcomes use adaptive odds so a long drought becomes less likely.
Events are filtered by act, floor, HP, gold, relics, curses, and other run state.
Good events trade one resource for another instead of acting as unconditional
gifts.

Source: [Events](https://slaythespire.wiki.gg/wiki/Events).

For young players, keep the tradeoff but show consequences explicitly with
icons and exact before/after numbers.

### Seeds

A run seed makes the map, bosses, and random sequence reproducible when choices
are repeated. Different choices consume randomness differently, so a shared
seed does not promise identical outcomes after paths diverge. Manually seeded
runs disable achievements and leaderboard submission, and generation may differ
by platform. [Map seeds](https://slaythespire.wiki.gg/wiki/Map_Generation)

Seeds are valuable development infrastructure. A balance report should capture
the seed, route, offers, picks/skips, HP changes, and encounter outcome.

## 7. Relics and potions

### Relics

Relics are passive run-long rule modifiers. Pools include Starter, Common,
Uncommon, Rare, Boss, Shop, Event, and Special. Most relics cannot be obtained
twice in one run.

Ordinary relic sources use approximately 50% Common, 33% Uncommon, and 17%
Rare. Boss Relics are separate high-impact choices; many trade a major benefit
for a structural downside. Treasure rooms vary chest size to alter relic rarity
and gold.

Source: [Relics](https://slaythespire.wiki.gg/wiki/Relics).

A strong relic changes card evaluation or creates a visible trigger. For a
preschooler, a clear animation on “first attack +2” teaches more effectively
than an invisible percentage modifier.

### Potions

Potions are single-use resources that persist between rooms, cost no Energy,
and do not count as playing cards. The player normally has three slots.

The documented drop chance starts at 40% each act, rises by 10 percentage
points after a miss, and falls by 10 after a drop. Potion rarity is normally
65% Common, 25% Uncommon, and 10% Rare. This is another anti-streak system.

Source: [Potions](https://slaythespire.wiki.gg/wiki/Potions).

Potions add another decision surface. 注音之塔 will introduce them only after
cards, Energy, targeting, intents, and relic feedback are comfortable, as a
later checkpoint in the approved full-system expansion.

## 8. Meta-progression and game modes

### Unlock philosophy

StS unlocks **breadth, not permanent power**:

- Ironclad is initially available; other characters unlock through runs or a
  base-character victory.
- Each character has three card batches and two relic batches.
- Cumulative character-score thresholds are 300, 750, 1000, 1500, and 2000;
  card batches occur at 300, 1000, and 2000.
- Unlocked content enters future pools. The character does not receive a
  permanent HP, damage, or Energy advantage.
- End-of-run score accounts for progress and accomplishments, so failed runs
  can still advance early unlocks.

Sources: [Score](https://slaythespire.wiki.gg/wiki/Score),
[unlock summary](https://slaythespire.info/en/how-to-unlock-characters-cards-and-relics-spoiler-warning/).

This resolves the earlier “first discovery versus excluded cards” conflict:
use character-specific cumulative score and fixed unlock tiers, then add the
new batch to future reward/shop pools. Do not require a locked card to appear
before it can unlock.

For 注音之塔, do not lock phonetic material a learner needs. Appropriate
unlocks are new characters, optional card packages, phrase themes, cosmetic
art, and later relic packages.

### Optional ending

After victories with the first three characters, three keys can be collected in
one run by sacrificing a rest-site action, a chest relic, and an easier elite.
Collecting all three opens Act IV. This embeds the harder ending in ordinary
route decisions instead of creating a separate mode.

### Ascension, Daily, and Custom

- **Ascension:** 20 cumulative difficulty levels, unlocked per character after
  victories. Modifiers change enemies, economy, events, starting state, and
  eventually boss structure rather than applying one universal multiplier.
- **Daily Climb:** a fixed character, seed, and modifiers with score comparison.
- **Custom Mode:** selectable character, seed, Ascension, and compatible run
  modifiers; it disables ordinary achievement/leaderboard progression.

Sources: [Ascension](https://slaythespire.wiki.gg/wiki/Ascension),
[Custom Mode](https://slaythespire.wiki.gg/wiki/Custom_Mode).

These modes come after normal learning, no-penalty practice, and the designer
sandbox. The approved expansion ultimately includes a per-character 20-level
difficulty ladder; Daily and Custom remain reference material until separately
approved.

## 9. Card library, deck, and pile inspection

StS's main-menu Compendium contains cards, relics, and potions. The Card Library
supports sorting and an upgraded-card view. During a run, the player inspects
the current deck and combat piles rather than browsing the entire Compendium.

Important information rules:

- Every owned card copy appears as a physical card; duplicates are not collapsed
  into a single `×5` item.
- Draw, discard, and Exhaust piles are inspectable during combat.
- The contents of the draw pile are visible, but their future order remains
  hidden unless a special effect explicitly reveals it.
- A played Power leaves the ordinary piles and is represented by its active
  persistent effect.
- Cards redundantly encode character/color, rarity, type/frame, cost, name,
  art, rules, upgrade state, and keyword explanations.

Sources: [Mechanics](https://slaythespire.wiki.gg/wiki/Mechanics),
[Frozen Eye](https://slaythespire.wiki.gg/wiki/Frozen_Eye),
[official patch archive](https://store.steampowered.com/news/posts/?appgroupname=Slay+the+Spire&appids=646570&enddate=1664931794&feed=steam_community_announcements).

注音之塔 should use one reusable viewer with three modes:

| Mode | Contents | Information rule |
|---|---|---|
| Card Library | Cards available to unlocked characters | Filters/search; designer detail; locked state if intentionally shown |
| Current Deck | Every owned card instance | Never aggregate duplicates |
| Combat Pile | Every draw/discard/future Exhaust instance | Do not reveal draw order without an explicit effect |

The balance layer should show card ID, owner, pool, unlock tier, type, rarity,
cost, target, normalized effects, keywords, jobs/synergies, all teaching cues,
phrase difficulty, and derived damage/Block per Energy. Keep this visually
separate from the child-facing card face.

## 10. Pause, save, onboarding, and accessibility

### Pause and save

StS exposes settings and run-exit actions through an in-run menu. One active run
can be continued from the title screen. It primarily saves at room boundaries;
reloading during combat commonly restarts the deterministic encounter rather
than restoring the exact mid-turn state.

Sources: [Mega Crit support FAQ](https://www.megacrit.com/faq/),
[developer save discussion](https://steamcommunity.com/app/646570/discussions/0/1485487749772490313/).

Community testing reports that the settings overlay does not stop the run timer.
Treat that as a technical behavior, not a model to copy. 注音之塔's pause
menu should block gameplay input and suspend gameplay timers/animation safely.
Abandon Run should be separate, confirmed, clear the run save, and award no
progress intended for a completed run.

### Information hierarchy

StS combat consistently prioritizes:

1. Enemy HP, statuses, and exact next intent.
2. Player HP, Block, statuses, relics, and potions.
3. Hand, Energy, and End Turn.
4. Details on demand through card, relic, and status tooltips.

Feedback is redundant: numeric floats, bar changes, sound, animation, shake,
glow, and state badges describe the same outcome. Removing motion should not
remove the numeric or semantic feedback.

### Touch and accessibility

Official updates added larger text, extra CJK card width, touch-specific text,
spaced menu targets, raised target cards, touch-drag offsets, long press, and
two-step confirmation for consequential card/relic/shop choices. Settings also
include faster animation and controls for effects such as screenshake.

Sources: [official patch archive](https://store.steampowered.com/news/posts/?appgroupname=Slay+the+Spire&appids=646570&enddate=1664931794&feed=steam_community_announcements),
[touchscreen announcement](https://store.steampowered.com/news/posts/?appids=646570&enddate=1562082663).

StS's one-shot text tutorial and limited accessibility are not suitable defaults
for this project. 注音之塔 should instead:

- teach one concept through one required action;
- allow tutorial replay and reset;
- use icon + shape + label + sound rather than color alone;
- keep irreversible touch actions two-step;
- preserve volume access during speech/casting;
- keep primary touch controls at least 64px;
- support high contrast, large text, and reduced motion;
- never speed up speech or the successful spelling reveal with combat fast mode.

## 11. Balance philosophy and useful benchmarks

Mega Crit's published balance goal was that every card should have a place while
avoiding options that warp the whole game. The process combined frequent builds,
expert playtesters, Early Access feedback, stream observation, and metrics.
Crucially, data was treated as evidence requiring interpretation, not as an
automatic verdict.

The most useful reported card metrics were:

- pick rate when offered;
- which alternatives it was chosen over;
- presence in winning decks;
- damage taken against encounters when the card was present;
- results separated by player skill/Ascension.

Sources: [GDC 2019 slides](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf),
[developer interview](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder).

### StS numeric reference points

| Role | Baseline | Stronger reference band |
|---|---|---|
| 1-Energy Attack | Strike: 6 damage | Often 8–10 plus modest utility; more needs cost, condition, or drawback |
| 1-Energy defense | Defend: 5 Block | Often 7–9, or lower Block plus draw/utility |
| 0-Energy output | No universal basic | Roughly 3–6 damage or about 4 Block with an opportunity cost |
| 1-Energy area damage | No universal basic | About 8 per enemy for a plain Common reference |
| Output plus draw | — | Roughly 8–9 damage + draw 1; 5–8 Block + draw 1–2 |
| Entry scaling Power | — | Often 1 Energy for about 2 Strength/Dexterity or 1 Focus |
| Upgrade | Strike 6→9; Defend 5→8 | Commonly +25–50%, cost reduction, or a rules change |

Examples are visible in the [complete card list](https://slaythespire.wiki.gg/wiki/Cards_List).
These are comparison points, not a universal formula. Target count, multi-hit
scaling, delay, draw limits, Exhaust, pollution, reliability, and expected fight
length can dominate the raw Energy ratio.

### Scaling the benchmark for 注音之塔

The current starter rates are 3 damage and 4 Block for 1 Energy, against much
smaller HP and damage totals than StS. Do not raise them to 6/5 merely to match
the reference game.

Full 注音 casting introduces a second cost:

- time before the effect resolves;
- the possibility of paying Energy and losing the effect;
- working-memory and speech-recognition load;
- fewer cards comfortably played per real-world minute.

Balance should therefore use 注音之塔's own starter ratios and encounter
length. As a first-pass comparison, a Common reward can often produce roughly
1.3–1.7 times the appropriate starter output after accounting for utility, but
playtest evidence must decide the final number. Short preschool fights also mean
a Power needs immediate feedback and should usually repay its setup within about
two turns.

### Metrics to add before a large card pool

Track, by card, encounter, act, and learner experience:

- offers, picks, and skips;
- card plays, turns held, and Energy left unused;
- correct/incorrect cast rate and answer time;
- damage dealt and Block actually consumed, not only generated;
- Power triggers and turns needed to repay setup;
- HP lost and turns per encounter;
- run outcome conditional on seeing and choosing a card;
- deck size, duplicate count, and card-removal behavior.

Use metrics to ask focused questions. A high winning-deck rate may mean a card is
too strong, universally useful, unlocked late, or selected mostly by experienced
players. It is not a self-executing balance verdict.

## 12. Copy, adapt, defer

| StS system | 注音之塔 direction | Reason |
|---|---|---|
| Attack / Skill / Power semantics | **Copy** | Clear lifecycle and card identity |
| Powers leave normal circulation | **Copy** | Required for honest persistent effects |
| Exact enemy intent | **Copy and simplify** | Turns uncertainty into a teachable choice |
| Physical duplicate cards in viewers | **Copy** | Accurate deck and pile state |
| Hidden draw order | **Copy** | Prevents accidental information advantage |
| Reward Skip | **Copy with positive wording** | Avoids forced deck dilution |
| Character-specific score unlocks | **Adapt** | Unlock breadth without permanent stats |
| Rarity rolls and pity counters | **Stage, then activate** | Keep uniform rewards now; activate authored odds with the approved 75-card pool |
| Guaranteed act landmarks | **Adapt to 15 floors** | Preserve rhythm without copying run length |
| Easy/hard encounter quotas | **Copy and soften** | Protects onboarding independently of path |
| Rest versus Smith | **Implement after migration** | Requires card-instance saves and a complete approved upgrade roster |
| Potions, curses, Status cards, Exhaust | **Implement in later checkpoints** | Full-system scope, introduced only after the core lifecycle is stable |
| Twenty difficulty levels | **Implement last** | Requires complete enemies, economy, events, and upgraded rewards first |
| Daily and Custom modes | **Defer** | Not part of the approved first-character expansion |
| One-shot text tutorial | **Do not copy** | Poor fit for preschool learning |
| Settings overlay that does not truly pause | **Do not copy** | Misleading and unsafe for timed teaching UI |

## 13. Immediate implications for current card work

1. Replace the `block` card type with `skill`; Block remains an effect and a
   deck-building job.
2. Convert **共鳴護唱** to a true Power. On a correct cast it activates for the
   combat and leaves the draw/discard cycle; its persistent badge remains
   inspectable.
3. Keep direct-damage hybrids as Attacks, including cards that also apply Echo,
   draw, or Block.
4. Give every card explicit owner, type, rarity, target, normalized effects,
   jobs/tags, pool/source, unlock tier, teaching cues, and design status.
5. Keep all current deck and combat-pile duplicates as separate card instances.
6. Use a fixed card frame in combat; long rules text must fit inside its bounded
   rules region rather than changing the hand's height.
7. Treat the card library as a design tool: filters and derived efficiency are
   adult detail, while the child-facing card remains icon-first.
8. Add score-based unlock batches only after the base/locked pool split is
   authored; never let an unlock filter leave a reward source with fewer choices
   than its UI promises.

## Sources and confidence

Primary design/process sources:

- [Mega Crit / GDC: Metrics Driven Design and Balance](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf)
- [GDC session overview](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics)
- [Mega Crit developer interview on metrics](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)
- [Mega Crit FAQ](https://www.megacrit.com/faq/)
- [Official StS1 patch archive](https://store.steampowered.com/news/posts/?appgroupname=Slay+the+Spire&appids=646570&enddate=1664931794&feed=steam_community_announcements)

Rules and implementation reference:

- [Slay the Spire Wiki (wiki.gg)](https://slaythespire.wiki.gg/)
- Individual mechanics pages linked beside the relevant claims above.
- Exact hidden odds and generator restrictions are implementation details and
  should be re-verified before reproducing them literally.

Project-owner research inputs:

- “Designing a new character and their deck…” supplied with this task.
- “Card costing benchmarks…” supplied with this task.
- “Procedural Architecture and Systems Design in Roguelike Deckbuilders”
  supplied later as a systems memo.

Those notes helped route the research. Where they make precise claims, this
document prefers official material and linked mechanics references. Unsourced
sequel-specific values remain hypotheses rather than project requirements.
