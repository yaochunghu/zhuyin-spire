/**
 * When 老師 and 點燈人 speak. Views call these hooks; voice.ts plays the lines.
 *
 * PLACEHOLDER audio: every recorded line is ElevenLabs TTS for the first
 * playtest (src/data/voiceLines.ts, THIRD_PARTY_NOTICES.md).
 *
 * Rules, from Spire Audio's manifests and HERO_NARRATOR_LINES_v2 / VOICEOVER_BRIEF_v1:
 * - 老師 reads the cast frame, then the existing word cue plays. Praise and
 *   retries rotate and never repeat back to back. UI lines (u.*) play the first
 *   time per session only (Q61). Cards are read on inspect, not on play.
 * - 點燈人 speaks at most once per screen change, queued after 老師 (never over
 *   a question: a cast cancels him). Variants rotate. In a fight: at most one
 *   mid-fight line plus the end line; a boss fight saves that slot for its phase.
 * - First-time story lines (prologue, wake lines) are remembered per learner
 *   profile; per-run and per-act caps are remembered for this page session.
 * - u.notnow is not recorded (held pending Yao's decision, Q100) and is never played here.
 */
import { MATH_WARMUP_STREAK } from '../data/balance';
import type { CharacterId } from '../data/characters';
import type { MapNode } from '../data/map';
import type { CombatState } from '../game/battle/types';
import type { CastPrompt } from '../game/castCheck';
import { speakableMathQuestion } from '../game/casting/math/speech';
import { getVoiceMemory, updateVoiceMemory } from '../game/profiles';
import { speakCue, speakCueWithAutoReplay } from '../game/speech';
import { getActiveNode, getAvailableMapNodes, type RunState } from '../game/state';
import { playVoiceLine, prefetchVoiceLines, stopVoice, warmVoice, type VoiceLineOpts } from '../game/voice';
import { teachingTimers } from './pauseTimers';

/** A card hit at least this hard (block + HP, all targets) earns 好大一擊. */
export const NARRATOR_BIG_HIT = 12;

const FRAME_KEYS = ['zy.listen', 'zy.listenHard', 'zy.recognize', 'zy.again', 'm.pick', 'p.correct', 'p.great'];

// ── session memory ──────────────────────────────────────────────────────────

const heardThisSession = new Set<string>();
const lastInGroup = new Map<string, string>();
let lastScreenKey = '';
let lastScreen = '';

interface RunMemory {
  seed: number;
  started: boolean;
  firstShopDone: boolean;
  eliteSeen: boolean;
  loreDone: boolean;
  actEntries: Set<number>;
  bossNear: Set<number>;
  wakeStir: Set<number>;
  campfires: Map<number, number>;
  picksSinceLine: number;
}
let runMemory: RunMemory | null = null;

interface FightMemory {
  midLine: boolean;
  mathCasts: number;
  tutorialStep: string | null;
}
const fights = new WeakMap<CombatState, FightMemory>();

let correctStreak = 0;
let praiseTurn = 0;
let warmupAnnounced = false;

function runMem(state: RunState): RunMemory {
  if (!runMemory || runMemory.seed !== state.castSeed) {
    runMemory = {
      seed: state.castSeed,
      started: false,
      firstShopDone: false,
      eliteSeen: false,
      loreDone: false,
      actEntries: new Set(),
      bossNear: new Set(),
      wakeStir: new Set(),
      campfires: new Map(),
      picksSinceLine: 0,
    };
  }
  return runMemory;
}

function fightMem(combat: CombatState): FightMemory {
  let memory = fights.get(combat);
  if (!memory) {
    memory = { midLine: false, mathCasts: 0, tutorialStep: null };
    fights.set(combat, memory);
  }
  return memory;
}

/** Next variant in a group, never the one that played last. */
export function rotateVoice(group: string, keys: readonly string[]): string {
  const last = lastInGroup.get(group);
  const index = last ? (keys.indexOf(last) + 1) % keys.length : Math.floor(Math.random() * keys.length);
  const key = keys[index] ?? keys[0]!;
  lastInGroup.set(group, key);
  return key;
}

function say(key: string, opts: VoiceLineOpts = {}): void {
  playVoiceLine(key, opts);
}

/** Screen and story lines wait for whatever is speaking. */
function sayQueued(key: string, opts: VoiceLineOpts = {}): void {
  playVoiceLine(key, { queue: true, ...opts });
}

/** 老師 UI and button reads: the first time per session (Q61). */
function sayOnce(key: string, queued = true): void {
  if (heardThisSession.has(key)) return;
  heardThisSession.add(key);
  if (queued) sayQueued(key);
  else say(key);
}

/** Button taps: 老師 reads the label the first time per session. */
export function voiceButton(key: string): void {
  sayOnce(key, false);
}

export function voiceWarm(): void {
  warmVoice();
  prefetchVoiceLines(FRAME_KEYS);
}

function heroId(state: RunState): CharacterId | null {
  return (state.characterId as CharacterId | null) ?? null;
}

// ── screen changes ──────────────────────────────────────────────────────────

/** Called after every render with the screen actually on show. */
export function voiceAfterRender(state: RunState, screen: string): void {
  const key = screen === 'event'
    ? `event:${state.eventTrack.active?.eventId ?? ''}:${state.eventTrack.active?.phase ?? ''}`
    : screen;
  if (state.combat && (screen === 'combat' || screen === 'castCheck')) tutorialStepLines(state, state.combat);
  if (key === lastScreenKey) return;
  const prev = lastScreen;
  lastScreenKey = key;
  lastScreen = screen;
  onScreenEnter(state, screen, prev);
}

function onScreenEnter(state: RunState, screen: string, prev: string): void {
  const memory = runMem(state);
  switch (screen) {
    case 'relicPick':
      characterPickLines();
      return;
    case 'map':
      mapLines(state, memory, prev);
      return;
    case 'combat':
      if (state.combat) fightStartLines(state, state.combat);
      return;
    case 'reward':
      if (state.rewardSource === 'treasure') {
        sayOnce('u.chest');
      } else {
        if (state.pendingGold > 0) sayOnce('u.gold');
        if (state.rewardOptions.length > 0) sayOnce('u.reward');
      }
      return;
    case 'shop':
      sayOnce('u.shop');
      if (!memory.firstShopDone) {
        memory.firstShopDone = true;
        sayQueued('n.shop');
      }
      return;
    case 'rest':
      sayOnce('u.camp');
      if (prev === 'map') {
        const act = state.actIndex;
        const count = (memory.campfires.get(act) ?? 0) + 1;
        memory.campfires.set(act, count);
        if (count === 2) sayQueued('n.wake.camp');
      }
      return;
    case 'smith':
      sayOnce('u.upgrade');
      return;
    case 'removeCard':
    case 'shopRemove':
      sayOnce('u.remove');
      return;
    case 'event':
      eventPhaseLines(state);
      return;
    case 'actClear':
      actClearLines(state);
      return;
    case 'victory':
      victoryLines(state);
      return;
    case 'defeat':
      sayQueued(rotateVoice('rest.end', ['n.rest.end.a', 'n.rest.end.b']));
      return;
    default:
  }
}

let prologueSkip: (() => void) | null = null;

function characterPickLines(): void {
  const memory = getVoiceMemory();
  if (memory.prologueHeard) {
    sayOnce('u.hero');
    return;
  }
  updateVoiceMemory((m) => ({ ...m, prologueHeard: true }));
  // First launch only. Any tap ends the prologue (and the 老師 line after it).
  const release = (): void => {
    document.removeEventListener('pointerdown', skip, true);
    prologueSkip = null;
  };
  const skip = (): void => {
    release();
    stopVoice();
  };
  prologueSkip?.();
  prologueSkip = release;
  document.addEventListener('pointerdown', skip, true);
  sayQueued('n.pro.1');
  sayQueued('n.pro.2');
  sayQueued('n.pro.3', { onEnd: release });
  heardThisSession.add('u.hero');
  sayQueued('u.hero');
}

function actLine(actIndex: number): string | null {
  if (actIndex === 0) return rotateVoice('act1', ['n.act1.a', 'n.act1.b']);
  if (actIndex === 1) return rotateVoice('act2', ['n.act2.a', 'n.act2.b']);
  if (actIndex === 2) return rotateVoice('act3', ['n.act3.a', 'n.act3.b']);
  return null;
}

function mapLines(state: RunState, memory: RunMemory, prev: string): void {
  const act = state.actIndex;
  if (prev === 'relicPick' && !memory.started) {
    // Run start: the hero line (alternating with n.start.again from the 2nd run), then Act I.
    memory.started = true;
    memory.actEntries.add(act);
    const voice = getVoiceMemory();
    const heroLine = heroId(state) === 'abacusFist' ? 'n.hero.ry' : heroId(state) === 'echoMage' ? 'n.hero.rk' : null;
    const startLine = voice.runsStarted === 0 || !heroLine
      ? heroLine
      : rotateVoice('run.start', [heroLine, 'n.start.again']);
    updateVoiceMemory((m) => ({ ...m, runsStarted: m.runsStarted + 1 }));
    if (startLine) sayQueued(startLine);
    const entry = actLine(act);
    if (entry) sayQueued(entry);
    return;
  }
  if (prev === 'actClear' && !memory.actEntries.has(act)) {
    memory.actEntries.add(act);
    const entry = actLine(act);
    if (entry) {
      sayQueued(entry);
      return;
    }
  }
  if (prev === 'event') {
    if (wakeStir(state, memory)) return;
  }
  if (!memory.bossNear.has(act) && getAvailableMapNodes(state).some((node) => node.kind === 'boss')) {
    memory.bossNear.add(act);
    sayQueued(rotateVoice('boss.near', ['n.boss.near.a', 'n.boss.near.b']));
    return;
  }
  sayOnce('u.map');
}

/** n.wake.stir / n.wake.yawn after an elite win or a ? room, once per act. */
function wakeStir(state: RunState, memory: RunMemory): boolean {
  if (memory.wakeStir.has(state.actIndex)) return false;
  memory.wakeStir.add(state.actIndex);
  sayQueued(rotateVoice('wake.stir', ['n.wake.stir', 'n.wake.yawn']));
  return true;
}

/** Child picked a room: ≤ 1 line in 3 picks, never on two picks in a row. */
export function voiceMapPick(state: RunState, node: MapNode): void {
  const memory = runMem(state);
  if (node.kind === 'boss') return; // the boss gets its own entry line
  if (node.kind === 'elite' && !memory.eliteSeen) {
    memory.eliteSeen = true;
    memory.picksSinceLine = 0;
    sayQueued('n.map.elite');
    return;
  }
  if (memory.picksSinceLine >= 2) {
    memory.picksSinceLine = 0;
    sayQueued(rotateVoice('map.pick', ['n.map.lamp', 'n.map.path']));
    return;
  }
  memory.picksSinceLine += 1;
}

const BOSS_LINES: Record<string, { entry: string; phase: string }> = {
  boss1: { entry: 'n.boss1.in', phase: 'n.boss1.ph' },
  boss2: { entry: 'n.boss2.in', phase: 'n.boss2.ph' },
  boss3: { entry: 'n.boss3.in', phase: 'n.boss3.ph' },
};

function bossLines(combat: CombatState): { entry: string; phase: string } | null {
  for (const unit of combat.enemies) {
    const lines = BOSS_LINES[unit.defId];
    if (lines) return lines;
  }
  return null;
}

function fightStartLines(state: RunState, combat: CombatState): void {
  if (fights.has(combat)) return;
  const memory = fightMem(combat);
  if (state.tutorial) {
    memory.tutorialStep = state.tutorial.step;
    say('u.tut1');
    return;
  }
  const kind = getActiveNode(state)?.kind;
  const boss = bossLines(combat);
  if (kind === 'boss' && boss) {
    sayQueued(boss.entry);
    return;
  }
  if (kind === 'elite') {
    sayQueued('n.fight.elite');
    return;
  }
  sayOnce('u.pickcard');
}

/** Tutorial guide steps: 1/3 at the start, 2/3 + 3/3 after the shield turn, then done. */
function tutorialStepLines(state: RunState, combat: CombatState): void {
  const step = state.tutorial?.step ?? null;
  const memory = fights.get(combat);
  if (!memory || !step || memory.tutorialStep === step) return;
  const before = memory.tutorialStep;
  memory.tutorialStep = step;
  if (before === 'endTurn' && step === 'attack') {
    sayQueued('u.tut2');
    sayQueued('u.tut3');
  } else if (step === 'free') {
    sayQueued('u.tutdone');
  }
}

function actClearLines(state: RunState): void {
  sayOnce('u.heal');
  const act = state.lastClearedAct;
  const hero = heroId(state);
  const first = !hero || !(getVoiceMemory().actClears[hero] ?? []).includes(act);
  if (hero) {
    updateVoiceMemory((m) => ({
      ...m,
      actClears: { ...m.actClears, [hero]: [...(m.actClears[hero] ?? []), act] },
    }));
  }
  if (first && act === 1) sayQueued('n.wake.1');
  else if (first && act === 2) sayQueued('n.wake.2');
  else sayQueued(rotateVoice('clear', ['n.clear.a', 'n.clear.b']));
}

function victoryLines(state: RunState): void {
  const hero = heroId(state);
  const wins = hero ? getVoiceMemory().runWins[hero] ?? 0 : 0;
  if (hero) {
    updateVoiceMemory((m) => ({ ...m, runWins: { ...m.runWins, [hero]: (m.runWins[hero] ?? 0) + 1 } }));
  }
  sayQueued(wins === 0 ? 'n.wake.3' : 'n.wake.more');
  sayQueued('n.thanks', { gapMs: 1_000 });
}

// ── events ──────────────────────────────────────────────────────────────────

/** First show of an event: 老師 reads the title and the line, then 留里克's lore remark once per run. */
export function voiceEventOpened(state: RunState, event: { id: string; presentation: string }): void {
  sayQueued(`ev.${event.id}.title`, { fallback: 'none' });
  // The line kept its Web Speech read before clips; keep that as the fallback.
  sayQueued(`ev.${event.id}.text`, { fallbackText: event.presentation, gapMs: 300 });
  const memory = runMem(state);
  if (heroId(state) === 'echoMage' && !memory.loreDone) {
    memory.loreDone = true;
    sayQueued('n.lore.rk');
  }
}

function eventPhaseLines(state: RunState): void {
  const phase = state.eventTrack.active?.phase;
  if (phase === 'confirm') sayOnce('u.sure');
  else if (phase === 'fight') sayOnce('u.hello');
}

/** Choice buttons keep their live order: the n-th choice is `.c<n>`. */
export function voiceEventChoice(eventId: string, index: number): void {
  say(`ev.${eventId}.c${index + 1}`, { fallback: 'none' });
}

// ── campfire ────────────────────────────────────────────────────────────────

export function voiceRestChosen(): void {
  sayOnce('u.rest', false);
  sayQueued('n.camp.rest');
}

export function voiceSmithDone(): void {
  sayQueued('n.camp.up');
}

// ── cards ───────────────────────────────────────────────────────────────────

/** 老師 reads a card's name, then its desc. Upgraded cards reuse the base line. */
export function voiceCardRead(defId: string): void {
  say(`c.${defId}.name`, { fallback: 'none' });
  sayQueued(`c.${defId}.desc`, { fallback: 'none', gapMs: 300 });
}

// ── casts ───────────────────────────────────────────────────────────────────

/** Whole-sentence 湊十 clips. Any other question keeps Web Speech. */
export function mathQuestionVoiceKey(question: string): string | null {
  let match = /^(\d+) 和 (\d+) 合起來是幾？$/u.exec(question);
  if (match) return `m.make10.sum.${match[1]}_${match[2]}`;
  match = /^10 可以分成 (\d) 和幾？$/u.exec(question);
  if (match) return `m.make10.split.${match[1]}`;
  match = /^(\d) 和幾合起來是 10？$/u.exec(question);
  if (match) return `m.make10.join.${match[1]}`;
  match = /^(1\d) 可以分成 10 和幾？$/u.exec(question);
  if (match) return `m.teen.split.${match[1]}`;
  return null;
}

/**
 * The cast opened. 老師's frame first, then the existing cue read.
 * Frames never fall back to Web Speech, so the cue keeps its old timing and
 * its speech-fallback note when a frame cannot play.
 */
export function voiceCastOpen(state: RunState, prompt: CastPrompt): void {
  const cue = prompt.cue.speechText;
  if (prompt.gateId === 'math') {
    teachingTimers.set(() => mathOpen(state, prompt), 150);
    return;
  }
  if (prompt.mode === 'listen' || prompt.mode === 'listenHard') {
    teachingTimers.set(() => {
      say(prompt.mode === 'listen' ? 'zy.listen' : 'zy.listenHard', {
        fallback: 'none',
        onEnd: () => speakCueWithAutoReplay(cue, 750, speakerTip()),
      });
    }, 220);
    return;
  }
  teachingTimers.set(() => {
    say('zy.recognize', { fallback: 'none', onEnd: () => speakCue(cue) });
  }, 150);
}

/** Once per learner profile, after the first listen cast's word. */
function speakerTip(): (() => void) | undefined {
  if (getVoiceMemory().speakerTipHeard) return undefined;
  return () => {
    if (getVoiceMemory().speakerTipHeard) return;
    updateVoiceMemory((m) => ({ ...m, speakerTipHeard: true }));
    say('zy.speaker', { fallback: 'none' });
  };
}

function mathOpen(state: RunState, prompt: CastPrompt): void {
  const combat = state.combat;
  const intro: string[] = [];
  if (combat && state.screen === 'castCheck') {
    const memory = fightMem(combat);
    if (combat.mathMissStreak >= MATH_WARMUP_STREAK) {
      if (!warmupAnnounced) intro.push('r.warmup');
      warmupAnnounced = true;
    } else {
      warmupAnnounced = false;
      if (memory.mathCasts === 0 && heroId(state) === 'abacusFist') intro.push('m.calc');
    }
    memory.mathCasts += 1;
  }
  const question = (): void => {
    const key = mathQuestionVoiceKey(prompt.cue.text);
    const thenPick = (): void => say('m.pick', { fallback: 'none' });
    if (key) say(key, { fallbackText: prompt.cue.speechText, onEnd: thenPick });
    else speakCue(prompt.cue.speechText, { onEnd: thenPick });
  };
  if (intro.length === 0) {
    question();
    return;
  }
  say(intro[0]!, { fallback: 'none', onEnd: question });
}

/** 🔊 再聽: 「再聽一次。」 then the word. */
export function voiceReplayCue(prompt: CastPrompt): void {
  say('zy.again', { fallback: 'none', onEnd: () => speakCue(prompt.cue.speechText) });
}

/** 💡 the answer is on screen. */
export function voiceAnswerShown(): void {
  say('r.shown');
}

function mathFamily(prompt: CastPrompt): string {
  return prompt.lessonFamilyId.split('@')[0] ?? '';
}

function praiseKey(prompt: CastPrompt): string {
  if (prompt.retry) return 'p.retry';
  if (correctStreak > 0 && correctStreak % 3 === 0) return 'p.streak';
  const specific = prompt.gateId === 'math'
    ? mathFamily(prompt) === 'count'
      ? 'p.m.count'
      : mathFamily(prompt) === 'make10'
        ? 'p.m.ten'
        : 'p.m.think'
    : prompt.mode === 'listen' || prompt.mode === 'listenHard'
      ? 'p.zy.listen'
      : 'p.zy.spell';
  const pool = [specific, 'p.correct', 'p.great'];
  const last = lastInGroup.get('praise');
  let key = pool[praiseTurn % pool.length]!;
  praiseTurn += 1;
  if (key === last) {
    key = pool[praiseTurn % pool.length]!;
    praiseTurn += 1;
  }
  return key;
}

export type CastVoiceResult = 'correct' | 'fizzle' | 'retry';

/** Feedback after a submitted answer: praise, a gentle retry, or the shown answer. */
export function voiceCastAnswered(
  state: RunState,
  prompt: CastPrompt,
  result: CastVoiceResult,
  where: 'combat' | 'practice' | 'shrine',
): void {
  if (result === 'correct') {
    correctStreak += 1;
    const key = praiseKey(prompt);
    lastInGroup.set('praise', key);
    say(key);
    return;
  }
  correctStreak = 0;
  if (result === 'retry') {
    const family = mathFamily(prompt);
    if (family === 'count') say('m.count.again');
    else if (family === 'make10') say('m.make10.hint');
    else say(rotateVoice('retry', ['m.redo', 'r.retry', 'r.close', 'r.slow']));
    return;
  }
  if (where === 'combat' && state.tutorial) {
    say('r.tut.wrong');
    return;
  }
  if (prompt.gateId === 'math' && where !== 'shrine') {
    const answer = prompt.correctSpell;
    const fallbackText = speakableMathQuestion(`答案是 ${answer}`);
    if (/^(?:\d|1\d|20)$/u.test(answer)) say(`m.answer.${answer}`, { fallbackText });
    else say('r.shown');
    return;
  }
  say(where === 'practice' ? 'r.shown' : 'r.fizzle');
}

// ── mid-fight narrator ──────────────────────────────────────────────────────

export interface CombatVoiceSnapshot {
  jin: number;
  tens: number;
  makeTenCount: number;
  phases: Record<string, number>;
}

export function combatVoiceSnapshot(combat: CombatState | null): CombatVoiceSnapshot | null {
  if (!combat) return null;
  return {
    jin: combat.jin,
    tens: combat.tens,
    makeTenCount: combat.makeTenCount,
    phases: Object.fromEntries(combat.enemies.map((unit) => [unit.id, unit.phase ?? 0])),
  };
}

function midFightAllowed(state: RunState, combat: CombatState): FightMemory | null {
  if (state.tutorial || combat.status !== 'playing') return null;
  const memory = fightMem(combat);
  return memory.midLine ? null : memory;
}

/** After a cast card resolved: a hero's big move, or one hard hit. */
export function voiceCardResolved(state: RunState, cardId: string, before: CombatVoiceSnapshot | null): void {
  const combat = state.combat;
  if (!combat || !before) return;
  const memory = midFightAllowed(state, combat);
  if (!memory || bossLines(combat)) return; // a boss fight keeps the slot for its phase line
  let line: string | null = null;
  if (heroId(state) === 'echoMage' && (cardId === 'po' || combat.jin < before.jin)) line = 'n.fight.rk.big';
  else if (heroId(state) === 'abacusFist' && combat.makeTenCount > before.makeTenCount) line = 'n.fight.ry.ten';
  else if (heroId(state) === 'abacusFist' && combat.tens < before.tens) line = 'n.fight.ry.spend';
  else {
    let total = 0;
    for (const fx of state.lastCombatFx) {
      if (fx.type !== 'playerStrike') continue;
      for (const impact of fx.impacts) total += impact.hpDamage + impact.blocked;
    }
    if (total >= NARRATOR_BIG_HIT) line = rotateVoice('fight.big', ['n.fight.big.a', 'n.fight.big.b']);
  }
  if (!line) return;
  memory.midLine = true;
  sayQueued(line);
}

/** After the guardians' turn: a boss phase change, or a hit the shield fully stopped. */
export function voiceEnemyTurnResolved(state: RunState, before: CombatVoiceSnapshot | null): void {
  const combat = state.combat;
  if (!combat || !before) return;
  const memory = midFightAllowed(state, combat);
  if (!memory) return;
  const boss = bossLines(combat);
  if (boss) {
    const entered = combat.enemies.some((unit) => (unit.phase ?? 0) > 0 && (before.phases[unit.id] ?? 0) === 0
      && !!BOSS_LINES[unit.defId]);
    if (!entered) return;
    memory.midLine = true;
    sayQueued(boss.phase);
    return;
  }
  const fullyBlocked = state.lastCombatFx.some((fx) => fx.type === 'enemyStrike' && fx.damage === 0 && fx.blocked > 0);
  if (!fullyBlocked) return;
  memory.midLine = true;
  sayQueued('n.fight.block');
}

// ── fight endings ───────────────────────────────────────────────────────────

/** The poof or faint overlay. Replaces 老師's old e.allclear / e.elite / f.caption. */
export function voiceOutcome(
  state: RunState,
  kind: 'kill' | 'faint',
  opts: { isBoss?: boolean; isElite?: boolean; act?: number },
): void {
  if (kind === 'faint') {
    // After the hero's sigh (sfx.heroFaint).
    window.setTimeout(() => sayQueued(rotateVoice('faint', ['n.faint.a', 'n.faint.b'])), 700);
    return;
  }
  if (opts.isBoss) {
    sayQueued('n.boss.poof');
    if ((opts.act ?? state.actIndex + 1) >= 3 && state.screen === 'victory') sayQueued('n.top');
    return;
  }
  if (opts.isElite) {
    sayQueued('n.win.elite');
    wakeStir(state, runMem(state));
    return;
  }
  sayQueued(rotateVoice('win', ['n.win.a', 'n.win.b', 'n.win.c']));
}

/** Test seam. */
export function resetVoiceDirectorForTests(): void {
  heardThisSession.clear();
  lastInGroup.clear();
  lastScreenKey = '';
  lastScreen = '';
  runMemory = null;
  correctStreak = 0;
  praiseTurn = 0;
  warmupAnnounced = false;
  prologueSkip?.();
}
