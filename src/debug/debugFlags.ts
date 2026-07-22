/**
 * Debug enablement — no DOM.
 * Production builds exclude debug UI unless explicitly built with
 * VITE_ENABLE_DEBUG_TOOLS=true. Query/localStorage switches can only activate
 * tools inside one of those debug-capable builds.
 */

const LS_KEY = 'zhuyin-debug';

let skipCast = false;

export const DEBUG_BUILD_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true';

export function isDebugEnabled(): boolean {
  if (!DEBUG_BUILD_ENABLED) return false;
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('debug') === '1' || q.get('debug') === 'true') return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (localStorage.getItem(LS_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return DEBUG_BUILD_ENABLED;
}

export function setDebugPersisted(on: boolean): void {
  try {
    if (!DEBUG_BUILD_ENABLED) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    if (on) localStorage.setItem(LS_KEY, '1');
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export function getDebugSkipCast(): boolean {
  return DEBUG_BUILD_ENABLED && skipCast;
}

export function setDebugSkipCast(on: boolean): void {
  skipCast = DEBUG_BUILD_ENABLED && on;
}
