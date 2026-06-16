import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase/client.js';
import {
  getStorageMode,
  setStorageMode,
  type StorageMode,
} from '../lib/storageMode.js';

// ---------------------------------------------------------------------------
// Storage key for the stable anonymous user id
// ---------------------------------------------------------------------------

const ANON_USER_ID_KEY = 'growup:anonUserId';

// ---------------------------------------------------------------------------
// Types
//
// `user` stays backward-compatible: `{ id, isAnonymous }` is always present so
// existing consumers (RootRedirect, hooks) keep working. `email` is additive
// and only set for a signed-in remote user.
// ---------------------------------------------------------------------------

interface EffectiveUser {
  id: string;
  isAnonymous: boolean;
  email?: string | null;
}

/**
 * High-level auth state derived from the storage mode + the Supabase session:
 * - `loading`            — resolving the initial Supabase session (remote only)
 * - `local`              — anonymous local mode, no remote calls
 * - `remote-signed-in`   — remote mode with an active Supabase session
 * - `remote-signed-out`  — remote mode but no session (sign-in required)
 */
type AuthStatus =
  | 'loading'
  | 'local'
  | 'remote-signed-in'
  | 'remote-signed-out';

interface AuthContextValue {
  /** Effective user, or null in remote mode while signed out. */
  user: EffectiveUser | null;
  status: AuthStatus;
  mode: StorageMode;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setMode: (mode: StorageMode) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateAnonUserId(): string {
  const existing = localStorage.getItem(ANON_USER_ID_KEY);
  if (existing !== null && existing.length > 0) {
    return existing;
  }
  const newId = crypto.randomUUID();
  localStorage.setItem(ANON_USER_ID_KEY, newId);
  return newId;
}

/**
 * Returns the stable anonymous local user id, creating one if it does not yet
 * exist. Exposed so non-React callers (e.g. the remote→local migration) can
 * target the same owner id the local repository uses.
 */
export function getLocalAnonUserId(): string {
  return getOrCreateAnonUserId();
}

// OAuth redirect target — a dedicated callback route restores the session.
const AUTH_CALLBACK_PATH = '/auth/callback';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [anonUserId] = useState<string>(() => getOrCreateAnonUserId());
  const [mode, setModeState] = useState<StorageMode>(() => getStorageMode());
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  // Only remote mode with a configured client needs to resolve a session; for
  // local-only users there is nothing async to wait for.
  const [loading, setLoading] = useState<boolean>(() => isSupabaseConfigured());

  // ---- Supabase session: read once + subscribe to changes ------------------
  // Guarded so local-only users (no env) never touch the Supabase client.

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const client = getSupabaseClient();

    client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSupabaseUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        // Failing to resolve the session must not crash the app; treat as
        // signed-out and stop loading so remote mode prompts for sign-in.
        if (cancelled) return;
        setSupabaseUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ---- Actions -------------------------------------------------------------

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${AUTH_CALLBACK_PATH}`,
      },
    });
    if (error !== null) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error !== null) {
      throw error;
    }
  }, []);

  const setMode = useCallback((nextMode: StorageMode): void => {
    setStorageMode(nextMode);
    setModeState(nextMode);
  }, []);

  // ---- Derived effective identity + status ---------------------------------

  const status = deriveStatus(mode, loading, supabaseUser);
  const user = deriveUser(mode, anonUserId, supabaseUser);

  const value: AuthContextValue = {
    user,
    status,
    mode,
    signInWithGoogle,
    signOut,
    setMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function deriveStatus(
  mode: StorageMode,
  loading: boolean,
  supabaseUser: SupabaseUser | null,
): AuthStatus {
  if (mode === 'local') {
    return 'local';
  }
  if (loading) {
    return 'loading';
  }
  return supabaseUser !== null ? 'remote-signed-in' : 'remote-signed-out';
}

function deriveUser(
  mode: StorageMode,
  anonUserId: string,
  supabaseUser: SupabaseUser | null,
): EffectiveUser | null {
  if (mode === 'local') {
    return { id: anonUserId, isAnonymous: true };
  }
  if (supabaseUser !== null) {
    return {
      id: supabaseUser.id,
      isAnonymous: false,
      email: supabaseUser.email ?? null,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthStatus, EffectiveUser, AuthContextValue };
