// Guard hook: redirects to /onboarding when no child exists (or the user must
// sign in). Handles the async repository check with a brief loading state.
// Used by the primary-screen layout wrapper to protect child-required routes.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../data/repository/useRepository.js';
import { useAuth } from '../auth/AuthContext.js';

type GuardState = 'loading' | 'allowed' | 'redirecting';

/**
 * Returns the current guard state while checking whether a child exists.
 * - 'loading'     → session/repository check in progress; render a spinner
 * - 'allowed'     → at least one child exists; render the screen
 * - 'redirecting' → no child (or sign-in required); navigating to /onboarding
 */
export function useRequireChild(): GuardState {
  const [state, setState] = useState<GuardState>('loading');
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const repository = useRepository();

  const ownerId = user?.id ?? null;

  useEffect(() => {
    // Resolving the Supabase session — keep the spinner up.
    if (status === 'loading') {
      setState('loading');
      return;
    }

    if (status === 'remote-signed-out' || ownerId === null) {
      // No session / no owner — send the user to onboarding, where the
      // storage choice and sign-in surface live.
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
  }, [ownerId, status, navigate, repository]);

  return state;
}
