/**
 * Seeded save/replay harness. Test-only.
 *
 * Map generation, the event-track seed, and `castSeed` still read `Math.random`
 * and `crypto.getRandomValues`. This harness replaces both with one
 * deterministic stream. Deck, reward, shop, gold, relic, potion, and upgrade
 * rolls use the run's saved streams, so a fresh page boot can spend an extra
 * cast-seed draw and still resume those rolls. Checkpoints stay schema v4.
 */

import { getCard } from '../../src/data/cards';
import type { PlayableCharacterId } from '../../src/data/characters';
import type { ActMap } from '../../src/data/map';
import { setDebugSkipCast } from '../../src/debug/debugFlags';
import { canPlay } from '../../src/game/combat';
import { getActiveProfile } from '../../src/game/profiles';
import {
  applySnapshot,
  parseSnapshot,
  resumeSavedRun,
  saveRunCheckpoint,
  snapshotRun,
  type RunSnapshot,
} from '../../src/game/save';
import {
  answerCast,
  answerEventShrine,
  applyRestHeal,
  chooseEventChoice,
  confirmEventChoice,
  continueEventResult,
  createNewRun,
  debugFinishFight,
  declinePendingPotion,
  getAvailableMapNodes,
  leaveShop,
  pickCharacter,
  pickReward,
  playerEndTurn,
  potionOfferBlocksReward,
  selectMapNode,
  startRun,
  tryPlayCard,
  type RunState,
} from '../../src/game/state';

export const FIXTURE_SCREENS = ['map', 'shop', 'event', 'reward', 'actClear'] as const;
export type FixtureScreen = (typeof FIXTURE_SCREENS)[number];

export const SAVE_FIXTURE_DIR = 'tests/fixtures/saves';
export const REPLAY_FIXTURE_DIR = 'tests/fixtures/replays';

/** First seed the generator tries. Later seeds are used only when a map cannot host every screen. */
export const FIXTURE_SEED_START = 0x4501;
export const FIXTURE_SEED_ATTEMPTS = 48;

export type ReplayChoice =
  | { op: 'saveLoad' }
  | { op: 'select'; nodeId: string }
  | { op: 'play'; defId: string }
  | { op: 'answer' }
  | { op: 'endTurn' }
  | { op: 'winFight' }
  | { op: 'declinePotion' }
  | { op: 'pickReward'; index: number | null }
  | { op: 'leaveShop' }
  | { op: 'chooseEvent'; choiceId: string }
  | { op: 'confirmEvent' }
  | { op: 'continueEvent' }
  | { op: 'restHeal' };

export interface ReplayLog {
  seed: number;
  characterId: PlayableCharacterId;
  choices: ReplayChoice[];
}

export interface PromptSignature {
  castCounter: number;
  contentId: string;
  mode: string;
  gateId: string;
  lessonFamilyId: string;
  cue: string;
  answerTokens: string[];
  choiceTokens: string[];
}

/** Stable screens compare the checkpoint. Combat is not saved, so only the live hand is traced there. */
export type ReplayTrace =
  | { kind: 'checkpoint'; snap: RunSnapshot }
  | {
      kind: 'live';
      screen: string;
      heroHp: number;
      gold: number;
      castSeed: number;
      castCounter: number;
      activeNodeId: string | null;
      hand: string[] | null;
      drawPile: string[] | null;
      tutorialStep: string | null;
      eventCursor: number;
      resolutions: RunState['eventTrack']['resolutions'];
      prompt: PromptSignature | null;
    };

export interface ReplayResult {
  traces: ReplayTrace[];
  prompts: PromptSignature[];
  finalSnapshot: RunSnapshot | null;
}

export interface RecordedReplay extends ReplayLog {
  snapshots: Partial<Record<FixtureScreen, RunSnapshot>>;
  prompts: PromptSignature[];
  finalSnapshot: RunSnapshot;
}

export type SaveLoadMode = 'off' | 'resume' | 'boot';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

export function installMemoryStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** One stream feeds both Math.random and crypto.getRandomValues. */
export function withSeed<T>(seed: number, body: () => T): T {
  const next = mulberry32(seed);
  const originalRandom = Math.random;
  const replacement = ((array: ArrayBufferView) => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    let index = 0;
    while (index < bytes.length) {
      const value = next();
      bytes[index] = value & 0xff;
      index += 1;
      if (index < bytes.length) {
        bytes[index] = (value >>> 8) & 0xff;
        index += 1;
      }
      if (index < bytes.length) {
        bytes[index] = (value >>> 16) & 0xff;
        index += 1;
      }
      if (index < bytes.length) {
        bytes[index] = (value >>> 24) & 0xff;
        index += 1;
      }
    }
    return array;
  }) as typeof crypto.getRandomValues;

  Math.random = () => next() / 0x1_0000_0000;
  const restoreCrypto = installGetRandomValues(replacement);
  try {
    return body();
  } finally {
    Math.random = originalRandom;
    restoreCrypto();
  }
}

function installGetRandomValues(value: typeof crypto.getRandomValues): () => void {
  const own = Object.getOwnPropertyDescriptor(crypto, 'getRandomValues');
  crypto.getRandomValues = value;
  return () => {
    if (own) {
      Object.defineProperty(crypto, 'getRandomValues', own);
      return;
    }
    // The platform method lives on the prototype. Drop the own stub.
    Reflect.deleteProperty(crypto, 'getRandomValues');
  };
}

function resetLearner(): void {
  installMemoryStorage();
  localStorage.clear();
  setDebugSkipCast(false);
  // Profile ids use crypto.randomUUID. Create the learner before the seeded stream.
  getActiveProfile();
}

function normalize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function fixtureFileName(characterId: PlayableCharacterId, screen: FixtureScreen): string {
  return `${characterId}-${screen}.json`;
}

export function replayFileName(characterId: PlayableCharacterId): string {
  return `${characterId}.json`;
}

function promptSignature(state: RunState): PromptSignature | null {
  const prompt = state.cast?.prompt;
  if (!prompt) return null;
  return {
    castCounter: state.castCounter,
    contentId: prompt.contentId,
    mode: prompt.mode,
    gateId: prompt.gateId,
    lessonFamilyId: prompt.lessonFamilyId,
    cue: prompt.cue.text,
    answerTokens: [...prompt.answerTokens],
    choiceTokens: [...prompt.choiceTokens],
  };
}

export function replayTrace(state: RunState): ReplayTrace {
  // finishFight leaves the combat object attached on the reward screen.
  // Resume drops it. The checkpoint never included it.
  const snap = snapshotRun(state);
  if (snap) return { kind: 'checkpoint', snap: normalize(snap) };
  return normalize({
    kind: 'live',
    screen: state.screen,
    heroHp: state.heroHp,
    gold: state.gold,
    castSeed: state.castSeed,
    castCounter: state.castCounter,
    activeNodeId: state.activeNodeId,
    hand: state.combat ? state.combat.hand.map((card) => card.defId) : null,
    drawPile: state.combat ? state.combat.drawPile.map((card) => card.defId) : null,
    tutorialStep: state.tutorial?.step ?? null,
    eventCursor: state.eventTrack.cursor,
    resolutions: state.eventTrack.resolutions,
    prompt: promptSignature(state),
  });
}

export function canonicalSnapshot(state: RunState): RunSnapshot {
  const snap = snapshotRun(state);
  if (!snap) throw new Error(`No v4 checkpoint for screen ${state.screen}`);
  const parsed = parseSnapshot(JSON.parse(JSON.stringify(snap)) as unknown);
  if (!parsed) throw new Error(`Checkpoint on ${state.screen} failed the real save parser`);
  return parsed;
}

export function assertSnapshotRoundTrip(snapshot: RunSnapshot): RunSnapshot {
  const parsed = parseSnapshot(JSON.parse(JSON.stringify(snapshot)) as unknown);
  if (!parsed) throw new Error(`Parser rejected a ${snapshot.screen} checkpoint`);
  const state = createNewRun();
  applySnapshot(state, parsed);
  const again = snapshotRun(state);
  if (!again) throw new Error(`Reloaded ${snapshot.screen} is not a stable screen`);
  const left = JSON.stringify(again);
  const right = JSON.stringify(parsed);
  if (left !== right) {
    throw new Error(`Round trip changed ${snapshot.screen}: ${summarizeJsonDiff(parsed, again)}`);
  }
  return again;
}

export function summarizeJsonDiff(left: unknown, right: unknown): string {
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])];
  const lines: string[] = [];
  for (const key of keys) {
    const av = JSON.stringify(a?.[key]);
    const bv = JSON.stringify(b?.[key]);
    if (av === bv) continue;
    const short = (value: string | undefined) => (value && value.length > 180 ? `${value.slice(0, 180)}…` : value);
    lines.push(`${key}: ${short(av)} => ${short(bv)}`);
    if (lines.length >= 8) break;
  }
  return lines.join('\n');
}

function findRoute(act: ActMap): string[] | null {
  const nodes = new Map(act.nodes.map((node) => [node.id, node]));
  const queue: Array<{ id: string; shop: boolean; unknown: boolean; path: string[] }> = [];
  for (const startId of act.startIds) {
    const start = nodes.get(startId);
    if (!start) continue;
    queue.push({
      id: startId,
      shop: start.kind === 'shop',
      unknown: start.kind === 'unknown',
      path: [startId],
    });
  }
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const mark = `${current.id}|${current.shop ? 1 : 0}|${current.unknown ? 1 : 0}`;
    if (seen.has(mark)) continue;
    seen.add(mark);
    const node = nodes.get(current.id);
    if (!node) continue;
    if (node.kind === 'boss') {
      if (current.shop && current.unknown) return current.path;
      continue;
    }
    for (const nextId of node.nextIds) {
      const next = nodes.get(nextId);
      if (!next) continue;
      queue.push({
        id: nextId,
        shop: current.shop || next.kind === 'shop',
        unknown: current.unknown || next.kind === 'unknown',
        path: [...current.path, nextId],
      });
    }
  }
  return null;
}

function firstPlayable(state: RunState, preferAttack: boolean): string | null {
  const combat = state.combat;
  if (!combat) return null;
  const matches = combat.hand.filter((card) => canPlay(combat, card.uid));
  const attack = matches.find((card) => getCard(card.defId).type === 'attack');
  const card = (preferAttack ? attack : undefined) ?? matches[0];
  return card?.defId ?? null;
}

function checkpoint(state: RunState, mode: SaveLoadMode): RunState {
  if (mode === 'off') return state;
  if (!snapshotRun(state)) {
    throw new Error(`saveLoad on unstable screen ${state.screen}`);
  }
  saveRunCheckpoint(state);
  if (mode === 'boot') {
    // Page boot always constructs a run before Continue. That constructor
    // draws a cast seed which resume then discards.
    const booted = createNewRun();
    if (!resumeSavedRun(booted)) throw new Error('Boot resume failed');
    return booted;
  }
  if (!resumeSavedRun(state)) throw new Error('Resume failed');
  return state;
}

function applyChoice(
  state: RunState,
  choice: ReplayChoice,
  prompts: PromptSignature[],
  mode: SaveLoadMode,
): RunState {
  switch (choice.op) {
    case 'saveLoad':
      return checkpoint(state, mode);
    case 'select': {
      selectMapNode(state, choice.nodeId);
      if (state.screen === 'map') {
        const available = getAvailableMapNodes(state).map((node) => node.id).join(',');
        throw new Error(`Could not enter ${choice.nodeId}. Available: ${available || '(none)'}`);
      }
      return state;
    }
    case 'play': {
      const combat = state.combat;
      if (!combat || state.screen !== 'combat') throw new Error(`Play on ${state.screen}`);
      const card = combat.hand.find((entry) => entry.defId === choice.defId && canPlay(combat, entry.uid));
      if (!card) throw new Error(`Hand has no playable ${choice.defId}`);
      tryPlayCard(state, card.uid);
      const signature = promptSignature(state);
      if (signature) prompts.push(signature);
      else if (state.screen === 'combat' && state.combat?.status === 'playing') {
        throw new Error(`Playing ${choice.defId} did not open a cast`);
      }
      return state;
    }
    case 'answer': {
      const prompt = state.cast?.prompt;
      if (!prompt) throw new Error(`Answer on ${state.screen} without a prompt`);
      if (state.screen === 'eventCast') {
        answerEventShrine(state, true);
        return state;
      }
      if (state.screen !== 'castCheck') throw new Error(`Answer on ${state.screen}`);
      const result = answerCast(state, [...prompt.answerTokens]);
      if (result === 'retry') throw new Error('A correct cast asked for a retry');
      if (state.screen === 'defeat') throw new Error('The cast ended the run');
      return state;
    }
    case 'endTurn':
      if (state.screen !== 'combat') throw new Error(`End turn on ${state.screen}`);
      playerEndTurn(state);
      if (state.screen === 'defeat') throw new Error('End turn ended the run');
      return state;
    case 'winFight':
      if (state.screen !== 'combat' || !state.combat) throw new Error(`Win on ${state.screen}`);
      debugFinishFight(state);
      return state;
    case 'declinePotion':
      if (!declinePendingPotion(state)) throw new Error('No potion was waiting');
      return state;
    case 'pickReward': {
      if (state.screen !== 'reward') throw new Error(`Reward pick on ${state.screen}`);
      const offer = choice.index === null ? null : state.rewardOptions[choice.index];
      if (choice.index !== null && !offer) throw new Error(`Reward index ${choice.index} missing`);
      pickReward(state, offer ? offer.uid : null);
      return state;
    }
    case 'leaveShop':
      if (state.screen !== 'shop') throw new Error(`Leave shop on ${state.screen}`);
      leaveShop(state);
      return state;
    case 'chooseEvent':
      if (state.screen !== 'event') throw new Error(`Event choice on ${state.screen}`);
      chooseEventChoice(state, choice.choiceId);
      if (choice.choiceId === 'leave' && state.screen === 'event') {
        throw new Error('Leave did not finish the event');
      }
      return state;
    case 'confirmEvent':
      confirmEventChoice(state);
      return state;
    case 'continueEvent':
      continueEventResult(state);
      return state;
    case 'restHeal':
      if (!applyRestHeal(state)) throw new Error('Rest heal was refused');
      return state;
    default: {
      const unreachable: never = choice;
      throw new Error(`Unknown choice ${JSON.stringify(unreachable)}`);
    }
  }
}

function missingScreens(snapshots: Partial<Record<FixtureScreen, RunSnapshot>>): FixtureScreen[] {
  return FIXTURE_SCREENS.filter((screen) => !snapshots[screen]);
}

export function screensComplete(snapshots: Partial<Record<FixtureScreen, RunSnapshot>>): boolean {
  return missingScreens(snapshots).length === 0;
}

/**
 * Play one Act I route that contains a shop node and a ? node.
 * Fights cast once (the tutorial casts its two scripted cards) and then win
 * through the existing debug win helper, which still runs the real reward roll.
 */
export function recordReplay(seed: number, characterId: PlayableCharacterId): RecordedReplay {
  resetLearner();
  return withSeed(seed, () => {
    const choices: ReplayChoice[] = [];
    const prompts: PromptSignature[] = [];
    const snapshots: Partial<Record<FixtureScreen, RunSnapshot>> = {};
    let state = createNewRun();
    startRun(state);
    if (!pickCharacter(state, characterId)) throw new Error(`Could not play ${characterId}`);
    const route = findRoute(state.runMap.acts[0]!);
    if (!route) throw new Error('This map has no Act I path through both a shop and a ? room');

    const take = (choice: ReplayChoice) => {
      choices.push(choice);
      state = applyChoice(state, choice, prompts, 'off');
    };
    const rememberSave = () => {
      if (!snapshotRun(state)) throw new Error(`Tried to record a save on ${state.screen}`);
      choices.push({ op: 'saveLoad' });
    };
    const capture = () => {
      if (!FIXTURE_SCREENS.includes(state.screen as FixtureScreen)) return;
      const screen = state.screen as FixtureScreen;
      if (snapshots[screen]) return;
      if (screen === 'reward' && state.rewardOptions.length === 0) return;
      if (screen === 'event' && state.eventTrack.active?.phase !== 'choose') return;
      if (screen === 'shop' && state.shopOffers.length === 0) return;
      snapshots[screen] = canonicalSnapshot(state);
    };

    let routeIndex = 0;
    let castsThisFight = 0;
    let guard = 0;
    while (state.screen !== 'actClear') {
      guard += 1;
      if (guard > 500) throw new Error(`Stuck on ${state.screen} after ${choices.length} choices`);
      capture();

      if (state.screen === 'castCheck' || state.screen === 'eventCast') {
        take({ op: 'answer' });
        castsThisFight += 1;
        continue;
      }
      if (state.screen !== 'combat') castsThisFight = 0;

      if (state.screen === 'combat') {
        const step = state.tutorial?.step ?? null;
        if (step === 'endTurn') {
          take({ op: 'endTurn' });
          continue;
        }
        const scripted = step === 'shield' ? 'mo' : step === 'attack' ? 'bo' : null;
        if (scripted || castsThisFight < 1) {
          const defId = scripted ?? firstPlayable(state, true);
          if (defId) {
            take({ op: 'play', defId });
            continue;
          }
          if (scripted) throw new Error(`Tutorial card ${scripted} was not playable`);
        }
        take({ op: 'winFight' });
        continue;
      }

      if (state.screen === 'map') {
        rememberSave();
        const nodeId = route[routeIndex];
        if (!nodeId) throw new Error('Route ended before the boss reward');
        routeIndex += 1;
        take({ op: 'select', nodeId });
        continue;
      }
      if (state.screen === 'reward') {
        rememberSave();
        if (potionOfferBlocksReward(state)) take({ op: 'declinePotion' });
        take({ op: 'pickReward', index: state.rewardOptions.length > 0 ? 0 : null });
        continue;
      }
      if (state.screen === 'shop') {
        rememberSave();
        take({ op: 'leaveShop' });
        continue;
      }
      if (state.screen === 'event') {
        rememberSave();
        const phase = state.eventTrack.active?.phase;
        if (phase === 'choose') {
          take({ op: 'chooseEvent', choiceId: 'leave' });
          continue;
        }
        if (phase === 'confirm') {
          take({ op: 'confirmEvent' });
          continue;
        }
        if (phase === 'result') {
          take({ op: 'continueEvent' });
          continue;
        }
        throw new Error(`Unhandled event phase ${phase ?? '(none)'}`);
      }
      if (state.screen === 'rest') {
        rememberSave();
        take({ op: 'restHeal' });
        continue;
      }
      throw new Error(`Unhandled screen ${state.screen}`);
    }

    capture();
    rememberSave();
    if (routeIndex !== route.length) {
      throw new Error(`Stopped at act clear after ${routeIndex} of ${route.length} rooms`);
    }
    const missing = missingScreens(snapshots);
    if (missing.length > 0) throw new Error(`Missing screens: ${missing.join(', ')}`);
    const finalSnapshot = canonicalSnapshot(state);
    return { seed, characterId, choices, snapshots, prompts, finalSnapshot };
  });
}

export function runReplay(log: ReplayLog, mode: SaveLoadMode = 'resume'): ReplayResult {
  resetLearner();
  return withSeed(log.seed, () => {
    const prompts: PromptSignature[] = [];
    const traces: ReplayTrace[] = [];
    let state = createNewRun();
    startRun(state);
    if (!pickCharacter(state, log.characterId)) throw new Error(`Could not play ${log.characterId}`);
    traces.push(replayTrace(state));
    for (const choice of log.choices) {
      state = applyChoice(state, choice, prompts, mode);
      traces.push(replayTrace(state));
    }
    const finalSnapshot = state.screen === 'actClear' ? canonicalSnapshot(state) : snapshotRun(state);
    return { traces, prompts, finalSnapshot };
  });
}

export function findFixtureSeed(): { echo: RecordedReplay; abacus: RecordedReplay } {
  let lastError = 'no attempt';
  for (let offset = 0; offset < FIXTURE_SEED_ATTEMPTS; offset += 1) {
    const seed = FIXTURE_SEED_START + offset;
    try {
      const echo = recordReplay(seed, 'echoMage');
      if (!screensComplete(echo.snapshots)) {
        lastError = `echoMage seed ${seed} missed a screen`;
        continue;
      }
      const abacus = recordReplay(seed, 'abacusFist');
      if (!screensComplete(abacus.snapshots)) {
        lastError = `abacusFist seed ${seed} missed a screen`;
        continue;
      }
      return { echo, abacus };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`No seed in ${FIXTURE_SEED_START}..+${FIXTURE_SEED_ATTEMPTS} hosted both characters: ${lastError}`);
}
