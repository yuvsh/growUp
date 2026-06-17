// AuthCallback — OAuth redirect landing.
//
// The Supabase client is configured with `detectSessionInUrl: true`, so it
// resolves the session from the URL fragment automatically on load. We wait for
// the session to settle (or for a short tick if no client is configured) and
// then route into the app. A calm spinner is shown throughout.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase/client.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100dvh',
};

export function AuthCallback(): React.JSX.Element {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    function goHome(): void {
      if (!cancelled) {
        void navigate('/', { replace: true });
      }
    }

    if (!isSupabaseConfigured()) {
      // Nothing to resolve without a configured client — return to the app.
      goHome();
      return;
    }

    // Touching getSession() ensures the client has parsed the URL session.
    getSupabaseClient()
      .then((client) => client.auth.getSession())
      .then(goHome)
      .catch(goHome);

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={containerStyle}>
      <LoadingSpinner size="lg" label="Signing you in" />
    </div>
  );
}
