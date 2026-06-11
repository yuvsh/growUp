// RootRedirect — handles the "/" route.
// Branches on the auth status (local / remote-signed-in / remote-signed-out /
// loading), then checks whether a child exists to pick the destination.
// Shows a loading spinner while the session or the async child check resolves.
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useRepository } from '../data/repository/useRepository.js';
import { useAuth } from '../auth/AuthContext.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';

type RedirectTarget =
  | 'loading'
  | '/growth'
  | '/onboarding'
  | '/profile/child';

export function RootRedirect(): React.JSX.Element {
  const [target, setTarget] = useState<RedirectTarget>('loading');
  const { user, status } = useAuth();
  const repository = useRepository();
  const ownerId = user?.id ?? null;

  useEffect(() => {
    // Resolving the Supabase session — wait for a definitive status.
    if (status === 'loading') {
      setTarget('loading');
      return;
    }

    // Remote mode but no session — onboarding shows the sign-in view.
    if (status === 'remote-signed-out' || ownerId === null) {
      setTarget('/onboarding');
      return;
    }

    // First sign-in destination differs by mode: local first-run goes to the
    // welcome/storage choice; a freshly signed-in remote user (empty cloud)
    // goes straight to add-baby.
    const emptyTarget: RedirectTarget =
      status === 'remote-signed-in' ? '/profile/child' : '/onboarding';

    let cancelled = false;

    repository.children
      .list(ownerId)
      .then((children) => {
        if (!cancelled) {
          setTarget(children.length > 0 ? '/growth' : emptyTarget);
        }
      })
      .catch(() => {
        // On error, fall through to onboarding — safest default
        if (!cancelled) setTarget('/onboarding');
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, status, repository]);

  if (target === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}
