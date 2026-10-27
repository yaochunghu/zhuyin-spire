import { ambientManaForMode } from '../zhuyinProvider';
import type { CastingGateProvider, CastingPrompt } from '../types';
import { generateMathQuestion, resolveMathTask } from './generate';
import { getMathAdaptiveDrop, getMathCastingPreferences } from '../../profiles';

export const mathProvider: CastingGateProvider = {
  id: 'math',
  chooseMode() {
    return 'recognize';
  },
  createPrompt(context): CastingPrompt {
    const prefs = getMathCastingPreferences();
    const cardFamily = context.binding.adaptiveFamily
      ?? context.binding.lessonFamilyId.split('@')[0]
      ?? 'count';
    const drop = getMathAdaptiveDrop(cardFamily);
    const task = resolveMathTask(context.binding, prefs, drop, context.tierOverride);
    const draft = generateMathQuestion(task.family, task.tier, context.rng);
    const lessonFamilyId = `${task.family}@${task.tier}`;
    return {
      id: `math-${Date.now()}`,
      contentId: `math:${lessonFamilyId}:${draft.question}:${draft.answer}`,
      gateId: 'math',
      lessonFamilyId,
      adaptiveFamily: task.cardFamily,
      focusGlyph: context.binding.displayGlyph,
      inputMode: 'singleChoice',
      mode: 'recognize',
      cue: {
        text: draft.question,
        emoji: draft.emoji,
        speechText: draft.question,
        word: draft.question,
        spell: draft.answer,
      },
      answerTokens: [draft.answer],
      choiceTokens: draft.choices,
      correctSpell: draft.answer,
      correctParts: [draft.answer],
      symbolBank: [...draft.choices],
      correctionText: `答案是 ${draft.answer}`,
      ambientMana: ambientManaForMode('recognize'),
      speechFallback: false,
      createdAt: Date.now(),
      tier: task.tier,
    };
  },
  validate(prompt, attempt) {
    return attempt[0] === prompt.correctSpell;
  },
};
