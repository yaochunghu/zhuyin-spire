# Upgrade Bible: card-instance and Smith design

> **Status:** design approval artifact; this file defines the intended upgrade
> contract but does not activate Smithing or change runtime saves.

The complete base-to-upgrade catalog lives in
[CARD_BIBLE.md](./CARD_BIBLE.md). Its **75 Echo Mage rows are 75 unique card
designs**; the upgraded faces do not add another 75 to the card count. The 12
Colorless cards also have one authored upgrade. Five Statuses and eight Curses
cannot be upgraded.

## Design goals

1. Make Smith versus Rest a meaningful, previewable choice.
2. Improve the card's main job without requiring the upgrade to make a bad base
   card functional.
3. Keep the full 注音 symbol and phrase difficulty unchanged when a card
   upgrades; the learner is upgrading combat value, not changing the lesson.
4. Preserve physical copies: upgrading one duplicate never upgrades its twins.
5. Follow StS's one-authored-step pattern, with one deliberately named
   repeat-upgrade exception.

## Data contract for later implementation

```ts
interface DeckCardV2 {
  uid: string;
  defId: string;
  upgradeLevel: number;
}

interface CardUpgradeDef {
  cost?: number | 'X';
  effects?: EffectDef[];
  addKeywords?: CardKeyword[];
  removeKeywords?: CardKeyword[];
  description: string;
  repeatable?: {
    effectPath: string;
    amountPerLevel: number;
  };
}
```

- `uid` identifies the owned physical copy. All reward, shop, Smith, removal,
  deck-viewer, and combat-pile actions operate on this value.
- `defId` remains stable across base and upgraded states. Never create a second
  definition such as `bo_plus`.
- `upgradeLevel` is a non-negative integer. For ordinary collectible cards its
  legal permanent values are 0 or 1. For `em_r_a01` 層層共鳴, every integer is
  legal.
- Runtime values are obtained by applying the authored upgrade to the base
  definition. Description text is rendered from the same resolved effect data,
  so preview and combat cannot disagree.
- A future combat instance may additionally hold `temporaryUpgradeLevels`.
  Temporary levels are never written into `DeckCardV2`.

### Save migration contract

When this layer is implemented, migrate the current ordered `string[]` deck to
ordered `DeckCardV2[]`:

1. Preserve every entry and its order, including duplicate IDs.
2. Generate a unique stable `uid` for each entry.
3. Set every migrated `upgradeLevel` to 0.
4. Make migration idempotent; an already-versioned deck is not regenerated.
5. If a definition is unknown, reject the save through the existing safe-load
   path instead of silently deleting the card.

## Authored upgrade rules

- Every Basic, Common, Uncommon, Rare, and collectible Special card has exactly
  one authored upgrade, except the named repeat-upgrade card.
- Status and Curse definitions have no upgrade object and can never be selected
  by Smith, reward-upgrade, temporary-upgrade, or relic-upgrade effects.
- A normal upgrade should change one main axis:
  - increase the primary number;
  - reduce Energy cost;
  - improve a keyword or remove Exhaust;
  - improve a selection limit, cap, or destination;
  - make one coherent functional change.
- Numerical upgrades generally add about 25–50% effective value. Smaller
  percentages are acceptable on multi-target, multi-hit, Energy, draw, or
  multiplicative effects.
- Basic upgrades remain numerical and easy to read. Commons usually improve
  immediate output or reliability. Uncommons may strengthen package glue.
  Rares may change cost, recurrence, limits, or another rule.
- Do not increase cost as part of an upgrade. Do not add an unrelated drawback.
- An upgrade may remove Exhaust only when repeated use is the intended reward;
  it must not accidentally create a zero-cost draw/Energy loop.
- Upgrade changes render in green in adult/detail views and with a clear `+` on
  the child-facing card. Color is supplemental: changed values also receive a
  textual before/after comparison.

## Locked anchor upgrades (current 12 designs)

These twelve base effects and upgrades were approved before the rest of the
catalog. Implementation must treat them as regression anchors.

| ID | Card | Type | Base | Upgraded |
|---|---|---|---|---|
| `bo` | 音波擊 | Attack | 1 Energy: deal 3. | 1 Energy: deal 5. |
| `mo` | 音波盾 | Skill | 1 Energy: gain 4 Block. | 1 Energy: gain 6 Block. |
| `po` | 共鳴震 | Attack | 2 Energy: deal 5; apply Echo 2. | 2 Energy: deal 7; apply Echo 2. |
| `ge` | 響亮一擊 | Attack | 1 Energy: deal 6. | 1 Energy: deal 8. |
| `ri` | 日光音波 | Attack | 1 Energy: deal 3 to all enemies. | 1 Energy: deal 4 to all enemies. |
| `ke` | 厚實音牆 | Skill | 1 Energy: gain 7 Block. | 1 Energy: gain 9 Block. |
| `te` | 雙拍連擊 | Attack | 1 Energy: deal 2 twice. | 1 Energy: deal 3 twice. |
| `he` | 回音針 | Attack | 1 Energy: deal 2; apply Echo 2. | 1 Energy: deal 3; apply Echo 3. |
| `shi` | 共鳴護唱 | Power | 1 Energy: Echo triggers grant 2 Block this combat. | Trigger Block becomes 3. |
| `le` | 翻譜 | Skill | 1 Energy: draw 2. | 1 Energy: draw 3. |
| `yi` | 深呼吸 | Skill | 0 Energy: gain 1 Energy; Exhaust. | Gain 1 Energy; draw 1; Exhaust. |
| `fo` | 邊擋邊唱 | Skill | 1 Energy: gain 3 Block; draw 1. | Gain 5 Block; draw 1. |

The conversion of `mo` and `ke` from the obsolete Block type to Skill does not
change their effects. `shi` becomes a true Power: a successful cast enters the
active-Power area and leaves ordinary draw/discard circulation.

## Upgrade sources and precedence

### 1. Smithing — permanent selected-copy upgrade

- A rest site offers **Rest** or **Smith**. Free campfire removal leaves the
  standard flow; card removal remains a shop or authored-event service.
- Smith opens the exact-copy deck viewer. Every duplicate is shown separately
  with its own `uid`; no `×N` grouping is allowed.
- Cards that cannot gain another permanent level are visible but disabled.
  If the deck has no eligible card, the Smith action itself is disabled.
- Selecting a card opens a base/current → result preview. The player confirms
  before the room is consumed.
- Confirmation increments only the selected card's permanent level, saves the
  run, and returns to the completed rest-site state. Closing or cancelling the
  preview changes nothing and does not consume the room.
- Rest remains 40% maximum HP. Smith never also heals.

### 2. Already-upgraded rewards and shop cards

- The upgraded roll belongs to each generated card instance, not its
  definition. A successful roll creates that offered copy at level 1.
- Initial authored chance by act is:

  | Act | Chance that an eligible offered card is upgraded |
  |---|---:|
  | I | 0% |
  | II | 25% |
  | III | 50% |

- Difficulty level 12 halves those chances to 0%, 12.5%, and 25%.
- Roll once when the offer is generated and serialize the result; reopening a
  reward or shop must not reroll it.
- Basic, Status, Curse, and cards without a legal first upgrade are ineligible.
  An authored event, relic, or boss rule may explicitly override act chance.
- Buying or choosing the card preserves the offered upgrade level. Skipping or
  leaving does not affect another copy of the same definition.

### 3. Temporary combat upgrades

- A temporary-upgrade effect targets one eligible combat card instance and adds
  one temporary level for the current combat only.
- An ordinary card already at its authored maximum is not eligible. A level-0
  ordinary card may temporarily resolve as level 1.
- A permanently upgraded ordinary card never resolves above level 1.
- 層層共鳴 may receive temporary levels beyond its permanent level; those levels
  add to its damage only until combat ends.
- Temporary state follows the combat card through hand, draw, discard, Exhaust,
  or active-Power areas and is visible in every pile viewer.
- Victory, defeat, restart, abandonment, and returning to map discard all
  temporary levels. No combat effect mutates the saved deck copy.

### 4. Relic-granted permanent upgrades

- A relic may permanently upgrade a newly acquired card only when its authored
  trigger explicitly matches that card's type or source.
- Resolution order is: generate the offered instance and its reward-upgrade
  roll → player acquires it → apply eligible acquisition relics in relic-list
  order → save the final instance.
- For ordinary cards, multiple sources stop at level 1; unused extra triggers do
  not transfer to another card. 層層共鳴 may receive every valid level.
- A relic that upgrades a random existing card chooses uniformly from eligible
  `uid`s using the saved gameplay RNG. It never treats duplicate definitions as
  one entry.
- Relic previews must state whether the upgrade applies to current cards, newly
  acquired cards, or a specific card type. Hidden exceptions are not allowed.

## The repeat-upgrade exception

`em_r_a01` **層層共鳴** is the only repeat-upgrade card in this approved pool:

- Base: 2 Energy, deal 6.
- Every permanent or temporary level adds exactly 2 damage.
- Resolved damage is `6 + (2 × totalUpgradeLevels)`.
- Display is unadorned at level 0, `+` at level 1, and `+N` at level 2 or above.
- Smith always considers it eligible. Reward generation can only offer it at
  level 0 or 1; higher permanent levels require Smith, relic, or authored-event
  effects after acquisition.
- Designer telemetry records permanent level, temporary level, cast success,
  actual damage, and encounter separately so its uncapped ceiling is reviewable.

No future repeat-upgrade card should be added without revising this bible and
the uniqueness validator.

## Preview and viewer behavior

- Current Deck displays the resolved current face of every physical copy.
- Selecting an unupgraded card shows base and `+` side by side. Selecting an
  upgraded ordinary card shows its base and current face. 層層共鳴 shows current
  and next level.
- The Designer Library always exposes base and authored upgrade, including
  locked cards, plus derived change summaries such as `damage 6 → 8 (+33%)`.
- Combat pile and hand inspection includes both permanent and temporary level;
  a temporary contribution receives a distinct “本場戰鬥” label.
- Upgrading never changes name, stable illustration, owner, rarity, type,
  target, symbol, phrase pool, or unlock tier unless the exact row in
  [CARD_BIBLE.md](./CARD_BIBLE.md) explicitly says otherwise. The approved table
  currently changes none of those identity fields.
- Speech and the successful spelling reveal use the same phrase and normal
  learning speed for base and upgraded cards.

## Balance review rules

For each base/upgrade pair, record during playtests:

- offer-relative pick and Smith rates;
- damage dealt or Block actually consumed per draw, Energy, and successful cast;
- times held, exhausted, or left unplayed;
- cast accuracy and response time by phrase difficulty;
- Power trigger count and turns until setup cost is repaid;
- encounter length and HP loss with the base versus upgraded copy;
- repeat-upgrade level and marginal damage for 層層共鳴.

Raw percentage improvement is a warning signal, not an automatic verdict.
Multi-hit scaling, all-enemy output, draw, Energy, cost reductions, Exhaust
removal, and multiplicative Echo effects need contextual review. Because a
failed full-注音 cast pays Energy without resolving the effect, evaluate pure
combat values both with debug cast-skip and with authentic learner accuracy.

## Validation contract

Automated content validation must fail when any of these conditions is false:

1. The Echo Mage catalog has exactly 75 unique IDs and audits to 3 Basic,
   20 Common, 35 Uncommon, 17 Rare; and 28 Attacks, 35 Skills, 12 Powers.
2. Colorless has exactly 12 unique IDs: 6 Uncommon and 6 Rare.
3. Every one of those 87 collectible definitions has a legal authored upgrade.
4. The five Status and eight Curse definitions have no upgrade.
5. Every ordinary collectible resolves at only level 0 or 1; only
   `em_r_a01` is tagged repeatable.
6. All upgrade effect references, keyword changes, targets, caps, and selection
   limits resolve to supported typed operations.
7. Every card instance has a unique `uid`; duplicate `defId`s remain distinct.
8. Upgrade preview data deep-equals the values used by combat resolution.
9. Smith changes only the selected instance, consumes the room only after
   confirmation, and remains disabled with no eligible card.
10. Reward/shop upgrade rolls are deterministic from saved RNG and do not
    reroll when a screen is reopened.
11. Temporary upgrades never alter the saved run deck and are removed at every
    combat exit.
12. Acquisition relics respect eligibility, ordering, ordinary-card caps, and
    the repeatable exception.
13. An upgraded Power activates at its upgraded value, leaves ordinary piles on
    success, and discards at base Energy cost on a failed cast.
14. At all supported tablet viewports, base/upgrade text fits the fixed card
    frame and the before/after preview keeps 64px primary targets.

Required regression scenarios include two duplicate 音波擊 cards where only one
is Smithed, an already-upgraded reward reopened from save, a temporary upgrade
that crosses pile boundaries, stacked permanent/temporary levels on 層層共鳴,
and a 1-Energy upgraded defensive Skill that leaves the correct Energy and does
not lock otherwise affordable cards.

## Approval boundary

This document and [CARD_BIBLE.md](./CARD_BIBLE.md) approve the proposed design
contract and exact initial numbers for implementation in reviewed waves. They do
not claim those numbers are finally balanced. Any post-playtest number change
must update the card table, generated rules text, relevant deterministic test,
and changelog together.
