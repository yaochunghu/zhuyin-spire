import { ALL_PHRASE_PACKS } from '../data/phrases';
import type {
  CastingHistory,
  CastingPreferences,
  LessonProgress,
  ToneClass,
} from './casting/types';

const STORE_KEY = 'zhuyin-spire-learner-profiles-v1';
const LEGACY_PHRASE_KEY = 'zhuyin-spire-phrase-settings-v1';
const LEGACY_GAME_SETTINGS_KEY = 'zhuyin-spire-game-settings-v1';
const LEGACY_TUTORIAL_KEY = 'zhuyin-spire-tutorial-complete-v1';
const MAX_PROFILES = 4;
const AVATARS = ['🧒', '👧', '👦', '🐣', '🐰', '🐻'] as const;

function announceProfileChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zhuyin-profile-change'));
}

export interface LearnerProfileV1 {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
  tutorialEnabled: boolean;
  tutorialComplete: boolean;
  practiceCorrect: number;
  cleared: boolean;
  earBadge: boolean;
  completedRuns: number;
  casting: CastingPreferences;
  castingHistory: CastingHistory;
}

interface LearnerProfileStoreV1 {
  v: 1;
  activeProfileId: string;
  legacyOwnerProfileId: string;
  profiles: LearnerProfileV1[];
}

function safeNumber(value: string | null): number {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function defaultModeWeights() {
  return { recognize: 70, listen: 25, listenHard: 5 };
}

export function defaultCastingPreferences(): CastingPreferences {
  return {
    packs: [...ALL_PHRASE_PACKS],
    vocabulary: 'coreOnly',
    tones: [1, 2, 3, 4, 5],
    maxAnswerParts: 4,
    modeWeights: defaultModeWeights(),
    distractorCount: 4,
    adaptive: true,
    includeWords: [],
    excludeWords: [],
  };
}

export function defaultLessonProgress(): LessonProgress {
  return {
    attempts: 0,
    correct: 0,
    totalResponseMs: 0,
    recentResults: [],
    remainingAnswerKeys: [],
    remainingPromptIdsByAnswer: {},
    lastAnswerKey: null,
    lastPromptId: null,
  };
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))];
}

export function parseCastingPreferences(value: unknown): CastingPreferences {
  const defaults = defaultCastingPreferences();
  if (!value || typeof value !== 'object') return defaults;
  const data = value as Partial<CastingPreferences>;
  const packs = cleanStringList(data.packs).filter((pack) =>
    ALL_PHRASE_PACKS.includes(pack as (typeof ALL_PHRASE_PACKS)[number]),
  );
  const tones = Array.isArray(data.tones)
    ? ([...new Set(data.tones.filter((tone): tone is ToneClass =>
        tone === 1 || tone === 2 || tone === 3 || tone === 4 || tone === 5,
      ))] as ToneClass[])
    : defaults.tones;
  const rawWeights = data.modeWeights;
  const weights = rawWeights && typeof rawWeights === 'object'
    ? {
        recognize: Math.max(0, Number(rawWeights.recognize) || 0),
        listen: Math.max(0, Number(rawWeights.listen) || 0),
        listenHard: Math.max(0, Number(rawWeights.listenHard) || 0),
      }
    : defaults.modeWeights;
  if (weights.recognize + weights.listen + weights.listenHard <= 0) {
    Object.assign(weights, defaults.modeWeights);
  }
  return {
    packs: packs.length ? packs : defaults.packs,
    vocabulary: data.vocabulary === 'coreAndBroad' ? 'coreAndBroad' : 'coreOnly',
    tones: tones.length ? tones : defaults.tones,
    maxAnswerParts:
      data.maxAnswerParts === 2 || data.maxAnswerParts === 3
        ? data.maxAnswerParts
        : 4,
    modeWeights: weights,
    distractorCount:
      data.distractorCount === 2 || data.distractorCount === 3
        ? data.distractorCount
        : 4,
    adaptive: data.adaptive !== false,
    includeWords: cleanStringList(data.includeWords),
    excludeWords: cleanStringList(data.excludeWords),
  };
}

function legacyPreferences(): CastingPreferences {
  const defaults = defaultCastingPreferences();
  try {
    const raw = localStorage.getItem(LEGACY_PHRASE_KEY);
    if (!raw) return defaults;
    const data = JSON.parse(raw) as {
      packs?: unknown;
      includeWords?: unknown;
      excludeWords?: unknown;
    };
    return parseCastingPreferences({
      ...defaults,
      packs: data.packs,
      includeWords: data.includeWords,
      excludeWords: data.excludeWords,
    });
  } catch {
    return defaults;
  }
}

function legacyTutorialEnabled(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_GAME_SETTINGS_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw) as { tutorialEnabled?: unknown };
    return typeof data.tutorialEnabled === 'boolean' ? data.tutorialEnabled : true;
  } catch {
    return true;
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `learner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLegacyProfile(): LearnerProfileV1 {
  let tutorialComplete = false;
  try {
    tutorialComplete = localStorage.getItem(LEGACY_TUTORIAL_KEY) === '1';
  } catch {
    /* use default */
  }
  return {
    id: makeId(),
    name: '小玩家 1',
    avatar: AVATARS[0],
    createdAt: Date.now(),
    tutorialEnabled: legacyTutorialEnabled(),
    tutorialComplete,
    practiceCorrect: safeNumber(localStorage.getItem('zhuyin-spire-practice-correct')),
    cleared: localStorage.getItem('zhuyin-spire-cleared') === '1',
    earBadge: localStorage.getItem('zhuyin-spire-ear-badge') === '1',
    completedRuns: safeNumber(localStorage.getItem('zhuyin-spire-run-count')),
    casting: legacyPreferences(),
    castingHistory: { lessons: {} },
  };
}

function sanitizeHistory(value: unknown): CastingHistory {
  if (!value || typeof value !== 'object') return { lessons: {} };
  const raw = value as { lessons?: unknown };
  if (!raw.lessons || typeof raw.lessons !== 'object') return { lessons: {} };
  const lessons: Record<string, LessonProgress> = {};
  for (const [key, candidate] of Object.entries(raw.lessons)) {
    if (!candidate || typeof candidate !== 'object') continue;
    const data = candidate as Partial<LessonProgress>;
    lessons[key] = {
      attempts: Math.max(0, Math.floor(Number(data.attempts) || 0)),
      correct: Math.max(0, Math.floor(Number(data.correct) || 0)),
      totalResponseMs: Math.max(0, Math.floor(Number(data.totalResponseMs) || 0)),
      recentResults: Array.isArray(data.recentResults)
        ? data.recentResults.filter((item): item is boolean => typeof item === 'boolean').slice(-8)
        : [],
      remainingAnswerKeys: cleanStringList(data.remainingAnswerKeys),
      remainingPromptIdsByAnswer:
        data.remainingPromptIdsByAnswer && typeof data.remainingPromptIdsByAnswer === 'object'
          ? Object.fromEntries(
              Object.entries(data.remainingPromptIdsByAnswer).map(([answer, ids]) => [
                answer,
                cleanStringList(ids),
              ]),
            )
          : {},
      lastAnswerKey: typeof data.lastAnswerKey === 'string' ? data.lastAnswerKey : null,
      lastPromptId: typeof data.lastPromptId === 'string' ? data.lastPromptId : null,
    };
  }
  return { lessons };
}

function sanitizeProfile(value: unknown, index: number): LearnerProfileV1 | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<LearnerProfileV1>;
  if (typeof data.id !== 'string' || !data.id) return null;
  return {
    id: data.id,
    name: typeof data.name === 'string' && data.name.trim()
      ? data.name.trim().slice(0, 20)
      : `小玩家 ${index + 1}`,
    avatar: typeof data.avatar === 'string' ? data.avatar : AVATARS[index % AVATARS.length]!,
    createdAt: Number(data.createdAt) || Date.now(),
    tutorialEnabled: data.tutorialEnabled !== false,
    tutorialComplete: data.tutorialComplete === true,
    practiceCorrect: Math.max(0, Math.floor(Number(data.practiceCorrect) || 0)),
    cleared: data.cleared === true,
    earBadge: data.earBadge === true,
    completedRuns: Math.max(0, Math.floor(Number(data.completedRuns) || 0)),
    casting: parseCastingPreferences(data.casting),
    castingHistory: sanitizeHistory(data.castingHistory),
  };
}

function readStore(): LearnerProfileStoreV1 {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<LearnerProfileStoreV1>;
      const profiles = Array.isArray(data.profiles)
        ? data.profiles
            .map((profile, index) => sanitizeProfile(profile, index))
            .filter((profile): profile is LearnerProfileV1 => profile !== null)
            .slice(0, MAX_PROFILES)
        : [];
      if (data.v === 1 && profiles.length) {
        const active = profiles.some((profile) => profile.id === data.activeProfileId)
          ? data.activeProfileId!
          : profiles[0]!.id;
        const legacy = profiles.some((profile) => profile.id === data.legacyOwnerProfileId)
          ? data.legacyOwnerProfileId!
          : profiles[0]!.id;
        return { v: 1, activeProfileId: active, legacyOwnerProfileId: legacy, profiles };
      }
    }
  } catch {
    /* create a safe default */
  }
  const profile = createLegacyProfile();
  const store: LearnerProfileStoreV1 = {
    v: 1,
    activeProfileId: profile.id,
    legacyOwnerProfileId: profile.id,
    profiles: [profile],
  };
  writeStore(store);
  return store;
}

function writeStore(store: LearnerProfileStoreV1): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota: callers still receive an in-memory default */
  }
}

export function getProfiles(): LearnerProfileV1[] {
  return readStore().profiles;
}

export function getActiveProfile(): LearnerProfileV1 {
  const store = readStore();
  return store.profiles.find((profile) => profile.id === store.activeProfileId) ?? store.profiles[0]!;
}

export function getActiveProfileId(): string {
  return getActiveProfile().id;
}

export function isLegacyOwnerProfile(): boolean {
  const store = readStore();
  return store.activeProfileId === store.legacyOwnerProfileId;
}

export function updateActiveProfile(
  updater: (profile: LearnerProfileV1) => LearnerProfileV1,
): LearnerProfileV1 {
  const store = readStore();
  const index = store.profiles.findIndex((profile) => profile.id === store.activeProfileId);
  const current = store.profiles[index] ?? store.profiles[0]!;
  const next = sanitizeProfile(updater(structuredClone(current)), index) ?? current;
  store.profiles[index < 0 ? 0 : index] = next;
  writeStore(store);
  return next;
}

export function switchProfile(profileId: string): boolean {
  const store = readStore();
  if (!store.profiles.some((profile) => profile.id === profileId)) return false;
  store.activeProfileId = profileId;
  writeStore(store);
  announceProfileChange();
  return true;
}

export function createProfile(name: string, avatar: string): LearnerProfileV1 | null {
  const store = readStore();
  if (store.profiles.length >= MAX_PROFILES) return null;
  const profile: LearnerProfileV1 = {
    id: makeId(),
    name: name.trim().slice(0, 20) || `小玩家 ${store.profiles.length + 1}`,
    avatar: AVATARS.includes(avatar as (typeof AVATARS)[number]) ? avatar : AVATARS[0],
    createdAt: Date.now(),
    tutorialEnabled: true,
    tutorialComplete: false,
    practiceCorrect: 0,
    cleared: false,
    earBadge: false,
    completedRuns: 0,
    casting: defaultCastingPreferences(),
    castingHistory: { lessons: {} },
  };
  store.profiles.push(profile);
  store.activeProfileId = profile.id;
  writeStore(store);
  announceProfileChange();
  return profile;
}

export function deleteProfile(profileId: string): boolean {
  const store = readStore();
  if (store.profiles.length <= 1) return false;
  const index = store.profiles.findIndex((profile) => profile.id === profileId);
  if (index < 0) return false;
  store.profiles.splice(index, 1);
  if (store.activeProfileId === profileId) store.activeProfileId = store.profiles[0]!.id;
  const deletingLegacyOwner = store.legacyOwnerProfileId === profileId;
  if (deletingLegacyOwner) store.legacyOwnerProfileId = store.profiles[0]!.id;
  writeStore(store);
  try {
    localStorage.removeItem(`zhuyin-spire-run-v1:${profileId}`);
    // A deleted learner's legacy save must never appear in another profile.
    if (deletingLegacyOwner) localStorage.removeItem('zhuyin-spire-run-v1');
  } catch {
    /* ignore */
  }
  announceProfileChange();
  return true;
}

export function getCastingPreferences(): CastingPreferences {
  return getActiveProfile().casting;
}

export function saveCastingPreferences(preferences: CastingPreferences): CastingPreferences {
  const clean = parseCastingPreferences(preferences);
  updateActiveProfile((profile) => ({ ...profile, casting: clean }));
  return clean;
}

export function getLessonProgress(lessonFamilyId: string): LessonProgress {
  const progress = getActiveProfile().castingHistory.lessons[lessonFamilyId];
  return progress ? structuredClone(progress) : defaultLessonProgress();
}

export function saveLessonProgress(lessonFamilyId: string, progress: LessonProgress): void {
  updateActiveProfile((profile) => ({
    ...profile,
    castingHistory: {
      lessons: {
        ...profile.castingHistory.lessons,
        [lessonFamilyId]: progress,
      },
    },
  }));
}

export function recordCastingResult(
  lessonFamilyId: string,
  correct: boolean,
  responseMs: number,
): void {
  const progress = getLessonProgress(lessonFamilyId);
  progress.attempts += 1;
  if (correct) progress.correct += 1;
  progress.totalResponseMs += Math.max(0, Math.min(300_000, Math.round(responseMs)));
  progress.recentResults.push(correct);
  progress.recentResults = progress.recentResults.slice(-8);
  saveLessonProgress(lessonFamilyId, progress);
}

export function learnerAvatars(): readonly string[] {
  return AVATARS;
}

export function maxLearnerProfiles(): number {
  return MAX_PROFILES;
}
