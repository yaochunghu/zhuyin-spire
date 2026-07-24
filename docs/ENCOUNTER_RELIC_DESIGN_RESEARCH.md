# Designing the rest of 注音之塔

> **Status:** standalone research memo for review; not yet a governing design
> document
>
> **Research snapshot:** July 24, 2026
>
> **Decision supported:** whether to merge a new encounter, relic, and run-ecology
> method into [DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md)
>
> **Important:** *Slay the Spire 2* is in Early Access. Its current content is
> evidence from an evolving design, not a finished specification.

## Executive Summary

- **Merge the method, not the current rosters.** The project playbook already
  has strong card-design gates, an evidence ladder, honest intents, controlled
  randomness, and product-specific readability rules. Its treatment of enemies,
  bosses, relics, events, and economy is much thinner. The current
  [event/encounter](./EVENT_ENCOUNTER_BIBLE.md) and
  [relic/potion](./RELIC_POTION_BIBLE.md) bibles move to exact catalogs and
  numbers before their shared capability coverage, offer architecture, and
  runtime prerequisites have been approved.
- **Design the game as one run ecology.** Cards provide capabilities; normal
  encounters teach and tax them; elites audit complementary weaknesses; the
  visible boss changes drafting and routing; relics change the value of cards,
  tests, and routes; events, shops, rests, and potions let the player exchange
  resources to repair weaknesses. Designing any one of these in isolation
  produces fake choices and accidental hard counters.
- **Use a teach → combine → audit → examine ladder.** A normal monster should
  usually have one job and two or three readable moves. Easy fights introduce
  one rule. Hard formations combine two known roles. Each act's three elites
  should test different capabilities. Each boss should recombine already-taught
  rules around one dominant, child-explainable hook.
- **Relics belong beside deck and encounter design, but can ship later.** A
  valuable relic is a persistent rule that changes card evaluation, encounter
  confidence, route value, or resource conversion. Relics that change none of
  these decisions are mostly invisible power. The current single-`relicId`
  runtime cannot support the proposed 40-relic catalog; collection, timing,
  counters, eligibility, feedback, and save migration must be approved first.
- **Adopt a stricter complexity ceiling than either Spire game.** Full 注音
  casting already consumes time, working memory, and error tolerance. Encounter
  complexity must therefore be budgeted across damage pressure, scaling, deck
  interference, target count, action restrictions, and casting load. The sequel
  offers a particularly useful warning: Mega Crit removed an Act III boss even
  though its metrics were not exceptionally lethal because its interaction
  burden exceeded the team's desired complexity.

The recommended outcome is a new playbook layer built around a shared
capability matrix, pressure budgets, encounter and relic funnels, curated offer
sets, acquisition horizons, and staged cast-off/cast-on validation. The existing
content bibles should remain candidate libraries until they pass that method.

## 1. Research question, evidence, and limits

### The question

How should 注音之塔 design the systems outside the deck—normal enemies,
encounter formations, elites, bosses, relics, routes, rewards, events, potions,
economy, and progression—so they create a coherent, readable run rather than a
set of separately balanced catalogs?

The intended audience is the product owner and future designer/implementer.
This memo therefore emphasizes decisions, reusable structures, and falsifiable
review gates over encyclopedic descriptions of either reference game.

### Evidence standard

Claims use this confidence ladder:

- **Primary:** official Mega Crit material, including its GDC balance talk,
  developer interviews, Steam store/patch material, and studio newsletters.
- **Documented behavior:** maintained wiki documentation of the released games.
  This is appropriate for exact encounter scripts, reward pools, and acquisition
  behavior, but not proof of developer intent.
- **Observation:** repeated patterns across released content.
- **Inference:** the recommendation for 注音之塔. Inference is identified as
  such and must still survive this project's product lenses and playtests.

The most important primary sources are Mega Crit's
[GDC balance presentation](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf),
[developer discussion of data and balance](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder),
[design interview](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-),
[Slay the Spire 2 Early Access statement](https://store.steampowered.com/app/2868840/Slay_the_Spire_2/),
and the official
[May 2026 newsletter](https://www.megacrit.com/news/2026-5-22-neowsletter-issue-22/).

### Limits

- *Slay the Spire 1* is stable enough to study as a mature system.
- *Slay the Spire 2* entered Early Access on March 5, 2026. Mega Crit says it
  will continue adding and balancing enemies, environments, relics, and other
  content. Sequel examples in this memo are dated observations.
- Exact hidden probabilities and generator rules documented by community
  sources are implementation references, not values to copy.
- Neither game's complexity or run length is an appropriate numeric baseline
  for a preschool, touch-first game with mandatory spoken casting.
- This memo evaluates structure. It does not approve final names, exact HP,
  exact damage, a final roster count, or implementation.

## 2. The current project has the right principles but an uneven process

### What is already strong

The current [design playbook](./DESIGN_PLAYBOOK.md) correctly establishes that:

- enemy intent is a contract between preview and resolution;
- normal fights teach, elites test, and bosses combine rules;
- easy encounters are protected by completed-combat quotas, not raw floor;
- immediate encounter and elite repeats should be prevented;
- bosses and elite risk should be visible on the map;
- topology, encounter, enemy, reward, and combat randomness should use
  separate serializable streams;
- persistent HP must make routing and defense consequential;
- feedback, touch cost, casting reliability, and interaction debt are design
  constraints rather than late presentation work;
- seeded simulation must be followed by human play with casting off and on.

Those are the correct foundations. The missing piece is a repeatable method for
turning them into a coherent non-card content portfolio.

### Where the process becomes asymmetric

| System | Current strength | Material gap |
|---|---|---|
| Cards | Foundation, destructive ideation, coverage, interaction debt, costing, telemetry, and release waves | None relevant to this memo |
| Normal enemies | Role names, exact intents, per-act damage bands | No capability ledger, pressure budget, or rule-teaching sequence |
| Encounters | Easy/hard pools and recipe targets | No formation-level complexity or simultaneous-pressure budget |
| Elites | Three per act and named deck tests | No requirement that the trio be complementary or route-relevant |
| Bosses | Three per act, phases, advanced variants | Many exact scripts precede a one-hook complexity review or teaching provenance |
| Relics | Timing vocabulary, source pools, feedback, 40 candidate designs | Roster predates the active character and owned-relic architecture; offers and acquisition horizons are not designed |
| Potions | Candidate catalog and inventory rules | No explicit relationship to capability gaps or encounter volatility |
| Events | Exact consequence and eligibility discipline | Catalog precedes event-job coverage and run-resource budgets |
| Map/economy | Visible risk, rests, shops, persistent HP | Not yet tested as the acquisition and repair economy for the proposed content |
| Difficulty | Numeric and advanced behavior variants | No complexity ceiling for behavioral variants after casting load |

The imbalance matters because an excellent deck pool cannot rescue an encounter
portfolio that repeatedly asks the same question. Likewise, a catalog of
individually sensible relics can still generate bad three-way offers, automatic
route choices, or recursive power loops.

### Live runtime versus target documents

The gap is not only conceptual:

- Live enemies in [`src/data/enemies.ts`](../src/data/enemies.ts) mainly use
  fixed cycles of attack, heavy attack, multi-hit, and Block.
- Live formations in
  [`src/data/encounters.ts`](../src/data/encounters.ts) combine those roles, but
  do not yet express the broader statuses, summoning, thresholds, or phase rules
  proposed by the encounter bible.
- Live relic definitions in
  [`src/data/relics.ts`](../src/data/relics.ts) contain only simple passive
  fields.
- `RunState` and the save snapshot currently store one `relicId`, not an
  ordered collection of relic instances with counters and acquisition state.

This is a healthy prototype state. It means the project should approve the
system contracts before treating the larger bibles as content ready for
implementation.

### Recommended disposition of existing documents

| Material | Recommendation | Reason |
|---|---|---|
| Product lenses, evidence ladder, exact intent, RNG separation | **Adopt** | Direct fit and already governing |
| Easy quotas, anti-repeat rules, visible boss and voluntary elites | **Adopt** | Protects learning and route planning |
| Proposed enemy and event names/themes | **Keep as candidates** | Useful creative work, but mechanics need portfolio review |
| Exact enemy scripts and advanced variants | **Test, then revise** | Many are differentiated more by numbers than questions |
| Proposed 40-relic catalog | **Return to candidate library** | Coupled to the prior character and an absent runtime architecture |
| Source pools, duplicate rules, deterministic relic timing | **Adopt with expansion** | Sound basis, missing offer and horizon rules |
| Five proposed Boss relics | **Replace with curated transition families** | Three repeat the narrow "+1 Energy for a downside" pattern |
| Potions, keys, Act IV, high difficulty | **Defer** | They depend on a validated three-act ecology |

## 3. What Slay the Spire 1 actually does with enemies

### Enemies form a portfolio of questions

Mega Crit has said it wanted a broad range of enemies that challenge different
strategies so that one approach does not dominate every run. Its metrics work
also examined damage taken against particular enemies, segmented by deck/card
context, rather than treating global win rate as a complete balance verdict.
That intent is visible in the final content: enemies do not merely climb an HP
and damage curve; they demand different *shapes* of output and defense.

Common capability questions include:

- Can the deck produce damage immediately?
- Can it defend one heavy hit, repeated small hits, and uneven attack turns?
- Can it remove a priority target before support or summoning compounds?
- Can it handle several targets without wasting its best single-target output?
- Can it scale before an enemy's soft or hard clock?
- Can it continue functioning after statuses dilute the draw pile?
- Can it sequence setup, burst, and recovery around a threshold or phase?
- Can it change its usual card ordering or cards-per-turn rhythm?

This is the first major lesson: **enemy strength is multidimensional**. Two
fights with identical expected incoming damage can test entirely different
decks.

### The encounter pool protects learning before it applies pressure

In the original game, the first three Act I normal fights come from an easy
pool; Acts II and III protect the first two. Later fights draw from harder
pools, and recent normal encounters are excluded to reduce repetition.
[Monster documentation](https://slaythespire.wiki.gg/wiki/Monsters) records
these selection rules.

The important structure is not the exact quota. It is that:

1. progression is based on completed combats, so event-heavy paths do not
   accidentally skip onboarding;
2. an easy pool establishes the act's vocabulary;
3. a hard pool combines familiar rules and raises simultaneous pressure;
4. anti-repeat rules protect variety and avoid accidental difficulty spikes.

For 注音之塔, this structure should be even more explicit. The child must learn
both the encounter rule and the casting loop, and a route with many non-combat
rooms must not silently advance them into complex formations.

### Act I elites are complementary audits

The original game's first elite trio is a particularly clear design object:

| Elite | Visible problem | Primary audit | What it prevents from dominating |
|---|---|---|---|
| Gremlin Nob | Skills increase its Strength; its attack pressure arrives quickly | Front-loaded damage and restrained setup | Slow defense or setup as a universal early answer |
| Lagavulin | Optional setup window followed by attacks and permanent offensive/defensive erosion | Setup timing, burst, and closing speed | Indefinite scaling or attritional defense |
| Three Sentries | Offset attack turns plus Dazed cards that become painful after reshuffle | Target priority, area efficiency, draw-cycle resilience | Narrow single-target decks and fragile small cycles |

The exact scripts are documented on the
[Gremlin Nob](https://slaythespire.wiki.gg/wiki/Gremlin_Nob),
[Lagavulin](https://slaythespire.wiki.gg/wiki/Lagavulin), and
[Sentry](https://slaythespire.wiki.gg/wiki/Sentry) pages.

The design inference is more important than any individual mechanic:

> An elite trio should be reviewed as a set. If one early answer is best against
> all three, the trio is not doing its job.

Because elites are visible and optional, their differences affect route
planning before combat. Because victory grants a relic, their differences also
control which decks can compound run-long power.

### Visible bosses exert pressure before the fight begins

Act bosses are shown when the map is generated. The player therefore drafts,
upgrades, rests, shops, and selects elite risk with a known long-term exam in
mind.

The Act I suite again illustrates complementary questions:

| Boss | Dominant hook | Earlier skills it recombines | Draft/route pressure |
|---|---|---|---|
| Slime Boss | A large telegraphed hit and HP-threshold split into two enemies | Burst timing, status tolerance, area cleanup | Find controlled burst and multi-target coverage |
| Guardian | Damage threshold changes its mode; repeated attacks meet retaliation | Intent reading, attack count, defense rhythm | Avoid relying only on many small attacks |
| Hexaghost | Escalating fixed cycle, statuses, and a future deadline | Sustained output, defense across shapes, draw resilience | Prepare scaling without becoming too slow |

Sources:
[Slime Boss](https://slaythespire.wiki.gg/wiki/Slime_Boss),
[Guardian](https://slaythespire.wiki.gg/wiki/The_Guardian), and
[Hexaghost](https://slaythespire.wiki.gg/wiki/Hexaghost).

Later acts broaden the same grammar:

- multi-enemy elites combine immediate damage, priority targets, debuffs, and
  deck pollution;
- Giant Head permits setup before an escalating deadline and changes the value
  of card ordering;
- Nemesis creates burst windows and high defensive variance;
- Reptomancer turns summoning into an immediate target-priority/AoE check;
- Time Eater constrains card volume rather than forbidding an archetype;
- Awakened One changes the timing and value of Powers;
- Donu and Deca combine scaling, defense, deck pollution, and two-target
  priority.

The bosses do not need to make a strategy impossible. Their value comes from
forcing a strong deck to sequence differently, diversify, or solve a weakness
before arrival.

### Enemy scripts use several kinds of uncertainty

The original game mixes:

- fixed cycles;
- deterministic openers followed by cycles;
- weighted move choices;
- anti-repeat conditions;
- HP or state thresholds;
- multi-enemy role composition;
- difficulty-specific behavior.

All of these can be fair because the resolved next action is shown through
intent. The player reacts to the known consequence; hidden selection logic
creates variety between turns and runs without concealing the immediate bill.

For 注音之塔:

- easy monsters should favor short deterministic cycles;
- bounded randomness should enter only after the rule is learned;
- a random branch must not change whether the child could have reasonably
  prepared for lethal damage;
- coach text should explain the *current tactical job*, not expose the hidden
  random algorithm.

### Route economy makes tests meaningful

Elites grant more gold, stronger card rarity, and a relic. Bosses follow a rest
site and grant large transition rewards. Exact values are documented in
[elite](https://slaythespire.wiki.gg/wiki/Elites) and
[boss](https://slaythespire.wiki.gg/wiki/Bosses) references, but the reusable
structure is:

```text
current HP + potion capacity + deck capabilities
  → confidence against a visible test
  → voluntary route risk
  → persistent reward
  → greater confidence or new decisions later
```

If elite rewards are too weak, the route decision disappears. If elites are
mandatory or a relic makes them trivial, the decision also disappears. The
economy and the enemy portfolio are therefore the same design problem.

### Difficulty changes behavior only after the base grammar works

The original Ascension ladder separates ordinary enemy, elite, and boss tuning.
High tiers eventually change scripts or abilities rather than applying only a
universal percentage. This provides longevity for an expert audience, but it is
not the correct early target here.

For 注音之塔, stable rules across difficulty are more valuable than bespoke
behavior until the base game is proven. Harder modes should first tune HP,
damage, recovery, route pressure, and composition. New behavioral exceptions
should appear only when they remain fully previewable and do not raise the
child-facing explanation cost.

## 4. What Slay the Spire 2 adds—and what its revisions teach

### Treat the sequel as a live experiment

Mega Crit describes Early Access as a period for balance, feedback, experimental
features, and content changes. It gathers anonymized metrics and provides an
in-game feedback tool. The company has continued moving changes through a
public beta before stable releases.

The useful question is not whether every current sequel encounter is better
than the original. It is what design structures Mega Crit is testing, keeping,
or removing.

### A biome is a curriculum, not a skin

The released sequel uses alternate environments, with different normal
encounters, formations, elites, bosses, events, and thematic mechanics. Current
[act](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Main/Acts) and
[enemy](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Enemies)
documentation shows separate easy and hard pools and three elites and bosses
per environment.

This expands the original game's act logic:

```text
visual setting
  + enemy roles
  + mechanic vocabulary
  + formation recipes
  + elite audits
  + boss exams
  + events and route incentives
  = one biome curriculum
```

For 注音之塔, each act should receive this level of systemic identity even if
alternate biomes are never built.

### More fights care about the shape of damage or defense

Released sequel encounters include rules that distinguish:

- one large hit from many small hits;
- partial Block from full Block;
- damaging a target from repeatedly hitting it;
- killing a target now from preparing for its post-death consequence;
- defeating a leader from cleaning up its formation;
- drawing temporary problem cards from retaining, discarding, or playing them.

Examples documented in the current game include enemies that:

- reduce a fixed number of HP-loss instances to one, rewarding multi-hit;
- become stunned when fully Blocked;
- must be hit repeatedly to prevent escape or theft;
- punish each unblocked hit with a lasting cost;
- die into several smaller targets;
- insert temporary cards that can be manipulated by the deck.

The lesson is not to copy these mechanics. It is to author encounters against
**output shapes**, not only totals. A 12-damage card, four 3-damage hits, and
three 4-damage cards should sometimes be strategically different.

### Depth increasingly comes from formations

Current sequel formations pair specialized roles:

- leader plus followers;
- protector plus damage dealer;
- summoner plus generated units;
- debuffer plus attackers;
- enemies with offset cycles;
- a durable body that transforms into a cleanup problem.

This is efficient content design. A small roster can create many tactical
questions if each monster has a distinct job and encounter recipes combine jobs
carefully.

The caution for this project is simultaneous cognitive load. Three independently
complex monsters are not an interesting formation for a preschooler. A good
formation should normally contain:

- one obvious priority or relationship;
- one primary combined question;
- at most one secondary pressure;
- exact aggregate incoming damage;
- a coach cue that identifies the relationship.

### Fixed patterns improve learning but can become rote

Many current sequel elites and bosses use strongly structured cycles, while
others use bounded random choice. This reinforces learning and supports the new
Bestiary, which Mega Crit describes as a place to inspect encountered enemies'
moves and animations in the
[June 2026 newsletter](https://www.megacrit.com/news/2026-6-19-neowsletter-issue-23/).

For a learning game, inspectable patterns are a strong fit. The risk is that
every fight becomes a memorized script rather than a tactical response. The
recommended blend is:

- deterministic introductory fights;
- deterministic elite/boss phase structure;
- limited variation in timing, target composition, or one move branch;
- exact immediate intents at all times;
- no reliance on remembering an unshown future script for survival.

### The Doormaker removal establishes a complexity ceiling

Mega Crit replaced the Act III Doormaker boss with Aeonglass during Early
Access. Its
[May 2026 explanation](https://www.megacrit.com/news/2026-5-22-neowsletter-issue-22/)
said the old boss created interesting small decisions but was more complex than
the team wanted and retained unresolved problems. Earlier public discussion
also noted that its kill and damage metrics were not necessarily worse than
peer bosses.

That distinction is important:

> Balanced lethality does not prove a fight is good. Comprehension, pacing,
> frustration, agency, and thematic clarity are separate acceptance criteria.

For 注音之塔, a boss should pass all of these limits:

- the child-facing hook fits in one sentence;
- the coach strip adds at most one sentence of strategy;
- the UI shows the threshold, countdown, or rule owner;
- each phase has one dominant tactical question;
- no more than one unfamiliar rule appears in the boss fight;
- the boss does not require tracking several hidden or card-specific exceptions;
- casting failure remains costly but does not make the rule incomprehensible.

### Ancients show that the offer itself is designed content

The sequel replaces the original unrestricted Boss Relic chest with themed
Ancient encounters at act transitions. Current
[Ancient documentation](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ancients)
shows that different Ancient pools can curate their three offers through
internal sub-pools.

The transition rewards can affect:

- Energy and throughput;
- deck contents and starter cards;
- future card rewards;
- upgrades or enchantments;
- potions;
- route incentives and map behavior;
- finite charges or quests;
- economy.

This is a meaningful improvement over repeatedly comparing "+1 Energy with
downside A" against "+1 Energy with downside B." More importantly, it exposes a
general rule:

> Three individually valid relics do not automatically make a valid offer.

Offer construction must consider functional variety, deck state, remaining
opportunities, downside visibility, and whether at least two choices are
credible.

### What not to copy from the sequel

- Do not copy current counts, probabilities, difficulty tiers, or unfinished
  balance.
- Do not introduce battle-specific temporary cards until the UI can explain
  them instantly and casting rules for them are explicit.
- Do not equate fixed cycles with sufficient readability; future consequences
  still need visible previews or coach guidance.
- Do not use alternate acts before one three-act curriculum works.
- Do not require a Bestiary to compensate for an unreadable first encounter.
- Do not treat Early Access popularity or aggregate win rate as proof that a
  mechanic fits this audience.

## 5. Relics must be co-designed with cards, encounters, and routes

### A functional definition

For this project:

> A relic is a persistent run rule that changes at least one future decision
> about cards, combat sequencing, encounter confidence, routing, or resource
> conversion.

A relic can provide numerical value, but if its only effect is invisible
unconditional output, it adds balance load without creating much play.

### Functional taxonomy

| Role | Decision changed | Healthy use in 注音之塔 |
|---|---|---|
| Opening tempo | Setup versus immediate play | Opening Block, draw, or one visible first-turn resource |
| Cadence | Card order or repeated action count | Every third Attack, first Skill each turn, reshuffle trigger |
| Mechanic bridge | Value of two card directions | Reward alternation, full Block, Vulnerable timing, or another approved mechanic |
| Draft shaper | Future reward valuation | Upgrade/type incentives that remain useful without one named card |
| Deck/hand transformer | Cost, retention, size, or consistency | Rare, run-defining effects with strong UI |
| Sustain/safety | Acceptable HP risk | Threshold recovery, post-elite safety, bounded prevention |
| Encounter insurance | Confidence against a test family | Partial help against elites, multi-target fights, statuses, or heavy hits |
| Route/map modifier | Node valuation | Extra elite appetite, campfire action, shop or Unknown incentive |
| Economy converter | Gold, rewards, or rooms | Exchange one resource for another with a visible opportunity cost |
| Consumable support | Potion supply or strength | Later layer that broadens tactical coverage |
| Recovery valve | Weak-run stabilization | Conditional help that does not accelerate strong runs equally |
| Transition transformation | Core run constraint | Curated act-start contract affecting deck, route, resources, or tempo |

Rarity remains useful for availability and complexity, but it is not a design
job. A pool containing eight rarities of "gain more damage" is not diverse.

### How relics connect to the deck

Healthy relics create valuation changes:

- cheap multi-hit cards become more attractive after a cadence trigger;
- a reward-upgrade relic changes which future type the player prefers;
- hand retention increases the value of controlled discard and decreases the
  value of hand-clogging cards;
- a relic that rewards full Block connects defense and counterattack
  directions;
- an elite-insurance relic changes both deck confidence and map appetite.

Character-specific relics should deepen an already functional mechanic or
bridge two directions. They should not make a dead package legal only when the
right random relic appears.

### How relics connect to encounters

Each relic candidate should name:

1. the capability test it helps;
2. the test or deck state where it is weak;
3. the amount of deck investment needed to reach its ceiling;
4. whether it changes route confidence;
5. an encounter it must *not* trivialize.

A relic that helps with swarms is valuable. A relic that makes every multi-enemy
fight irrelevant removes content. Encounter coverage therefore provides both
the reason for a relic and its upper bound.

### How relics connect to economy and routes

Relics that depend on future shops, combats, campfires, rewards, elites, or
treasures need an acquisition horizon:

```text
expected remaining opportunities
  × expected value per opportunity
  - activation/setup cost
  = plausible remaining payoff
```

This does not need to become a player-facing formula. It must become an
eligibility rule. A shop discount near the final boss, a map-reveal relic after
the route is fixed, or a reward-upgrade relic with one reward left is a dead
prize unless it includes immediate compensation.

### Casting-specific relic rules

Relics may react to casting but may never bypass the full-cast gate.

For any failure-related relic:

- expected value of correct casting must remain higher than intentional failure;
- the trigger must provide emotional recovery, not a farmable engine;
- failure compensation must be capped by turn or combat where necessary;
- debug-skip and real-cast behavior must be defined separately;
- the player must see whether the relic triggered before the next decision;
- an adult explanation must not encourage strategic mispronunciation.

### Why the current Boss relic direction should change

The current candidate tier contains several permanent +1 Energy items with
different structural downsides. This copies the narrowest part of the original
Boss Relic space and creates a dominant comparison axis.

Replace the single tier with **act-transition conductor families**:

| Offer family | Example design space | Required tradeoff |
|---|---|---|
| Tempo | Energy, opening draw, first-turn setup, finite charges | Reduced sustain, restricted cadence, or later repayment |
| Deck transformation | Remove/transform Basics, Retain, cost reshaping, upgrades | Lost flexibility, added burden, or constrained future rewards |
| Future economy | Better cards, shops, relics, or upgrades later | Gold, immediate power, or narrower choice now |
| Route contract | Elite, rest, shop, Unknown, or treasure incentives | Commitment to visible route risk |
| Safety contract | Healing, prevention, or recovery valves | Lower ceiling, reduced rewards, or finite uses |
| Mechanic amplifier | Strengthen an approved direction or bridge | Requires density but retains a standalone floor |
| Consumable contract | Potion capacity, supply, or power | Gives up another persistent resource |

Each transition offer should draw from different functional families rather
than an unrestricted global pool. The upcoming act, visible route information,
current deck, current relics, and remaining system opportunities should all be
available in the choice view.

## 6. A shared capability and pressure model

### Capability ledger

Use one ledger for cards, encounters, relics, potions, and routes:

| Capability | What it means | Common failure signature |
|---|---|---|
| Front-load | Useful output in turns 1–2 | Takes large early damage while setting up |
| Sustained output | Continues dealing damage after first shuffle | Fight stalls after initial hand |
| Heavy-hit defense | Answers one large telegraphed attack | Overblocks small turns, dies to boom turn |
| Repeated-hit defense | Handles multi-hit or consecutive attack turns | Block plan is efficient only against one hit shape |
| Area damage | Efficiently reduces several bodies | Priority target survives while total intent grows |
| Target priority | Removes the correct support/scaler/summoner | Attacks the tank while the formation compounds |
| Multi-hit output | Produces repeated damage instances | Cannot interact with hit-count or shield rules |
| Scaling | Improves faster than a long fight | Reaches an unwinnable damage/defense race |
| Draw consistency | Finds required tools on the required turn | Correct answer exists but is not drawn |
| Status tolerance | Functions when the deck is diluted or debuffed | Second shuffle collapses |
| Energy consistency | Plays the important combination reliably | Ends turns with stranded cards or unmet setup |
| Recovery | Repairs persistent HP or stabilizes a weak run | Route becomes unwinnable after one poor fight |
| Cast resilience | Remains playable under realistic cast errors and time | Theoretical output exists only with perfect casting |

This is not a checklist every deck must maximize. It is a map of deliberate
strengths, weaknesses, and available repair routes.

### Pressure budget

Rate every encounter across these independent axes:

- immediate HP threat;
- future scaling or hard deadline;
- deck/draw interference;
- action or card-type restriction;
- target count and target-priority load;
- intent variance;
- phase/threshold memory;
- casting and explanation load.

Recommended qualitative scale:

```text
0 = absent
1 = supporting pressure
2 = primary encounter question
3 = exceptional set-piece pressure
```

Normal encounters should usually have one axis at 2 and no axis at 3. Hard
formations may have two axes at 2 when both rules were taught earlier. Elites
may have two or three interlocking axes at 2. A boss may reach 3 on its dominant
hook, but other axes must be reduced accordingly.

The total should not be converted into a universal difficulty score. The
purpose is to catch accidental stacks such as high damage + scaling + three
targets + statuses + a new phase rule + difficult casting.

### Encounter tier contracts

| Tier | Job | Normal complexity limit | Reward role |
|---|---|---|---|
| Tutorial | Teach casting, intent, Block, and targeting | One enemy, one repeated rule | Safety and comprehension |
| Easy normal | Introduce one act mechanic | One role, short cycle, forgiving numbers | Card/gold progression |
| Hard normal | Combine learned roles | One primary and one secondary pressure | Routine deck test |
| Elite | Audit a capability pair voluntarily | Distinct hook, readable clock, no hidden hard counter | Relic plus enhanced rewards |
| Boss | Forecasted act exam | One dominant hook, one escalation, taught vocabulary | Act transition and strategic contract |
| Act IV set piece | Final broad audit | Familiar rules at higher interaction | Optional culmination |

### Soft counters, not exclusions

An encounter can strongly reward a capability without making other decks
invalid:

- multi-hit can be best against a shell, while large hits still work more
  slowly;
- area damage can be efficient against a formation, while priority burst offers
  another route;
- status handling can reduce attrition, while sufficient speed can end the
  fight before pollution matters;
- full Block can stun an enemy, while ordinary defense and damage can still win.

Avoid immunity, unpreviewed card-type bans, or boss rules that erase a character
direction. The player should feel pressured to adapt, not told that their run
was invalid several floors ago.

## 7. Full roster direction for 注音之塔

The following is a portfolio direction, not an approved content list. Existing
names and art concepts may be reused after their mechanics pass this structure.

### Shared main-act content shape

Each main act should target:

- 6–8 native normal monster roles;
- 4 easy encounter recipes;
- 6–8 hard encounter recipes built from known roles;
- 3 elites with complementary audits;
- 3 visible bosses with different one-hook exams;
- act-specific event jobs and resource pressures;
- one act-transition choice drawn from curated relic families.

The current encounter bible's minimum of six normal enemies, ten normal
recipes, three elites, and three bosses is a reasonable catalog target. What
changes is the order: approve curriculum and coverage before exact scripts.

### Act I — 入門塔: intent rhythm and immediate survival

**Curriculum:** read exact intents, choose attack versus defense, recognize one
priority target, and experience a simple multi-enemy formation.

**Primary capabilities:** front-load, basic heavy-hit defense, draw/energy
reliability, and target priority.

**Normal-role portfolio:**

- forgiving fodder that teaches finishing a target;
- clear striker with repeated attacks;
- tank/protector that makes target choice visible;
- heavy attacker with a boom turn;
- multi-hit attacker that distinguishes hit shapes;
- simple support/scaler used only after solo introduction.

**Easy recipes:**

1. one fodder/striker;
2. one tank;
3. one heavy with a forgiving setup;
4. two offset fodder units with low aggregate intent.

**Hard formations:**

- tank + fodder;
- support + striker;
- heavy + low-pressure helper;
- offset multi-hit pair;
- three weak bodies as the first area/priority check;
- one transformation or threshold enemy using an already visible rule.

**Elite trio:**

1. **Tempo audit:** a readable turn clock that asks for front-loaded damage
   without directly punishing Skills or casting attempts.
2. **Formation audit:** one leader and helpers, asking for priority or area
   efficiency.
3. **Defense-rhythm audit:** alternating heavy and multi-hit pressure, asking
   for consistent hands rather than one perfect Block card.

No one early reward should be the best answer to all three.

**Boss suite:**

- **Threshold boss:** controlled burst changes its state or creates a cleanup
  formation.
- **Boom-cycle boss:** a large known future attack creates a scaling-versus-
  safety choice.
- **Rhythm boss:** alternates attack shapes or offensive/defensive modes,
  rewarding flexible sequencing.

Every boss must remain beatable with upgraded/basic-style attacks and defense,
even though rewards provide more efficient answers.

**Economy role:** establish persistent HP stakes, make the first elite
voluntary, and ensure at least one reachable repair route through rest, shop, or
safer pathing.

### Act II — 迴音機房: interference, formations, and repair

**Curriculum:** continue functioning when enemies alter draw quality, defend a
formation relationship, and decide when to spend a limited recovery resource.

**Primary capabilities:** status tolerance, sustained defense, area/priority,
and consistency after the first shuffle.

**Normal-role portfolio:**

- disruptor that adds one simple temporary problem card or visible debuff;
- protector that shields a more dangerous partner;
- scaler that becomes urgent if ignored;
- summoner with a strict unit cap;
- multi-hit striker;
- thief/escape role that creates a short visible deadline;
- durable body whose partner or phase changes the preferred target.

**Easy recipes:**

- solo disruptor with low damage;
- solo protector/tank;
- solo scaler with a generous clock;
- one simple two-role formation.

**Hard formations:**

- protector + striker;
- scaler + fodder;
- summoner + one starting unit;
- disruptor + multi-hit attacker;
- thief/escape target + blocker;
- transformation enemy that shifts single-target damage into cleanup.

**Elite trio:**

1. **Status audit:** tests whether the deck can close before pollution or retain
   function through it.
2. **Priority audit:** support/summoner formation with a clear kill-order
   decision.
3. **Sustained-defense audit:** varied attack shapes plus a soft scaling clock.

**Boss suite:**

- **Formation commander:** a leader changes or rebuilds a known formation.
- **Interference boss:** temporary cards or a chosen debuff alter sequencing,
  with an always-available fallback response.
- **Pressure-switch boss:** a threshold changes the preferred output from setup
  to race, or from single target to cleanup.

**Economy role:** make potion capacity, removal, upgrades, and campfire choices
meaningfully compete. Act II should expose weaknesses the player can still
repair rather than simply punish an irreversible Act I draft.

### Act III — 星聲塔頂: consistency, scaling, and broad competence

**Curriculum:** demonstrate that the deck can execute its plan repeatedly while
adapting card order or target choice.

**Primary capabilities:** scaling, full-deck consistency, flexible sequencing,
and recovery from disruption.

**Normal-role portfolio:**

- high-pressure striker with predictable relief turns;
- advanced scaler;
- defender/support pair;
- status/draw disruptor using a familiar status model;
- phase or threshold enemy that changes the question once;
- multi-body formation requiring both priority and sustained defense;
- late-game clock that is threatening without a one-turn kill.

**Easy recipes:** familiar roles at Act III numbers, not brand-new mechanics.
The protected opening quota should remind the player of the act vocabulary
before hard formations appear.

**Hard formations:**

- support + scaler + low-pressure body;
- two enemies with offset heavy turns;
- durable tank protecting a disruption source;
- repeated-hit and single-heavy combination;
- three-target priority puzzle using only familiar rules;
- phase enemy with a known status or threshold interaction.

**Elite trio:**

1. **Scaling-speed audit:** permits setup, then applies a clear escalating
   deadline.
2. **Sequence audit:** changes the preferred card order or card-volume rhythm
   without banning a type.
3. **Broad formation audit:** combines target priority, defense, and cleanup
   with a strict complexity cap.

**Boss suite:**

- **Engine-pressure boss:** alters the timing of persistent setup but does not
  invalidate Powers or a character direction.
- **Sequence boss:** rewards deliberate card order, attack shape, or turn
  pacing.
- **Two-stage consistency boss:** the second phase changes the question and
  checks whether the deck's engine works more than once.

The three bosses should pressure different late-run solutions so the player
cannot draft one universal Act III answer.

**Economy role:** reduce raw repair availability, increase the value of prior
route decisions, and make final shops/rests about targeted preparation for the
visible boss.

### Act IV — 最後回音: optional synthesis

Act IV should remain deferred until the base three acts work. Its job is not to
introduce a new subsystem.

Use:

- one fixed elite that recombines familiar priority, status, and scaling rules;
- one final boss with two clearly previewed phases;
- key opportunity costs that were visible and understandable in the main acts;
- no invisible start-of-turn damage, sudden one-turn kill, or boss-only casting
  exception.

The final encounter may demand broader coverage, but every rule must have a
teaching ancestor in Acts I–III.

### Event portfolio

Retain exact-consequence previews from the current bible, then classify events
by run job:

- HP for power;
- gold for precision;
- deck repair or transformation;
- upgrade versus safety;
- relic/potion exchange;
- optional combat for a known reward;
- route information or node conversion;
- recovery valve for weak runs;
- character/learning expression without required curriculum lockout.

Review the 30-event candidate catalog for job distribution and expected resource
flow. Cut duplicate exchanges even when their stories differ. Events should
not become a parallel source of unconditional power that makes combat routing
inferior.

### Potion portfolio

Potions should provide temporary coverage, not permanent deck identity:

- emergency heavy-hit defense;
- immediate single-target or area output;
- draw/energy consistency;
- status cleanup or prevention;
- target-priority burst;
- finite scaling for one elite/boss;
- recovery only under an explicitly approved persistent-HP budget.

Introduce them after normal card targeting and relic feedback are comfortable.
Measure hoarding, overflow, and whether a potion erases an elite test.

### Progression portfolio

Progression should add breadth:

- optional cards and relic families;
- characters;
- phrase themes;
- cosmetics;
- difficulty and alternate content after the base curriculum is stable.

It should not permanently raise combat stats or lock phonetic material required
by a learner. New unlock batches must preserve valid reward and relic offers.

## 8. Mature relic portfolio direction

The current target of roughly 40 relic designs is a plausible *catalog scale*,
not a quota that validates the individual entries.

Use this portfolio shape:

### Starter layer

- one starter relic per character;
- teaches the character's identity on the first relevant turn;
- useful without drawing a combo;
- visible trigger and coach explanation;
- part of starter-deck balance, not bonus power added afterward.

### Ordinary layer

Target roughly eight candidates at each ordinary rarity before culling:

**Common**

- broad, visible tempo and safety;
- simple cadence triggers;
- one or two recovery/economy pieces;
- normally no persistent counter unless the UI already supports it.

**Uncommon**

- bridges between card directions;
- draft shapers and future upgrades;
- encounter insurance;
- route, shop, or campfire modifiers;
- effects requiring moderate deck investment.

**Rare**

- deck/hand transformations;
- rule changes with meaningful anti-synergy;
- strong route/economy contracts;
- high-ceiling cadence or character-mechanic engines;
- no Rare may require one named Rare card to have a floor.

Across the ordinary pool, reserve a minority of designs for
character-specific mechanics. Too many character-specific drops turn rewards
into an archetype lottery.

### Source-specific layer

Maintain dedicated candidates for:

- **Shop:** precision, discounts, removal, or economy rules worth saving for;
- **Event:** story-linked exchanges unsuitable for ordinary drops;
- **Special/key:** route credentials and one-off narrative systems kept
  separate from ordinary power telemetry.

### Transition layer

Author at least three candidates in each active transition family, then build
offers with at most one item from a family:

1. tempo/safety;
2. deck transformation/mechanic bridge;
3. future economy/route contract.

Additional families can enter later, but every three-way offer must expose
meaningfully different decisions. Avoid filling the layer with permanent
Energy variants.

### Release waves

1. Starter relic plus 6–8 universal ordinary relics.
2. Character bridges matched to approved low-rarity card directions.
3. Route, economy, shop, and campfire relics.
4. Rare transformations.
5. Curated transition families.
6. Potion and event integrations.

Design all waves against the full capability matrix, but implement only after
their timing and save contracts exist.

## 9. The actionable design funnel

### Gate A — Run foundations

Lock:

- act curriculum and expected encounter length;
- capability vocabulary;
- pressure scale;
- normal/elite/boss reward contracts;
- persistent-HP and recovery budget;
- relic ownership/timing architecture;
- which states the child and coach can inspect;
- casting behavior for every new card/status source.

No roster ideation should become approved content before this gate.

### Gate B — Portfolio briefs

Before individual designs, create:

- per-act monster-role requirements;
- easy and hard formation jobs;
- one-line elite audit briefs;
- one-line boss hooks and their teaching ancestors;
- relic functional-role targets;
- event and potion job targets;
- route and economy repair opportunities.

This makes missing jobs and duplicate jobs visible before names create
attachment.

### Gate C — Destructive ideation

Generate at least twice the number of needed enemies, formations, bosses, and
relics. Cull any design that:

- repeats another design's primary question;
- requires a paragraph to explain;
- has no starter/basic fallback;
- introduces state the UI cannot show;
- hard-invalidates a card direction;
- works only with one named reward;
- has no credible acquisition window;
- creates more interaction debt than strategic value;
- rewards intentional cast failure or bypasses casting.

### Gate D — Composition review

Review sets, not only individuals:

- easy pool as a teaching sequence;
- hard pool for role combinations and aggregate intent;
- each elite trio for complementary audits;
- each boss suite for different drafting pressure;
- each relic source for functional diversity;
- each transition offer family for credible choices;
- each act for repair opportunities before its exams.

### Gate E — Numbers and clocks

Only after the questions are distinct:

- set expected turn bands;
- set expected HP-loss bands;
- allocate immediate versus future pressure;
- price elite reward against voluntary HP risk;
- price relic value across remaining opportunities;
- test potion coverage without making it mandatory;
- apply cast-on effectiveness rather than importing Spire ratios.

### Gate F — Seeded ecology validation

Use fixed seeds to test:

- all boss candidates from floor 1;
- each elite at early, middle, and late legal timing;
- representative weak, average, and strong decks;
- compact and bloated decks;
- different relic portfolios;
- safe and aggressive routes;
- earliest and latest relic acquisition;
- offer-set quality and skipped choices;
- save/load before phase, reward, and acquisition transitions.

Static bots may expose outliers and impossible states. They do not approve
preschool comprehension or fun.

### Gate G — Human validation

Test in this order:

1. adult designer play with debug skip;
2. adult designer play with casting;
3. adult-child co-play with coach strip;
4. repeated learner play to detect rote scripts and fatigue;
5. reduced-motion, touch, orientation, and save/resume checks.

Separate data by learner experience and cast mode. A fight that is fair with
instant card resolution may be exhausting with several spoken attempts.

## 10. Required design records

### Encounter specification

```text
Encounter:
Act / pool / earliest combat:
Fantasy and visual relationship:
Teaching ancestor:
Primary capability test:
Secondary capability test:
Pressure ratings:
Enemy roles and target priority:
Opening guarantee:
Intent state machine / repeat limits:
Thresholds or phases:
Soft clock / hard clock:
Expected turn band:
Expected HP-loss band:
Strong answers:
Starter/basic fallback:
Relics or potions that help:
Rule that must not be trivialized:
Child-facing cue:
Coach-strip cue:
Casting/cognitive load:
Failure signature:
Telemetry:
Seeded acceptance cases:
Decision: keep / revise / cut / defer
```

### Elite-suite review

```text
Act:
Elite A audit:
Elite B audit:
Elite C audit:
Best common answer to each:
Answer that is suspiciously best against all three:
Route information available before choice:
Expected HP and potion cost:
Relic/reward contract:
Repeat protection:
Cast-on complexity:
Decision:
```

### Boss review

```text
Boss:
One-sentence child hook:
One-sentence coach strategy:
Earlier encounters that taught each rule:
Drafting pressure from floor 1:
Primary phase question:
Escalation or second phase:
Visible threshold/countdown:
Strong answer:
Starter/basic fallback:
Hard-counter audit:
Interaction-debt total:
Expected turn / HP-loss band:
Cast-on fatigue risk:
Comprehension test:
Decision:
```

### Relic review

```text
Relic:
Source / earliest / latest floor:
Persistent rule changed:
Card valuations changed:
Encounter capabilities changed:
Route/economy decisions changed:
Standalone floor:
Required mechanic density:
Expected remaining triggers:
Best interactions:
Weak/dead state:
Trigger ceiling and recursion risk:
Encounter it must not trivialize:
Cast-success behavior:
Cast-failure behavior:
Offer-family placement:
UI and save state:
Falsifying seeded test:
Decision: keep / revise / cut / defer
```

### Run-ecology review

```text
Act / content wave:
Capabilities taught:
Capabilities tested:
Capabilities hard-tested:
Reward and repair access:
Elite risk/reward:
Boss-driven drafting changes:
Relic roles available:
Potion coverage:
Event resource flow:
Most likely failure signature:
Cast-off evidence:
Cast-on evidence:
Adult-child evidence:
Missing or overrepresented jobs:
Decision:
```

## 11. Validation and telemetry

### Encounter telemetry

Record:

- encounter, act, route position, boss identity, and difficulty;
- reached, won, fled if supported, and death turn/intent;
- turns, HP lost, Block used, overkill, and unused Energy;
- target order and turn each enemy died;
- statuses added, drawn, played, discarded, and remaining;
- potion use and relic triggers;
- deck size, capability tags, and key mechanic density;
- cast attempts, failures, response time, and adult intervention;
- whether the coach cue was opened or repeated.

Interpret by failure signature, not only win rate. "Lost to the boss" is less
useful than "could not find defense on the second heavy turn after two status
draws."

### Relic telemetry

Record:

- source, floor, alternatives, pick/skip, and current deck state;
- immediate route change after acquisition;
- trigger count and useful versus wasted value;
- encounters helped and HP saved;
- future rewards or nodes affected;
- latest-floor dead acquisitions;
- recursion with other relics;
- cast-success and cast-failure triggers separately;
- run result with acquisition timing and player experience.

High win association can reflect player skill, late rarity, safe acquisition,
or selection bias. Balance questions must be specific.

### Offer-set tests

For representative deck states:

- at least two transition choices should be credible;
- ordinary rewards should not contain duplicate definitions;
- avoid three options on the same functional axis unless intentional;
- exclude invalid targets and too-late future-value items;
- detect universal winners across deck and route states;
- review skipped and forced-choice rates with the alternatives shown;
- never rely on global pick rate without deck, route, and timing context.

### Cross-system seeded scenarios

Every content wave should include:

- one heavy-hit fight;
- one repeated multi-hit fight;
- one swarm/priority formation;
- one front-load race;
- one scaling race;
- one status/draw disruption fight;
- one phase transition;
- one early and one late elite route;
- one low-HP and one healthy shop/rest decision;
- earliest and latest acquisition of every future-value relic;
- cast failure immediately before a lethal intent;
- save/load before reward, relic trigger, threshold, and boss transition.

## 12. Implementation implications, not authorization

This research implies future runtime work but does not authorize it.

### Relic architecture

Future design requires:

- ordered owned relic instances rather than one `relicId`;
- stable definition IDs and instance state/counters where needed;
- deterministic acquisition and duplicate exclusion;
- explicit pickup effects versus ongoing hooks;
- ordered timing for combat, card, room, and reward hooks;
- earliest/latest acquisition and eligibility predicates;
- trigger previews and visible counters;
- save migration and legacy ID handling;
- debug inspection and seeded reward forcing.

Keys and other route credentials should not be represented as ordinary relic
power unless their telemetry and UI are deliberately separated.

### Encounter architecture

The target roster requires:

- data-driven enemy states and transitions;
- ordered multi-effect moves;
- statuses, summoning, escape, thresholds, and phase transitions;
- resolved intent payloads shared by preview and execution;
- aggregate formation-intent display;
- deterministic repeat limits and encounter selection;
- save/load of enemy phase, move state, summons, and pending transitions;
- coach cues derived from the same rule payload, not handwritten guesses.

### Content validation

Automated validation should eventually assert:

- every boss rule has a teaching ancestor;
- each elite trio covers distinct primary capabilities;
- formations remain within pressure and target-count budgets;
- every relic has valid targets and acquisition timing;
- relic offers contain allowed functional combinations;
- no cast-failure effect exceeds success value;
- no encounter or relic bypasses the full-cast gate;
- all child-facing rules have icons, counters, previews, and coach text.

## 13. Recommended next steps

1. **Merge the design method into the playbook after review.** Add the shared
   capability ledger, pressure budget, encounter funnel, relic co-design rules,
   offer-set review, acquisition horizon, and system-level release gates.
2. **Reclassify the current large bibles.** Preserve names and mechanics as
   candidates, but remove any implication that exact rosters are approved.
3. **Create one Act I coverage sheet.** Map the current live and proposed Act I
   enemies, formations, elites, bosses, card directions, and relic candidates
   against the capability ledger.
4. **Cull before implementing.** Identify duplicate numeric loops, elite tests
   answered by the same card profile, bosses with too many rules, and relics
   that change no decision.
5. **Approve architecture before content volume.** Use the implemented
   card-instance foundation as the migration precedent, then decide owned relic
   instances, encounter state machines, statuses, and deterministic timing.
6. **Build an Act I vertical slice.** Use four easy recipes, six hard recipes,
   three complementary elites, three boss candidates, and a starter plus 6–8
   ordinary relics.
7. **Validate the ecology, then expand.** Run seeded tests and cast-off/cast-on
   playtests before authoring Act II numbers or transition relic families.

## 14. Further questions for product review

- Should every act remain tied to one phonetic teaching emphasis, or should
  educational progression remain profile-driven while acts vary only combat
  concepts?
- How much future enemy-pattern information should be inspectable beyond the
  exact next intent: none, the full cycle in an adult Bestiary, or a simplified
  preview?
- Should act-transition conductor offers be mandatory, skippable, or include a
  deliberately modest no-downside option?
- What is the maximum acceptable real-world duration for a normal, elite, and
  boss fight with casting enabled?
- Which recovery valves are appropriate for young learners without weakening
  the high-stakes death promise?
- Should relics be character-specific at ordinary rarity, or should most early
  relics remain universal until multiple characters exist?

These questions affect future content details, but they do not block adopting
the method in this memo.

## 15. Caveats and assumptions

- This memo recommends structures and portfolio directions, not final balance.
- Counts are design targets for coverage and culling, not promises that every
  slot must ship.
- Current project documents and runtime are changing in an uncommitted
  worktree; this memo intentionally avoids rewriting their content.
- Community-maintained wiki details can change, especially for the sequel.
- No reference-game mechanic overrides the five product non-negotiables.
- Full casting, child comprehension, adult co-play, touch ergonomics, and
  persistent HP remain stronger constraints than fidelity to either Spire game.

## Sources

### Primary design and process

- [Mega Crit: Metrics Driven Design and Balance (GDC 2019)](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf)
- [Mega Crit developer interview on metrics and balance](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)
- [Mega Crit design interview: Road to the IGF](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)
- [Slay the Spire 2 Early Access page](https://store.steampowered.com/app/2868840/Slay_the_Spire_2/)
- [Mega Crit, April 2026 roadmap and metrics](https://www.megacrit.com/news/2026-4-17-neowsletter-issue-21/)
- [Mega Crit, May 2026 Doormaker decision and run metrics](https://www.megacrit.com/news/2026-5-22-neowsletter-issue-22/)
- [Mega Crit, June 2026 Bestiary update](https://www.megacrit.com/news/2026-6-19-neowsletter-issue-23/)
- [Mega Crit, July 2026 Aeonglass development](https://www.megacrit.com/news/2026-7-17-neowsletter-issue-24/)
- [Official Slay the Spire 2 announcements and patch notes](https://steamcommunity.com/app/2868840/announcements/)

### Released-game behavior references

- [Slay the Spire monsters](https://slaythespire.wiki.gg/wiki/Monsters)
- [Slay the Spire elites](https://slaythespire.wiki.gg/wiki/Elites)
- [Slay the Spire bosses](https://slaythespire.wiki.gg/wiki/Bosses)
- [Slay the Spire relics](https://slaythespire.wiki.gg/wiki/Relics)
- [Slay the Spire relic list](https://slaythespire.wiki.gg/wiki/Relics_List)
- [Slay the Spire 2 acts](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Main/Acts)
- [Slay the Spire 2 enemies](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Enemies)
- [Slay the Spire 2 elites](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Elites)
- [Slay the Spire 2 bosses](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Bosses)
- [Slay the Spire 2 relics](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Relics)
- [Slay the Spire 2 Ancients](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ancients)

### Project sources reviewed

- [DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md)
- [STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md)
- [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md)
- [RELIC_POTION_BIBLE.md](./RELIC_POTION_BIBLE.md)
- [DECK_DESIGN.md](./DECK_DESIGN.md)
- [BALANCE.md](./BALANCE.md)
- [ROADMAP.md](./ROADMAP.md)
