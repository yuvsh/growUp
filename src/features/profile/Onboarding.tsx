// Onboarding / Welcome
// Blueprint: docs/ui-blueprints.md → "Onboarding / Welcome" (read before any visual logic)
// Design system: design-system/MASTER.md
// Uses from ui/: Button, Card, MedicalDisclaimer
// Philosophy: Apple — warm, spacious, single CTA. First impression must calm, not overwhelm.
// States: this screen IS the empty state (no child yet); brief skeleton on load; calm error+retry.
// Responsive: mobile single column (CTA full width); desktop centered max-w ~480px.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { MedicalDisclaimer } from '../../components/ui/medical-disclaimer';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { repository } from '../../data/repository/index';
import { useAuth } from '../../auth/AuthContext';
import { t } from '../../i18n/t';

type LoadState = 'checking' | 'ready';

export function Onboarding(): React.JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerId = user?.id ?? null;
  const [loadState, setLoadState] = useState<LoadState>('checking');

  // On mount: if a child already exists, redirect to /growth (defensive guard).
  // RootRedirect also handles "/" but this covers direct navigation to /onboarding.
  useEffect(() => {
    if (ownerId === null) {
      // No owner (remote mode, signed out) — show the welcome screen.
      setLoadState('ready');
      return;
    }

    let cancelled = false;

    repository.children
      .list(ownerId)
      .then((children) => {
        if (cancelled) return;
        if (children.length > 0) {
          navigate('/growth', { replace: true });
        } else {
          setLoadState('ready');
        }
      })
      .catch(() => {
        // On error, show the welcome screen — safest default for onboarding
        if (!cancelled) setLoadState('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, navigate]);

  if (loadState === 'checking') {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-[var(--color-background)]"
        aria-label="Loading"
      >
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return (
    <main
      className={[
        'flex min-h-dvh flex-col items-center justify-center',
        'bg-[var(--color-background)]',
        'px-[var(--space-4)] py-[var(--space-8)]',
      ].join(' ')}
    >
      {/* Centered column — max-w ~480px on desktop */}
      <div className="w-full max-w-[480px] flex flex-col items-center gap-[var(--space-6)]">

        {/* Soft decorative blob accent — motion-safe only, no color tokens bypassed */}
        <div
          aria-hidden="true"
          className={[
            'absolute inset-0 pointer-events-none overflow-hidden',
            '-z-10',
          ].join(' ')}
        >
          <div
            className={[
              'absolute -top-[var(--space-16)] start-1/2 -translate-x-1/2',
              'w-[320px] h-[320px]',
              'rounded-full',
              'bg-[var(--color-secondary)] opacity-20',
              'blur-[80px]',
              'motion-safe:animate-[blobDrift_12s_ease-in-out_infinite_alternate]',
            ].join(' ')}
          />
        </div>

        {/* Heading */}
        <header className="flex flex-col items-center gap-[var(--space-3)] text-center">
          <h1
            className={[
              'font-[var(--font-heading)]',
              'text-[var(--text-display)]',
              'text-[var(--color-foreground)]',
              'leading-tight',
            ].join(' ')}
          >
            {t('onboarding.welcomeTitle')}
          </h1>
          <p
            className={[
              'font-[var(--font-body)]',
              'text-[var(--text-body-lg)]',
              'text-[var(--color-text-muted)]',
              'max-w-[360px]',
            ].join(' ')}
          >
            {t('onboarding.welcomeBody')}
          </p>
        </header>

        {/* MedicalDisclaimer — block variant, non-dismissable */}
        <MedicalDisclaimer variant="block" />

        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          fullWidthOnMobile
          aria-label={t('onboarding.cta')}
          onClick={(): void => {
            navigate('/profile/child');
          }}
        >
          {t('onboarding.cta')}
        </Button>
      </div>
    </main>
  );
}
