import {
  getActiveProfile,
  isLegacyOwnerProfile,
  updateActiveProfile,
} from './profiles';

/** Parent-facing game options. Kept separate from run saves so old saves remain valid. */

const SETTINGS_KEY = 'zhuyin-spire-game-settings-v1';

export type AnimationSpeed = 1 | 2;

export interface GameSettingsV1 {
  tutorialEnabled: boolean;
  animationSpeed: AnimationSpeed;
}

/** Teaching pauses intentionally ignore animationSpeed. */
export const LEARNING_REVEAL_CONTINUE_MS = 1_200;
export const LEARNING_REVEAL_TOTAL_MS = 2_000;

export function defaultGameSettings(): GameSettingsV1 {
  return {
    tutorialEnabled: true,
    animationSpeed: 1,
  };
}

export function parseGameSettings(value: unknown): GameSettingsV1 {
  const defaults = defaultGameSettings();
  if (!value || typeof value !== 'object') return defaults;
  const data = value as Partial<GameSettingsV1>;
  return {
    tutorialEnabled:
      typeof data.tutorialEnabled === 'boolean'
        ? data.tutorialEnabled
        : defaults.tutorialEnabled,
    animationSpeed: data.animationSpeed === 2 ? 2 : 1,
  };
}

export function loadGameSettings(): GameSettingsV1 {
  const profile = getActiveProfile();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw
      ? parseGameSettings(JSON.parse(raw) as unknown)
      : defaultGameSettings();
    return { ...parsed, tutorialEnabled: profile.tutorialEnabled };
  } catch {
    return { ...defaultGameSettings(), tutorialEnabled: profile.tutorialEnabled };
  }
}

export function saveGameSettings(settings: GameSettingsV1): void {
  const clean = parseGameSettings(settings);
  updateActiveProfile((profile) => ({
    ...profile,
    tutorialEnabled: clean.tutorialEnabled,
  }));
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  } catch {
    /* private mode / quota */
  }
  applyGameSettingsToDocument(clean);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-settings-change'));
  }
}

export function updateGameSettings(
  patch: Partial<GameSettingsV1>,
): GameSettingsV1 {
  const next = parseGameSettings({ ...loadGameSettings(), ...patch });
  saveGameSettings(next);
  return next;
}

export function applyGameSettingsToDocument(
  settings: GameSettingsV1 = loadGameSettings(),
): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.gameSpeed = String(settings.animationSpeed);
}

/** Scale gameplay motion only. Teaching reveal and speech never call this helper. */
export function gameplayMs(
  ms: number,
  speed: AnimationSpeed = loadGameSettings().animationSpeed,
): number {
  return Math.max(1, Math.round(ms / speed));
}

export function isTutorialComplete(): boolean {
  return getActiveProfile().tutorialComplete;
}

export function markTutorialComplete(): void {
  updateActiveProfile((profile) => ({ ...profile, tutorialComplete: true }));
  try {
    if (isLegacyOwnerProfile()) {
      localStorage.setItem('zhuyin-spire-tutorial-complete-v1', '1');
    }
  } catch {
    /* migration mirror is best-effort */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-settings-change'));
  }
}

export function resetTutorialCompletion(): void {
  updateActiveProfile((profile) => ({ ...profile, tutorialComplete: false }));
  try {
    if (isLegacyOwnerProfile()) {
      localStorage.removeItem('zhuyin-spire-tutorial-complete-v1');
    }
  } catch {
    /* migration mirror is best-effort */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-settings-change'));
  }
}
