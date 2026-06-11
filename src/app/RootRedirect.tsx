// RootRedirect — handles the "/" route.
// Checks if a child exists in the repository; redirects to /growth or /onboarding.
// Shows a loading spinner while the async check is in progress.
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { repository } from '../data/repository/index.js';
import { useAuth } from '../auth/AuthContext.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';

type RedirectTarget = 'loading' | '/growth' | '/onboarding';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100dvh',
};

export function RootRedirect(): React.JSX.Element {
  const [target, setTarget] = useState<RedirectTarget>('loading');
  const { user } = useAuth();
  const ownerId = user?.id ?? null;

  useEffect(() => {
    if (ownerId === null) {
      // No owner (remote mode, signed out) — onboarding handles sign-in.
      setTarget('/onboarding');
      return;
    }

    let cancelled = false;

    repository.children
      .list(ownerId)
      .then((children) => {
        if (!cancelled) {
          setTarget(children.length > 0 ? '/growth' : '/onboarding');
        }
      })
      .catch(() => {
        // On error, fall through to onboarding — safest default
        if (!cancelled) setTarget('/onboarding');
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (target === 'loading') {
    return (
      <div style={containerStyle}>
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}
