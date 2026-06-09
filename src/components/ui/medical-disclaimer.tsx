// MedicalDisclaimer — design-system/MASTER.md + docs/ui-blueprints.md "Shared — MedicalDisclaimer"
// Non-dismissable (no close button). Two presentations via `variant` prop:
//   "footer" — compact persistent footer inside the main layout
//   "block"  — larger display variant for the onboarding screen
// Text from t('disclaimer.body'). Contrast ≥4.5:1 (--color-foreground / --color-text-muted on surface).
import { t } from '../../i18n/t.js';

interface MedicalDisclaimerProps {
  variant: 'footer' | 'block';
}

const DISCLAIMER_TEXT = t('disclaimer.body');

function containerStyle(variant: 'footer' | 'block'): React.CSSProperties {
  if (variant === 'footer') {
    return {
      paddingBlock: 'var(--space-3)',
      paddingInline: 'var(--space-4)',
      backgroundColor: 'var(--color-muted)',
      borderTop: '1px solid var(--color-border)',
    };
  }
  // block variant — used in onboarding
  return {
    paddingBlock: 'var(--space-4)',
    paddingInline: 'var(--space-6)',
    backgroundColor: 'var(--color-muted)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
  };
}

function textStyle(variant: 'footer' | 'block'): React.CSSProperties {
  if (variant === 'footer') {
    return {
      margin: 0,
      fontSize: 'var(--text-caption)',
      color: 'var(--color-text-muted)',
      lineHeight: 1.5,
      textAlign: 'center',
      fontFamily: 'var(--font-body)',
    };
  }
  return {
    margin: 0,
    fontSize: 'var(--text-sm)',
    color: 'var(--color-foreground)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
  };
}

export function MedicalDisclaimer({ variant }: MedicalDisclaimerProps): React.JSX.Element {
  return (
    <aside
      aria-label="Medical disclaimer"
      style={containerStyle(variant)}
    >
      <p style={textStyle(variant)}>{DISCLAIMER_TEXT}</p>
    </aside>
  );
}
