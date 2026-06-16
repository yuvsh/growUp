import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageMode,
  setStorageMode,
  STORAGE_MODE_KEY,
} from './storageMode.js';

// jsdom in this environment ships a non-functional localStorage (no methods),
// so we install a minimal in-memory Storage stub for deterministic tests.
function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  const memoryStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  vi.stubGlobal('localStorage', memoryStorage);
}

describe('storageMode', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('defaults to "local" when nothing is stored', () => {
    expect(getStorageMode()).toBe('local');
  });

  it('round-trips a set value via get (local)', () => {
    setStorageMode('local');
    expect(getStorageMode()).toBe('local');
  });

  it('round-trips a set value via get (remote)', () => {
    setStorageMode('remote');
    expect(getStorageMode()).toBe('remote');
    expect(window.localStorage.getItem(STORAGE_MODE_KEY)).toBe('remote');
  });

  it('falls back to "local" for a garbage stored value', () => {
    window.localStorage.setItem(STORAGE_MODE_KEY, 'not-a-mode');
    expect(getStorageMode()).toBe('local');
  });

  it('falls back to "local" for an empty stored value', () => {
    window.localStorage.setItem(STORAGE_MODE_KEY, '');
    expect(getStorageMode()).toBe('local');
  });
});
