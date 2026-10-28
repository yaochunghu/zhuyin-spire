# Casting gates

The casting gate is the educational price of playing a card. Combat commits the
card and spends its Energy first; the character then tries to pull the available
mana into the spell. A correct answer resolves the card. A wrong answer fizzles,
but the card and Energy remain spent. This rule is the same for every current or
future subject provider.

The small **魔力清澈／迴響／朦朧** label is atmosphere plus a readable cue for
the current prompt mode. It is not a resource, element, buff, or hidden modifier.
Player-facing combat currency remains **能量**.

## Runtime flow

```text
CharacterDef.castingGateId
          +
CardDef → getCardCastBinding()
          ↓
CastingGateProvider.createPrompt()
          ↓
shared cast screen → provider.validate()
          ↓
correct: card effects resolve | wrong: card fizzles
```

| File | Responsibility |
|------|----------------|
| `game/casting/types.ts` | Provider-neutral prompt, binding, preferences, and history contracts |
| `game/casting/registry.ts` | Game registry (注音 and 珠算) and `createCastingGateRegistry` for a test or future task |
| `game/casting/math/` | Grade-1 and opt-in grade-2 prompt generation, parent band, and adaptive drop |
| `game/casting/binding.ts` | `getCardCastBinding` target. Zhuyin families stay `initial:` / `vowel:`. Math bindings are `family@tier` and require `CardDef.cast` |
| `game/casting/input.ts` | Attempt model for `sequence`, `singleChoice`, `numberPad`, and `build` |
| `game/casting/zhuyinProvider.ts` | Phrase filtering, modes, token bank, shuffle bags, validation, coverage audit |
| `game/castCheck.ts` | Compatibility facade used by run state and older tests |
| `data/characters.ts` | Catalog and `selectPlayableFromCatalog`. The game passes `CHARACTERS` |
| `data/cards.ts` | Maps a card to its stable lesson family with `getCardCastBinding` |
| `ui/castView.ts` | Renders `sequence` and `singleChoice` only: speech, hint, and answer reveal |
| `game/profiles.ts` | Per-child curriculum, shuffle state, attempts, accuracy, response time, and per-character score |

`CastingPrompt` is deliberately subject-neutral. It carries stable content and
lesson ids, presentation cues, answer tokens, choice tokens, input style, ambient
mana cue, and creation time. Combat does not inspect the educational answer.

## Current Zhuyin provider

### Lesson families

- Most cards use `initial:<符號>`, such as `initial:ㄅ`.
- The sparse standalone ㄚ／ㄛ／ㄜ cards use `vowel:<符號>`. Their pool includes
  familiar consonant-plus-vowel syllables such as ㄅㄚ and ㄆㄛ, rather than
  repeating a tiny list of standalone-vowel words.
- Every prompt still asks for the complete first syllable, including ˊ／ˇ／ˋ／˙
  where applicable.

### Anti-repetition shuffle bag

Each child and lesson family owns a persistent two-level shuffle bag:

1. Shuffle the distinct correct spellings and draw every spelling once.
2. For words sharing that spelling, shuffle their prompt variants separately.
3. When a bag refills, avoid putting the previous answer first when at least two
   answers exist.

The remaining bag is stored in the learner profile, so starting a new run,
reloading, or closing the browser does not reset repetition protection. Changing
curriculum filters safely removes now-ineligible queued items.

### Run prompt stream

Each run stores `castSeed` and `castCounter`. Mode choice, bag refills, and the
distractor bank read that stream. The counter is how many draws this run has
already taken, and stable checkpoints store both numbers. Loading that
checkpoint together with the learner profile from the same moment replays the
following prompts. Bags stay on the learner, one map keyed by
`gateId:lessonFamilyId`. A save written before these fields loads with a new
seed and a counter of 0. Practice and event casts, including 注音神龕, draw from the same stream. The live shrine prompt is not stored, so reloading that question takes the next draw.

### Curriculum controls

Options exposes these parent controls per learner:

- topic packs;
- preschool core only, or core plus broad vocabulary;
- allowed tones;
- maximum answer length;
- number of distractor symbols;
- recognize, listen-with-picture, and listen-only weights;
- gentle adaptation;
- explicit include/exclude word lists.

Packs and vocabulary tier are independent. A familiar word can be core while
remaining in its useful topic pack. Gentle adaptation never changes Energy,
damage, or correctness: after repeated difficulty it only leans toward shorter
core prompts and reduces hard-listening frequency inside the parent's allowed
set.

Options rejects a filter if any obtainable live card would have zero valid
prompts. The runtime still has a verified card-cue fallback as a final defense
against corrupted or hand-edited storage.

### Authored coverage floor

Unit tests enforce the current minimum under the default preschool curriculum:

| Card group | Prompt variants | Distinct spellings |
|------------|----------------:|-------------------:|
| Starter ㄅ／ㄆ／ㄇ families | at least 24 | at least 12 |
| Every other live card | at least 16 | at least 8 |

These are repetition floors, not a claim that every word has completed an
educator review. New entries still need a familiar meaning, accurate first
syllable, useful emoji, and an intentional core/broad decision.

## Learner profiles and persistence

Up to four learner profiles are available from the title screen. Switching is
disabled after leaving the title so it cannot replace an active run or cast.
Each profile owns:

- its run save;
- tutorial enablement and completion;
- practice total, badges, clear status, and completed-run count;
- cumulative score and published-card progress for each character;
- curriculum preferences;
- attempts, accuracy, response time, recent results, and shuffle bags.

Volume and animation speed are device-global. Existing v1 settings, tutorial,
badges, practice totals, and the old run save migrate into the first learner.

| Storage key | Scope |
|-------------|-------|
| `zhuyin-spire-learner-profiles-v1` | All learner metadata, curricula, and learning history |
| `zhuyin-spire-run-v1:<profile-id>` | Stable-screen run save for one learner |
| `zhuyin-spire-run-v1` | First-profile migration mirror |
| `zhuyin-spire-game-settings-v1` | Global animation speed; legacy tutorial field retained for migration |
| `zhuyin-spire-vol` | Global volume |

Character progression is gameplay-only and remains separate from casting
accuracy. A terminal run banks score once from completed rooms, combat classes,
flawless elite/boss victories, and a full-victory bonus. Stable run checkpoints
carry the pending score counters; overwriting an unfinished run awards nothing.
The profile stores only cumulative per-character score. Card counts and unlock
stages are derived from each character's published pool, so future reviewed
waves can join score tiers without another profile migration. The current 共鳴武者 release exposes all 75 designs: 12 at score 0, 33 at 300,
54 at 1,000, and 75 at 2,000. Act I rewards stay on the nine-card teaching pool.

`setCharacterScore` writes one character id and copies every other id through.
`characterProgress` is the score namespace. On load, ids that are not in
`CHARACTERS` are dropped, so a future character's score appears only after that
id joins the catalog. Casting history is separate and stays one learner-wide
map keyed by `gateId:lessonFamilyId` (`zhuyin:initial:ㄅ`, later `math:add20@3`).
It is not copied per character. Practice still builds Zhuyin prompts from the
title screen.

A run save with an unknown `characterId` is rejected. A missing id on an
already started run still resumes as 共鳴武者 (`FIRST_CHARACTER_ID`). A
character-select save with a null id stays unselected.

## Input modes

`CastingInputMode` is `sequence`, `singleChoice`, `numberPad`, or `build`.
`applyCastingInput` is the shared attempt editor. The cast screen does not call
it yet, so 共鳴武者 play is unchanged.

| Mode | Commit | Attempt passed to `validate` | Screen today |
|------|--------|------------------------------|--------------|
| `sequence` | Ready when every slot is filled; the view submits, including its short pause | One token per slot, in order | Rendered |
| `singleChoice` | The tapped choice submits immediately | `[choice]` | Rendered. Every live math prompt uses three choices (`MATH_CHOICE_COUNT`) |
| `numberPad` | Explicit submit. Empty entry cannot submit. A second digit replaces a lone `0`. A fourth digit is ignored | One element per digit, such as `['1','3']` for 13 | Not rendered |
| `build` | Explicit submit. Empty tray cannot submit. Tray cap is 20 | Token ids in tap order. Removing one index drops that token | Not rendered |

Backspace updates the attempt before submit and never appears in the list
`validate` sees. `prompt.presentation` is an optional data-only picture
(ten-frame, coins, clock, and the other closed kinds). Zhuyin prompts leave
`presentation` and `tier` unset. Math prompts set `tier` and may set `retry`.

Zhuyin bindings include `tier` from card rarity (`basic` 1, `common` 2,
`uncommon` 3, `rare` 4). Zhuyin prompt creation ignores that field. A math
binding uses `family@tier`. 珠算武者 cards set `cast`. Tier 5 is used only for
倍數連拳 when Options has 二年級 on. With it off, that card asks its grade-1
fallback (`add100`). The `length` family is the same kind of later layer: it
asks 公分 only at tier 5, and no live card binds to it. 長尺掃 asks `compare`,
which stays inside 一年級.

## 珠算 provider

`mathProvider` is registered next to 注音. `english` is still reserved and the
registry throws for it. Practice stays on 注音. 珠算武者 does not enter the
注音 tutorial.

This slice answers every tier with three buttons. `numberPad` and `build` stay
unrendered. Prompts come from the run cast stream plus the parent band and the
card family's adaptive drop. Shuffle bags stay on the learner for 注音 and are
not used for math.

A wrong answer fizzles the card. Energy is already spent. One scaffolded
「再算一次」 is available per combat while `scaffoldedRetry` is on, which is
the default. The retry does not record a result and does not reveal the
correction. The second miss fizzles and then shows it. 💡 is still once per
combat. It blocks the retry only on the card whose answer it revealed before
the first attempt. A hint on an earlier card leaves the retry available. A
hint during the retry reveals the answer. The coach names whichever of those
states is actually open, and it does not promise a retry when
`scaffoldedRetry` is off.

A resolved prompt also appends one local `cast` event. Opening 再算一次 does
not. The event stores the gate, the asked family, the tier, and a response-time
bucket. It does not store the attempt. See [TELEMETRY.md](./TELEMETRY.md).

Rarity sets the nominal tier inside the parent floor and ceiling (defaults 1
and 4). Adaptivity only lowers that tier, by card family, at most 4 steps.
Two misses in the last five results of the cell just asked, with the newest
a miss, drop the family one step. Six hits in the last eight, with the newest
a hit, raise it one step back toward the nominal tier. Three misses in a row
this combat force the next prompt to tier 1 of that family, still inside the
parent floor. Ordinal has no tier 1, so that warm-up asks 湊十 at tier 1.
Grade-2 tier 5 ignores the grade-1 ceiling until a drop pulls it back inside.
That ceiling question is still open for Yao. What is built is option A: a
tier-5 prompt stays at tier 5 until an adaptive drop pulls it into the band.
The child never sees a grade label.

`mathCasting` and `mathInsights` are optional profile fields. A profile that
omits them keeps the defaults and does not get the fields written back.
Lesson history is still `math:<family>@<tier>`.

## Adding a future English character

Math is live. English is still a reserved id. To ship another subject:

1. Add and register a `CastingGateProvider`; do not add subject logic to combat.
2. Give every card in that character a stable `CastBinding` and lesson family.
   Math cards set `CardDef.cast` and call `getCardCastBinding(def, 'math', prefs)`.
3. Produce stable `contentId`s, answer/choice tokens, a correction string, and
   one shared input mode: `sequence`, `singleChoice`, `numberPad`, or `build`.
   Each mode's attempt shape is the table above. `castView` renders modes, not
   providers. `numberPad` and `build` still need a renderer before a live prompt
   may use them.
4. Add gate-specific profile preferences through a backward-compatible profile
   migration; do not reinterpret Zhuyin settings. Score for the new character
   goes in its own `characterProgress` key.
5. Keep the same wrong-answer card/Energy cost and the same unscaled teaching
   reveal unless the product rule is explicitly changed. Math's one scaffolded
   retry per combat is the exception above.
6. Add per-family coverage validation, shuffle-bag tests, answer-cost tests, and
   a complete tablet smoke path. Zhuyin coverage already ignores cards whose
   `cast.gateId` is not `zhuyin`.

The playtest `cast` event already accepts any `gateId` and `family` string.
This character records through that same event. Do not bump the export schema
for the new id. See [TELEMETRY.md](./TELEMETRY.md).

Do not couple “mana quality” to quiz difficulty mechanically. It is a narrative
explanation for randomized prompts, not a new combat economy.
