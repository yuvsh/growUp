// Guard hook: redirects to /onboarding when no child exists in the repository.
// Handles the async nature of the repository with a brief loading state.
// Used by the primary-screen layout wrapper to protect child-required routes.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repository } from '../data/repository/index.js';
import { useAuth } from '../auth/AuthContext.js';

type GuardState = 'loading' | 'allowed' | 'redirecting';

/**
 * Returns the current guard state while checking whether a child exists.
 * - 'loading'     → repository check in progress; render a spinner
 * - 'allowed'     → at least one child exists; render the screen
 * - 'redirecting' → no child; navigation to /onboarding has been triggered
 */
export function useRequireChild(): GuardState {
  const [state, setState] = useState<GuardState>('loading');
  const navigate = useNavigate();
  const { user } = useAuth();

  const ownerId = user?.id ?? null;

  useEffect(() => {
    if (ownerId === null) {
      // No owner (remote mode, signed out) — there is no child to guard; send
      // the user to onboarding where the storage/sign-in choice is made.
      setState('redirecting');
      void navigate('/onboarding', { replace: true });
      return;
    }

    let cancelled = false;

    repository.children
      .list(ownerId)
      .then((children) => {
        if (cancelled) return;
        if (children.length === 0) {
          setState('redirecting');
          void navigate('/onboarding', { replace: true });
        } else {
          setState('allowed');
        }
      })
      .catch(() => {
        // On unexpected error, allow render — individual screens handle their own errors
        if (!cancelled) setState('allowed');
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, navigate]);

  return state;
}
