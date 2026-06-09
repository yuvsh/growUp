// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext.js';

const ANON_USER_ID_KEY = 'growup:anonUserId';

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Create a simple in-memory storage that fully implements the Storage interface.
 * This ensures tests are isolated and don't depend on the Node.js built-in
 * localStorage (which lacks `.clear()` in Node 22+).
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe('useAuth', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('returns a user with a non-empty id', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.id).toBeTruthy();
    expect(result.current.user.isAnonymous).toBe(true);
  });

  it('generates a UUID-shaped id', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // UUID v4 pattern: 8-4-4-4-12 hex chars
    expect(result.current.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('returns the same id across re-mounts (stable across reloads)', () => {
    const first = renderHook(() => useAuth(), { wrapper });
    const firstId = first.result.current.user.id;
    first.unmount();

    const second = renderHook(() => useAuth(), { wrapper });
    const secondId = second.result.current.user.id;

    expect(secondId).toBe(firstId);
  });

  it('persists the id in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const storedId = storage.getItem(ANON_USER_ID_KEY);
    expect(storedId).toBe(result.current.user.id);
  });

  it('uses an existing id if already in localStorage', () => {
    const existingId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    storage.setItem(ANON_USER_ID_KEY, existingId);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.id).toBe(existingId);
  });

  it('throws when used outside AuthProvider', () => {
    // Suppress the React error boundary console output for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );

    spy.mockRestore();
  });
});
