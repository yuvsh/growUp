// Onboarding / Welcome + storage choice (SYNC-1/2)
// Blueprint: docs/PRD-remote-sync.md → SYNC-1/2; design-system/MASTER.md
// Uses from ui/: Button, Card, MedicalDisclaimer, LoadingSpinner
// Philosophy: calm Organic-Biophilic — explain the choice plainly, never overwhelm.
// States: storage choice (first run / local) · sign-in view (remote-signed-out) ·
//         brief checking spinner · calm sign-in error.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { MedicalDisclaimer } from '../../components/ui/medical-disclaimer';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { useRepository } from '../../data/repository/useRepository';
import { useAuth } from '../../auth/AuthContext';
import { t } from '../../i18n/t';

type LoadState = 'checking' | 'ready';

// Inline SVG icons (Lucide-style, currentColor) — icon + text, never color alone.
function DeviceIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-[var(--space-6)] w-[var(--space-6)] shrink-0 text-[var(--color-primary)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function CloudIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-[var(--space-6)] w-[var(--space-6)] shrink-0 text-[var(--color-primary)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 9.5 4.5 4.5 0 0 0 6.5 19Z" />
      <path d="M12 12v6" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
}

interface StorageOptionProps {
  icon: React.JSX.Element;
  title: string;
  body: string;
  disabled: boolean;
  onSelect: () => void;
}

function StorageOption({
  icon,
  title,
  body,
  disabled,
  onSelect,
}: StorageOptionProps): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={title}
      className={[
        'w-full text-start rounded-[var(--radius)]',
        'min-h-[44px]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <Card variant="hover">
        <div className="flex items-start gap-[var(--space-4)]">
          {icon}
          <div className="flex flex-col gap-[var(--space-1)]">
            <span
              className={[
                'font-[var(--font-heading)]',
                'text-[var(--text-body-lg)]',
                'text-[var(--color-foreground)]',
              ].join(' ')}
            >
              {title}
            </span>
            <span
              className={[
                'font-[var(--font-body)]',
                'text-[var(--text-sm)]',
                'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {body}
            </span>
          </div>
        </div>
      </Card>
    </button>
  );
}

export function Onboarding(): React.JSX.Element {
  const navigate = useNavigate();
  const { user, status, setMode, signInWithGoogle } = useAuth();
  const repository = useRepository();
  const ownerId = user?.id ?? null;
  const [loadState, setLoadState] = useState<LoadState>('checking');
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [signInFailed, setSignInFailed] = useState<boolean>(false);

  // On mount: if a child already exists, redirect to /growth (defensive guard).
  // RootRedirect also handles "/" but this covers direct navigation to /onboarding.
  useEffect(() => {
    if (ownerId === null) {
      // No owner (remote mode, signed out) — show the sign-in view.
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
  }, [ownerId, navigate, repository]);

  async function handleSignIn(): Promise<void> {
    setSignInFailed(false);
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // On success the browser redirects to Google; the loading state persists.
    } catch {
      // Redirect failed before leaving — show a calm message, keep local available.
      setSigningIn(false);
      setSignInFailed(true);
    }
  }

  function handleChooseDevice(): void {
    setMode('local');
    navigate('/profile/child');
  }

  async function handleChooseSync(): Promise<void> {
    setMode('remote');
    await handleSignIn();
  }

  if (loadState === 'checking') {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-[var(--color-background)]"
        aria-label={t('auth.signingIn')}
      >
        <LoadingSpinner size="lg" label={t('auth.signingIn')} />
      </div>
    );
  }

  const isSignedOut = status === 'remote-signed-out';

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
        {/* Soft decorative blob accent — motion-safe only */}
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

        {isSignedOut ? (
          <SignInView
            signingIn={signingIn}
            signInFailed={signInFailed}
            onSignIn={handleSignIn}
          />
        ) : (
          <StorageChoiceView
            signingIn={signingIn}
            signInFailed={signInFailed}
            onChooseDevice={handleChooseDevice}
            onChooseSync={handleChooseSync}
          />
        )}
      </div>
    </main>
  );
}

interface SignInViewProps {
  signingIn: boolean;
  signInFailed: boolean;
  onSignIn: () => void;
}

function SignInView({
  signingIn,
  signInFailed,
  onSignIn,
}: SignInViewProps): React.JSX.Element {
  return (
    <>
      <header className="flex flex-col items-center gap-[var(--space-3)] text-center">
        <h1
          className={[
            'font-[var(--font-heading)]',
            'text-[var(--text-display)]',
            'text-[var(--color-foreground)]',
            'leading-tight',
          ].join(' ')}
        >
          {t('auth.signInTitle')}
        </h1>
        <p
          className={[
            'font-[var(--font-body)]',
            'text-[var(--text-body-lg)]',
            'text-[var(--color-text-muted)]',
            'max-w-[360px]',
          ].join(' ')}
        >
          {t('auth.signInBody')}
        </p>
      </header>

      {signInFailed ? <SignInError /> : null}

      <Button
        variant="primary"
        size="lg"
        fullWidthOnMobile
        loading={signingIn}
        aria-label={t('auth.signInWithGoogle')}
        onClick={onSignIn}
      >
        {signingIn ? t('auth.signingIn') : t('auth.signInWithGoogle')}
      </Button>
    </>
  );
}

interface StorageChoiceViewProps {
  signingIn: boolean;
  signInFailed: boolean;
  onChooseDevice: () => void;
  onChooseSync: () => void;
}

function StorageChoiceView({
  signingIn,
  signInFailed,
  onChooseDevice,
  onChooseSync,
}: StorageChoiceViewProps): React.JSX.Element {
  return (
    <>
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

      {/* Storage choice — radio-group of two large tappable options */}
      <div
        role="radiogroup"
        aria-label={t('onboarding.storage.title')}
        className="w-full flex flex-col gap-[var(--space-3)]"
      >
        <h2
          className={[
            'font-[var(--font-heading)]',
            'text-[var(--text-body-lg)]',
            'text-[var(--color-foreground)]',
            'text-center',
          ].join(' ')}
        >
          {t('onboarding.storage.title')}
        </h2>

        <StorageOption
          icon={<DeviceIcon />}
          title={t('onboarding.storage.deviceTitle')}
          body={t('onboarding.storage.deviceBody')}
          disabled={signingIn}
          onSelect={onChooseDevice}
        />

        <StorageOption
          icon={<CloudIcon />}
          title={t('onboarding.storage.syncTitle')}
          body={t('onboarding.storage.syncBody')}
          disabled={signingIn}
          onSelect={onChooseSync}
        />
      </div>

      {signingIn ? (
        <p
          role="status"
          className={[
            'font-[var(--font-body)]',
            'text-[var(--text-sm)]',
            'text-[var(--color-text-muted)]',
          ].join(' ')}
        >
          {t('auth.signingIn')}
        </p>
      ) : null}

      {signInFailed ? <SignInError /> : null}
    </>
  );
}

function SignInError(): React.JSX.Element {
  return (
    <p
      role="alert"
      className={[
        'font-[var(--font-body)]',
        'text-[var(--text-sm)]',
        'text-[var(--color-destructive)]',
        'text-center',
      ].join(' ')}
    >
      {t('auth.signInError')}
    </p>
  );
}
