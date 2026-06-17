// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const ANON_USER_ID_KEY = 'growup:anonUserId';

// ---------------------------------------------------------------------------
// Mock the Supabase client + config guard so no real network is touched.
// `signInWithOAuth` / `signOut` are vi.fn()s we can assert against.
// ---------------------------------------------------------------------------

const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetSession = vi
  .fn()
  .mockResolvedValue({ data: { session: null } });
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
}));

const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    onAuthStateChange: mockOnAuthStateChange,
    signInWithOAuth: mockSignInWithOAuth,
    signOut: mockSignOut,
  },
};

let supabaseConfigured = false;

vi.mock('../lib/supabase/client.js', () => ({
  getSupabaseClient: (): Promise<typeof mockSupabaseClient> =>
    Promise.resolve(mockSupabaseClient),
  isSupabaseConfigured: () => supabaseConfigured,
}));

// ---------------------------------------------------------------------------
// Mock storage mode so each test controls the active mode.
// ---------------------------------------------------------------------------

let storageMode: 'local' | 'remote' = 'local';

vi.mock('../lib/storageMode.js', () => ({
  getStorageMode: () => storageMode,
  setStorageMode: (mode: 'local' | 'remote') => {
    storageMode = mode;
  },
}));

import { AuthProvider, useAuth } from './AuthContext.js';

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Create a simple in-memory storage that fully implements the Storage interface.
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
    vi.clearAllMocks();
    supabaseConfigured = false;
    storageMode = 'local';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  // ---- Local mode (default) ------------------------------------------------

  it('defaults to local mode with a stable anonymous user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.mode).toBe('local');
    expect(result.current.status).toBe('local');
    expect(result.current.user?.id).toBeTruthy();
    expect(result.current.user?.isAnonymous).toBe(true);
  });

  it('generates a UUID-shaped anonymous id', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('returns the same anonymous id across re-mounts', () => {
    const first = renderHook(() => useAuth(), { wrapper });
    const firstId = first.result.current.user?.id;
    first.unmount();

    const second = renderHook(() => useAuth(), { wrapper });
    const secondId = second.result.current.user?.id;

    expect(secondId).toBe(firstId);
  });

  it('persists the anonymous id in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(storage.getItem(ANON_USER_ID_KEY)).toBe(result.current.user?.id);
  });

  it('does not call Supabase in local mode with no env', () => {
    renderHook(() => useAuth(), { wrapper });
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockOnAuthStateChange).not.toHaveBeenCalled();
  });

  it('does not call Supabase in local mode even when env IS configured', async () => {
    // Regression guard for the configured≠chose-remote bug: a local user on a
    // deploy where the Supabase env vars are present must still make ZERO
    // Supabase calls (and therefore never load the client library).
    supabaseConfigured = true;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('local'));

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockOnAuthStateChange).not.toHaveBeenCalled();
  });

  // ---- setMode('remote') with no session -----------------------------------

  it('setMode("remote") with no session → remote-signed-out and null user', async () => {
    supabaseConfigured = true;
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for the initial session resolution to settle.
    await waitFor(() => expect(result.current.status).toBe('local'));

    act(() => {
      result.current.setMode('remote');
    });

    await waitFor(() =>
      expect(result.current.status).toBe('remote-signed-out'),
    );
    expect(result.current.user).toBeNull();
    expect(result.current.mode).toBe('remote');
  });

  // ---- Actions -------------------------------------------------------------

  it('signInWithGoogle calls supabase signInWithOAuth with the google provider', async () => {
    supabaseConfigured = true;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('signOut calls supabase signOut', async () => {
    supabaseConfigured = true;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
    spy.mockRestore();
  });
});
