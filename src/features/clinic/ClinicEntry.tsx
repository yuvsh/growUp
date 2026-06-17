// Clinic Mode — Entry / notice screen.
// Blueprint: docs/ui-blueprints.md → "Clinic Entry"
// Design: design-system/MASTER.md + design-system/pages/clinic.md
// Uses from ui/: Button, Card
// Philosophy: Apple — one notice, one CTA. Outside PrimaryLayout (no tabs, no guard).
// States: static intro, no async. Responsive: centered column, CTA full width on mobile.
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { t } from '../../i18n/t';

// InfoIcon — used in the notice card alongside text, never color alone.
function InfoIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 'var(--space-5)', height: 'var(--space-5)', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function ClinicEntry(): React.JSX.Element {
  const navigate = useNavigate();

  function handleStartRead(): void {
    navigate('/clinic/read');
  }

  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100dvh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background)',
        paddingBlock: 'var(--space-8)',
        paddingInline: 'var(--space-4)',
      }}
    >
      {/* Centered column — max ~480px on desktop (mirrors Onboarding) */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-6)',
        }}
      >
        {/* Heading + one-line description */}
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-display)',
              color: 'var(--color-foreground)',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {t('clinic.entry.heading')}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-lg)',
              color: 'var(--color-text-muted)',
              maxWidth: '360px',
              margin: 0,
            }}
          >
            {t('clinic.entry.description')}
          </p>
        </header>

        {/* Quiet notice card — muted surface, two notices with icon + text */}
        <aside
          aria-label="Notice about Clinic Mode"
          style={{
            width: '100%',
            backgroundColor: 'var(--color-muted)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            paddingBlock: 'var(--space-4)',
            paddingInline: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <p
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-foreground)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            <InfoIcon />
            {t('clinic.entry.noticeNotSaved')}
          </p>
          <p
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-foreground)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            <InfoIcon />
            {t('clinic.entry.noticeJudgment')}
          </p>
        </aside>

        {/* Primary CTA — full width on mobile */}
        <Button
          variant="primary"
          size="lg"
          fullWidthOnMobile
          aria-label={t('clinic.entry.cta')}
          onClick={handleStartRead}
        >
          {t('clinic.entry.cta')}
        </Button>

        {/* Back to growUp — real link, keyboard-reachable */}
        <Link
          to="/"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-primary)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-1)',
            outline: 'none',
          }}
        >
          {t('clinic.entry.back')}
        </Link>
      </div>
    </main>
  );
}
