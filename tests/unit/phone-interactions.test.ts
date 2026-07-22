import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyCardGesture } from '../../src/ui/dragPlay';
import { PauseAwareTimerGroup } from '../../src/ui/pauseTimers';

describe('phone card gestures', () => {
  it('keeps taps pending and separates horizontal swipes from upward drags', () => {
    expect(classifyCardGesture(5, 4)).toBe('pending');
    expect(classifyCardGesture(28, 4)).toBe('scroll');
    expect(classifyCardGesture(-30, -8)).toBe('scroll');
    expect(classifyCardGesture(5, -28)).toBe('drag');
    expect(classifyCardGesture(4, 28)).toBe('cancel');
  });
});

describe('pause-aware teaching timers', () => {
  afterEach(() => vi.useRealTimers());

  it('preserves remaining time while the phone menu is open', () => {
    vi.useFakeTimers();
    let now = 0;
    let fired = 0;
    const timers = new PauseAwareTimerGroup(() => now);
    timers.set(() => {
      fired += 1;
    }, 1_000);

    now = 350;
    vi.advanceTimersByTime(350);
    timers.pause();
    now = 2_350;
    vi.advanceTimersByTime(2_000);
    expect(fired).toBe(0);

    timers.resume();
    vi.advanceTimersByTime(649);
    expect(fired).toBe(0);
    vi.advanceTimersByTime(1);
    expect(fired).toBe(1);
  });

  it('does not revive a cleared timer on resume', () => {
    vi.useFakeTimers();
    let now = 0;
    const callback = vi.fn();
    const timers = new PauseAwareTimerGroup(() => now);
    const id = timers.set(callback, 500);
    timers.pause();
    timers.clear(id);
    now = 1_000;
    timers.resume();
    vi.runAllTimers();
    expect(callback).not.toHaveBeenCalled();
  });
});
