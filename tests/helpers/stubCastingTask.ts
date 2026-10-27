/**
 * Test-only casting task for the reserved `math` gate.
 * The game registry does not import this file, and no screen renders it.
 */
import type {
  CastBinding,
  CastingGateProvider,
  CastingPrompt,
  CastingPromptContext,
} from '../../src/game/casting/types';

function familyOf(binding: CastBinding): string {
  return binding.lessonFamilyId.split('@')[0] ?? binding.lessonFamilyId;
}

function finishPrompt(
  context: CastingPromptContext,
  fields: Pick<CastingPrompt, 'inputMode' | 'correctSpell' | 'answerTokens' | 'choiceTokens' | 'presentation'>,
): CastingPrompt {
  return {
    id: `stub:${context.binding.lessonFamilyId}`,
    contentId: `stub:${context.binding.lessonFamilyId}`,
    gateId: 'math',
    lessonFamilyId: context.binding.lessonFamilyId,
    focusGlyph: context.binding.displayGlyph,
    inputMode: fields.inputMode,
    mode: context.mode,
    cue: {
      text: fields.correctSpell,
      word: fields.correctSpell,
      emoji: '🧮',
      speechText: fields.correctSpell,
      spell: fields.correctSpell,
    },
    answerTokens: fields.answerTokens,
    choiceTokens: fields.choiceTokens,
    correctSpell: fields.correctSpell,
    correctParts: [...fields.answerTokens],
    symbolBank: [...fields.choiceTokens],
    correctionText: fields.correctSpell,
    ambientMana: { id: 'clear', icon: '✨', label: '魔力清澈' },
    speechFallback: false,
    createdAt: 1_000,
    presentation: fields.presentation,
    tier: context.binding.tier,
  };
}

export const stubMathCastingTask: CastingGateProvider = {
  id: 'math',
  chooseMode(): 'recognize' {
    return 'recognize';
  },
  createPrompt(context): CastingPrompt {
    const family = familyOf(context.binding);
    if (family === 'choice') {
      return finishPrompt(context, {
        inputMode: 'singleChoice',
        correctSpell: '5',
        answerTokens: ['5'],
        choiceTokens: ['4', '5', '6'],
        presentation: { kind: 'none' },
      });
    }
    if (family === 'tray') {
      return finishPrompt(context, {
        inputMode: 'build',
        correctSpell: '23',
        answerTokens: ['23'],
        choiceTokens: ['1', '5', '10'],
        presentation: { kind: 'coins', coins: [10, 10, 1, 1, 1] },
      });
    }
    return finishPrompt(context, {
      inputMode: 'numberPad',
      correctSpell: '13',
      answerTokens: ['1', '3'],
      choiceTokens: [],
      presentation: { kind: 'tenFrame', frames: [{ a: 8, b: 5 }] },
    });
  },
  validate(prompt, attempt): boolean {
    if (prompt.inputMode === 'singleChoice') {
      return attempt.length === 1 && attempt[0] === prompt.correctSpell;
    }
    if (prompt.inputMode === 'numberPad') return attempt.join('') === prompt.correctSpell;
    if (prompt.inputMode === 'build') {
      const sum = attempt.reduce((total, token) => total + Number(token), 0);
      return attempt.length > 0 && sum === Number(prompt.correctSpell);
    }
    return false;
  },
  diagnose(prompt, attempt) {
    return stubMathCastingTask.validate(prompt, attempt) ? null : { code: 'mismatch' };
  },
};
