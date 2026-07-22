/** Privacy helpers intentionally operate only on this game's browser keys. */

const APP_STORAGE_PREFIX = 'zhuyin-spire-';
const APP_EXACT_KEYS = new Set(['zhuyin-debug']);

export function isAppStorageKey(key: string): boolean {
  return key.startsWith(APP_STORAGE_PREFIX) || APP_EXACT_KEYS.has(key);
}

export function appStorageKeys(storage: Storage = localStorage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isAppStorageKey(key)) keys.push(key);
  }
  return keys;
}

export function clearAllAppData(storage: Storage = localStorage): void {
  for (const key of appStorageKeys(storage)) storage.removeItem(key);
}
