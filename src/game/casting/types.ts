export type CastingGateId = 'zhuyin' | 'english' | 'math';

export type CastMode = 'recognize' | 'listen' | 'listenHard';
/** `numberPad` and `build` are reserved attempt shapes. The cast screen does not render them yet. */
export type CastingInputMode = 'sequence' | 'singleChoice' | 'numberPad' | 'build';
export type VocabularyTier = 'core' | 'broad';
export type ToneClass = 1 | 2 | 3 | 4 | 5;
/** 1–4 follow card rarity. 5 is reserved for a future opt-in lesson. */
export type CastingTier = 1 | 2 | 3 | 4 | 5;

export interface CastBinding {
  gateId: CastingGateId;
  lessonFamilyId: string;
  displayGlyph: string;
  fallbackPromptIds?: string[];
  /** Binder metadata. The Zhuyin provider does not read it when creating a prompt. */
  tier?: CastingTier;
  /** Card family whose adaptive drop this prompt should update. */
  adaptiveFamily?: string;
  /** Grade-1 family used when a grade-2 binding is lowered below tier 5. */
  fallbackFamily?: string;
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

/**
 * Data-only picture a future cast screen can draw. Combat does not read it,
 * and Zhuyin prompts leave it unset.
 */
export type PromptPresentation =
  | { kind: 'tenFrame'; frames: Array<{ a: number; b: number }>; crossOut?: number }
  | { kind: 'beadString'; beads: number; groupedBy: 5 }
  | { kind: 'rods'; hundreds?: number; tens: number; ones: number }
  | { kind: 'objects'; emoji: string; count: number; crossOut?: number; groups?: number }
  | { kind: 'numberLine'; from: number; to: number; start?: number; jumps?: number[] }
  | { kind: 'clock'; hour: number; minute: number }
  | { kind: 'calendar'; month: number; days: number; circled?: number; today?: number }
  | { kind: 'timeOfDay'; period: 'morning' | 'noon' | 'afternoon' | 'night' }
  | { kind: 'coins'; coins: Array<1 | 5 | 10 | 50 | 100 | 500 | 1000> }
  | { kind: 'shapes'; items: Array<'circle' | 'triangle' | 'square' | 'rectangle' | 'ball' | 'can' | 'box'> }
  | { kind: 'ruler'; unit: 'block' | 'cm'; items: Array<{ emoji: string; start: number; length: number }> }
  | { kind: 'row'; items: string[]; from: 'left' | 'right' }
  | { kind: 'none' };

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
  presentation?: PromptPresentation;
  tier?: CastingTier;
  /** Card family for adaptivity. The lesson id above is the cell that was asked. */
  adaptiveFamily?: string;
  /** Set when this prompt is the one scaffolded retry for the combat. */
  retry?: boolean;
}

export interface CastingPromptContext {
  binding: CastBinding;
  mode: CastMode;
  fallbackCues: Array<{ word: string; emoji: string; spell: string }>;
  rng: () => number;
  /** Combat warmup. Clamped into the parent band by the math provider. */
  tierOverride?: CastingTier;
}

/** Opaque subject tag. The engine stores it and does not interpret the code. */
export interface CastingDiagnosis {
  code: string;
}

/**
 * One pluggable casting task. The game registry installs 注音 and 珠算.
 * `english` stays reserved until a task is registered for it.
 */
export interface CastingGateProvider {
  id: CastingGateId;
  createPrompt(context: CastingPromptContext): CastingPrompt;
  validate(prompt: CastingPrompt, attempt: string[]): boolean;
  diagnose?(prompt: CastingPrompt, attempt: string[]): CastingDiagnosis | null;
  /**
   * Optional mode picker for a non-Zhuyin task. 注音 keeps `chooseZhuyinMode`
   * so parent weights stay on the existing path.
   */
  chooseMode?(lessonFamilyId: string, rng: () => number): CastMode;
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
