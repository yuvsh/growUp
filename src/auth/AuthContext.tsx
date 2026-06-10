import { createContext, useContext, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Storage key for the stable anonymous user id
// ---------------------------------------------------------------------------

const ANON_USER_ID_KEY = 'growup:anonUserId';

// ---------------------------------------------------------------------------
// Types — the swap point: in a future phase, `isAnonymous` becomes optional
// and `User` can carry email/session data. Components never need to change.
// ---------------------------------------------------------------------------

interface AnonymousUser {
  id: string;
  isAnonymous: true;
}

interface AuthContextValue {
  user: AnonymousUser;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
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

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user] = useState<AnonymousUser>(() => ({
    id: getOrCreateAnonUserId(),
    isAnonymous: true,
  }));

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
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
