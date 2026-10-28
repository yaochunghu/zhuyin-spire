/**
 * Debug-page hook for the child-error model.
 *
 * Loaded only from the dev/QA branch in `main.ts`. Production builds do not
 * import this file. `?childModel` does nothing unless `?debug` is set too.
 */

import {
  childDecisionSeed,
  childModelFromSearch,
  createChildRng,
  resolveModelCast,
} from './childModel';
import { isDebugEnabled } from './debugFlags';
import { markSyntheticPlaytest } from '../game/playtestTelemetry';
import type { RunState } from '../game/state';

interface ChildModelDebugApi {
  personaId: string;
  seed: number;
  zhuyinP: number;
  answerCast: () => 'success' | 'fizzle' | 'retry' | 'idle';
}

interface ChildModelGate {
  installed: boolean;
}

declare global {
  interface Window {
    __zsDebug?: ChildModelDebugApi;
    __zsChildModelGate?: ChildModelGate;
  }
}

export function installChildModelBridge(getRun: () => RunState): void {
  if (typeof window === 'undefined') return;
  const gate: ChildModelGate = { installed: false };
  window.__zsChildModelGate = gate;
  window.dispatchEvent(new CustomEvent('zhuyin-child-model-ready'));
  if (!isDebugEnabled()) return;
  const request = childModelFromSearch(window.location.search);
  if (!request) return;
  markSyntheticPlaytest();
  const rng = createChildRng(childDecisionSeed(request.seed));
  gate.installed = true;
  window.__zsDebug = {
    personaId: request.persona.id,
    seed: request.seed,
    zhuyinP: request.persona.zhuyinP,
    answerCast: () => resolveModelCast(getRun(), request.persona, rng),
  };
}
