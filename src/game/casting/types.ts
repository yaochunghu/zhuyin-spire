export type CastingGateId = 'zhuyin' | 'english' | 'math';

export type CastMode = 'recognize' | 'listen' | 'listenHard';
export type CastingInputMode = 'sequence' | 'singleChoice';
export type VocabularyTier = 'core' | 'broad';
export type ToneClass = 1 | 2 | 3 | 4 | 5;

export interface CastBinding {
  gateId: CastingGateId;
  lessonFamilyId: string;
  displayGlyph: string;
  fallbackPromptIds?: string[];
}

export interface CastingCue {
  text: string;
  emoji: string;
  speechText: string;
  /** Compatibility aliases used by the current reveal component. */
  word: string;
  spell: string;
}

export interface AmbientManaCue {
  id: 'clear' | 'echoing' | 'misty';
  icon: string;
  label: string;
}

/** Provider-neutral prompt rendered by the shared casting screen. */
export interface CastingPrompt {
  id: string;
  contentId: string;
  gateId: CastingGateId;
  lessonFamilyId: string;
  focusGlyph: string;
  inputMode: CastingInputMode;
  mode: CastMode;
  cue: CastingCue;
  answerTokens: string[];
  choiceTokens: string[];
  /** Compatibility aliases; new providers should prefer the neutral fields. */
  correctSpell: string;
  correctParts: string[];
  symbolBank: string[];
  correctionText: string;
  ambientMana: AmbientManaCue;
  speechFallback: boolean;
  createdAt: number;
}

export interface CastingPromptContext {
  binding: CastBinding;
  mode: CastMode;
  fallbackCues: Array<{ word: string; emoji: string; spell: string }>;
  rng: () => number;
}

export interface CastingGateProvider {
  id: CastingGateId;
  createPrompt(context: CastingPromptContext): CastingPrompt;
  validate(prompt: CastingPrompt, attempt: string[]): boolean;
}

export interface ModeWeights {
  recognize: number;
  listen: number;
  listenHard: number;
}

export interface CastingPreferences {
  packs: string[];
  vocabulary: 'coreOnly' | 'coreAndBroad';
  tones: ToneClass[];
  maxAnswerParts: 2 | 3 | 4;
  modeWeights: ModeWeights;
  distractorCount: 2 | 3 | 4;
  adaptive: boolean;
  includeWords: string[];
  excludeWords: string[];
}

export interface LessonProgress {
  attempts: number;
  correct: number;
  totalResponseMs: number;
  recentResults: boolean[];
  remainingAnswerKeys: string[];
  remainingPromptIdsByAnswer: Record<string, string[]>;
  lastAnswerKey: string | null;
  lastPromptId: string | null;
}

export interface CastingHistory {
  lessons: Record<string, LessonProgress>;
}
