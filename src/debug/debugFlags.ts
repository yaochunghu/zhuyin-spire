/**
 * Debug enablement — no DOM.
 * On when: Vite DEV, or ?debug=1, or localStorage zhuyin-debug=1
 */

const LS_KEY = 'zhuyin-debug';

let skipCast = false;

export function isDebugEnabled(): boolean {
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
  try {
    // Vite injects import.meta.env.DEV
    if (import.meta.env?.DEV) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function setDebugPersisted(on: boolean): void {
  try {
    if (on) localStorage.setItem(LS_KEY, '1');
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export function getDebugSkipCast(): boolean {
  return skipCast;
}

export function setDebugSkipCast(on: boolean): void {
  skipCast = on;
}
