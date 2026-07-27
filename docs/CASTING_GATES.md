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
| `game/casting/registry.ts` | Registered gate providers; currently only `zhuyin` |
| `game/casting/zhuyinProvider.ts` | Phrase filtering, modes, token bank, shuffle bags, validation, coverage audit |
| `game/castCheck.ts` | Compatibility facade used by run state and older tests |
| `data/characters.ts` | Chooses a character's gate with `castingGateId` |
| `data/cards.ts` | Maps a card to its stable lesson family with `getCardCastBinding` |
| `ui/castView.ts` | Shared sequence/single-choice renderer, speech, hint, and answer reveal |
| `game/profiles.ts` | Per-child curriculum, shuffle state, attempts, accuracy, and response time |

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

## Adding a future English or math character

English and math are reserved ids, not live providers. To ship one:

1. Add and register a `CastingGateProvider`; do not add subject logic to combat.
2. Give every card in that character a stable `CastBinding` and lesson family.
3. Produce stable `contentId`s, answer/choice tokens, a correction string, and
   either `sequence` or `singleChoice` input.
4. Add gate-specific profile preferences through a backward-compatible profile
   migration; do not reinterpret Zhuyin settings.
5. Keep the same wrong-answer card/Energy cost and the same unscaled teaching
   reveal unless the product rule is explicitly changed.
6. Add per-family coverage validation, shuffle-bag tests, answer-cost tests, and
   a complete tablet smoke path.

Do not couple “mana quality” to quiz difficulty mechanically. It is a narrative
explanation for randomized prompts, not a new combat economy.
