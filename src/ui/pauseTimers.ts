/**
 * Small pause-aware timer group for teaching interactions.
 *
 * Gameplay FX deliberately keep their existing animation clocks. These timers
 * cover interactions that must never complete behind the phone pause menu:
 * cast auto-submit, answer reveals, and short speech-start delays.
 */

interface TimerEntry {
  callback: () => void;
  remainingMs: number;
  startedAt: number;
  handle?: number;
}

export class PauseAwareTimerGroup {
  private readonly timers = new Map<number, TimerEntry>();
  private nextId = 1;
  private readonly pauseReasons = new Set<string>();

  constructor(private readonly now: () => number = () => performance.now()) {}

  set(callback: () => void, delayMs: number): number {
    const id = this.nextId;
    this.nextId += 1;
    const entry: TimerEntry = {
      callback,
      remainingMs: Math.max(0, delayMs),
      startedAt: this.now(),
    };
    this.timers.set(id, entry);
    if (!this.isPaused()) this.arm(id, entry);
    return id;
  }

  clear(id?: number): void {
    if (id == null) return;
    const entry = this.timers.get(id);
    if (!entry) return;
    if (entry.handle != null) globalThis.clearTimeout(entry.handle);
    this.timers.delete(id);
  }

  pause(reason = 'manual'): void {
    const alreadyPaused = this.isPaused();
    this.pauseReasons.add(reason);
    if (alreadyPaused) return;
    const at = this.now();
    for (const entry of this.timers.values()) {
      if (entry.handle == null) continue;
      globalThis.clearTimeout(entry.handle);
      entry.handle = undefined;
      entry.remainingMs = Math.max(0, entry.remainingMs - (at - entry.startedAt));
    }
  }

  resume(reason = 'manual'): void {
    if (!this.pauseReasons.delete(reason) || this.isPaused()) return;
    for (const [id, entry] of this.timers) this.arm(id, entry);
  }

  isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  private arm(id: number, entry: TimerEntry): void {
    entry.startedAt = this.now();
    entry.handle = globalThis.setTimeout(() => {
      if (!this.timers.delete(id)) return;
      entry.handle = undefined;
      entry.callback();
    }, entry.remainingMs);
  }
}

export const teachingTimers = new PauseAwareTimerGroup();
