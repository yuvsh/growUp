/**
 * Storage-mode switch: chooses between the local-only repository and the
 * Supabase-backed remote repository. Persisted in localStorage so the choice
 * survives reloads. All reads/writes are defensive — a corrupt or unavailable
 * store must never crash the app; we silently fall back to `'local'`.
 */

export type StorageMode = 'local' | 'remote';

/** localStorage key under which the active storage mode is persisted. */
export const STORAGE_MODE_KEY = 'growup:storageMode';

const DEFAULT_MODE: StorageMode = 'local';

function isStorageMode(value: unknown): value is StorageMode {
  return value === 'local' || value === 'remote';
}

/**
 * Reads the persisted storage mode. Returns `'local'` if nothing is stored,
 * the stored value is invalid, or localStorage is unavailable.
 */
export function getStorageMode(): StorageMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_MODE_KEY);
    return isStorageMode(raw) ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/**
 * Persists the storage mode. Silently ignores failures (e.g. private mode,
 * quota) — the in-memory choice still applies for the current session.
 */
export function setStorageMode(mode: StorageMode): void {
  try {
    window.localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {
    // Persisting the preference is best-effort; never throw to the caller.
  }
}
