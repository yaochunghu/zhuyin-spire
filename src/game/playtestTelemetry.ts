export type PlaytestEvent =
  | {
      kind: 'offer';
      at: number;
      uid: string;
      defId: string;
      upgradeLevel: 0 | 1;
      act: number;
      source: 'reward' | 'shop';
    }
  | { kind: 'pick' | 'smith' | 'remove'; at: number; uid: string; defId: string; upgradeLevel: 0 | 1 }
  | { kind: 'skip'; at: number; offeredUids: string[]; act: number }
  | {
      kind: 'combatEnd';
      at: number;
      won: boolean;
      hpLost: number;
      act: number;
      deck: Array<{ defId: string; upgradeLevel: 0 | 1 }>;
    };

const KEY = 'zhuyin-spire-playtest-v1';
const MAX_EVENTS = 10_000;

export function recordPlaytestEvent(event: PlaytestEvent): void {
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    const events = Array.isArray(existing) ? existing.slice(-MAX_EVENTS + 1) : [];
    events.push(event);
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    /* Telemetry is optional, local-only, and must never interrupt play. */
  }
}

export function exportPlaytestTelemetry(): string {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return JSON.stringify(
      { schema: 'zhuyin-spire-playtest-v1', exportedAt: Date.now(), events: Array.isArray(value) ? value : [] },
      null,
      2,
    );
  } catch {
    return JSON.stringify({ schema: 'zhuyin-spire-playtest-v1', exportedAt: Date.now(), events: [] }, null, 2);
  }
}

export function clearPlaytestTelemetry(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
