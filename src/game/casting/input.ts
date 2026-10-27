import type { CastingInputMode } from './types';

/** Locked future math default. Zhuyin sequence prompts do not use this count. */
export const THREE_CHOICE_COUNT = 3;
export const NUMBER_PAD_MAX_DIGITS = 3;
export const BUILD_TRAY_CAP = 20;

export type CastingInputCommit = 'onChoice' | 'readyWhenFull' | 'explicitSubmit';

export interface CastingInputModeSpec {
  id: CastingInputMode;
  commit: CastingInputCommit;
  /** Present for singleChoice. A prompt may carry a different choice count. */
  defaultChoiceCount?: number;
}

export const CASTING_INPUT_SPECS: Record<CastingInputMode, CastingInputModeSpec> = {
  sequence: { id: 'sequence', commit: 'readyWhenFull' },
  singleChoice: {
    id: 'singleChoice',
    commit: 'onChoice',
    defaultChoiceCount: THREE_CHOICE_COUNT,
  },
  numberPad: { id: 'numberPad', commit: 'explicitSubmit' },
  build: { id: 'build', commit: 'explicitSubmit' },
};

export interface CastingInputState {
  mode: CastingInputMode;
  /** Tokens `validate` will see. Backspace never remains in this list. */
  attempt: readonly string[];
  submitted: boolean;
}

export type CastingInputAction =
  | { type: 'choose'; value: string }
  | { type: 'appendSymbol'; symbol: string }
  | { type: 'digit'; digit: string }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'addToken'; id: string }
  | { type: 'removeToken'; index: number }
  | { type: 'submit' };

export interface CastingInputLimits {
  /** Sequence length that makes the attempt ready. */
  slotCount?: number;
  /** When set, a choice outside this list is ignored. */
  choices?: readonly string[];
  maxDigits?: number;
  trayCap?: number;
}

export function createCastingInput(mode: CastingInputMode): CastingInputState {
  return { mode, attempt: [], submitted: false };
}

export function canSubmitCastingInput(
  state: CastingInputState,
  limits: CastingInputLimits = {},
): boolean {
  if (state.submitted) return false;
  switch (state.mode) {
    case 'singleChoice':
      return false;
    case 'sequence':
      return limits.slotCount !== undefined && state.attempt.length === limits.slotCount;
    case 'numberPad':
    case 'build':
      return state.attempt.length > 0;
    default: {
      const unreachable: never = state.mode;
      return unreachable;
    }
  }
}

export function submittedCastingAttempt(state: CastingInputState): readonly string[] | null {
  return state.submitted ? state.attempt : null;
}

/**
 * Pure attempt editor for every input mode. The cast screen still edits
 * 注音 sequence and single-choice attempts itself; this model is the shared
 * contract a future number pad and three-choice row will call.
 */
export function applyCastingInput(
  state: CastingInputState,
  action: CastingInputAction,
  limits: CastingInputLimits = {},
): CastingInputState {
  if (state.submitted) return state;
  switch (action.type) {
    case 'choose':
      return applyChoice(state, action.value, limits);
    case 'appendSymbol':
      return applySymbol(state, action.symbol, limits);
    case 'digit':
      return applyDigit(state, action.digit, limits.maxDigits ?? NUMBER_PAD_MAX_DIGITS);
    case 'backspace':
      return dropLast(state);
    case 'clear':
      return state.attempt.length === 0 ? state : { ...state, attempt: [] };
    case 'addToken':
      return addBuildToken(state, action.id, limits.trayCap ?? BUILD_TRAY_CAP);
    case 'removeToken':
      return removeBuildToken(state, action.index);
    case 'submit':
      return canSubmitCastingInput(state, limits) ? { ...state, submitted: true } : state;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

function applyChoice(
  state: CastingInputState,
  value: string,
  limits: CastingInputLimits,
): CastingInputState {
  if (state.mode !== 'singleChoice' || value.length === 0) return state;
  if (limits.choices && !limits.choices.includes(value)) return state;
  return { ...state, attempt: [value], submitted: true };
}

function applySymbol(
  state: CastingInputState,
  symbol: string,
  limits: CastingInputLimits,
): CastingInputState {
  if (state.mode !== 'sequence' || symbol.length === 0) return state;
  if (limits.slotCount !== undefined && state.attempt.length >= limits.slotCount) return state;
  return { ...state, attempt: [...state.attempt, symbol] };
}

function applyDigit(
  state: CastingInputState,
  digit: string,
  maxDigits: number,
): CastingInputState {
  if (state.mode !== 'numberPad' || !/^[0-9]$/.test(digit)) return state;
  if (state.attempt.length === 1 && state.attempt[0] === '0') {
    if (digit === '0') return state;
    return { ...state, attempt: [digit] };
  }
  if (state.attempt.length >= maxDigits) return state;
  return { ...state, attempt: [...state.attempt, digit] };
}

function dropLast(state: CastingInputState): CastingInputState {
  if (state.mode === 'singleChoice' || state.attempt.length === 0) return state;
  return { ...state, attempt: state.attempt.slice(0, -1) };
}

function addBuildToken(
  state: CastingInputState,
  id: string,
  trayCap: number,
): CastingInputState {
  if (state.mode !== 'build' || id.length === 0 || state.attempt.length >= trayCap) return state;
  return { ...state, attempt: [...state.attempt, id] };
}

function removeBuildToken(state: CastingInputState, index: number): CastingInputState {
  if (state.mode !== 'build') return state;
  if (!Number.isInteger(index) || index < 0 || index >= state.attempt.length) return state;
  return {
    ...state,
    attempt: state.attempt.filter((_, tokenIndex) => tokenIndex !== index),
  };
}
