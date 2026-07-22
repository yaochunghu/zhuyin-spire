/**
 * Shared UI runtime — bound once from main.ts so view modules
 * can call render/run without circular imports of the full app.
 */

import type { CastMode } from '../game/castCheck';
import type { RunState } from '../game/state';

export const session = {
  /** Adult coach starts collapsed so it never covers kid UI (expand on demand). */
  coachCollapsed: true,
  /** Screen where phone coach initial visibility was last decided. */
  coachPhoneScreen: null as RunState['screen'] | null,
  phoneMenuOpen: false,
  deckViewerOpen: false,
  /** Map node select flash in progress */
  mapSelectBusy: false,
  /** Combat pile inspect: draw or discard (null = closed) */
  pileViewer: null as null | 'draw' | 'discard',
  combatFxPlaying: false,
  outcomeAnimPlaying: false,
  hintSpell: null as string | null,
  castLocked: false,
  spellAttempt: [] as string[],
  spellUsedBankIdx: [] as number[],
  castSpeechPlayedForOpen: false,
  goldSfxForPending: -1,
  autoSubmitTimer: undefined as number | undefined,
  floatTimer: undefined as number | undefined,
  flashTimer: undefined as number | undefined,
};

let _app: HTMLElement;
let _run: RunState;
let _render: () => void;
let _showFlash: (msg: string) => void;
let _appendCoach: (parent: HTMLElement, castMode?: CastMode) => void;
let _clearFloatSoon: () => void;
let _playOutcome: (
  kind: 'kill' | 'faint',
  opts: { emoji: string; isBoss?: boolean; isElite?: boolean },
  onDone: () => void,
) => void;
let _submitSpell: () => void;

export function bindUi(opts: {
  app: HTMLElement;
  run: RunState;
  render: () => void;
  showFlash: (msg: string) => void;
  appendCoach: (parent: HTMLElement, castMode?: CastMode) => void;
  clearFloatSoon: () => void;
  playOutcomeOverlay: (
    kind: 'kill' | 'faint',
    opts: { emoji: string; isBoss?: boolean; isElite?: boolean },
    onDone: () => void,
  ) => void;
  submitSpell: () => void;
}): void {
  _app = opts.app;
  _run = opts.run;
  _render = opts.render;
  _showFlash = opts.showFlash;
  _appendCoach = opts.appendCoach;
  _clearFloatSoon = opts.clearFloatSoon;
  _playOutcome = opts.playOutcomeOverlay;
  _submitSpell = opts.submitSpell;
}

export function app(): HTMLElement {
  return _app;
}

export function run(): RunState {
  return _run;
}

export function render(): void {
  _render();
}

export function showFlash(msg: string): void {
  _showFlash(msg);
}

export function appendCoach(parent: HTMLElement, castMode?: CastMode): void {
  _appendCoach(parent, castMode);
}

export function clearFloatSoon(): void {
  _clearFloatSoon();
}

export function playOutcomeOverlay(
  kind: 'kill' | 'faint',
  opts: { emoji: string; isBoss?: boolean; isElite?: boolean },
  onDone: () => void,
): void {
  _playOutcome(kind, opts, onDone);
}

export function submitSpell(): void {
  _submitSpell();
}
