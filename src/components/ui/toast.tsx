// Toast — design-system/MASTER.md
// Tones: success | error | warning | info. A11y: aria-live="polite" (assertive for error);
//        icon + text (never color-only); optional dismiss (aria-label).
import type { ReactNode } from 'react'

interface ToastProps {
  tone?: 'success' | 'error' | 'warning' | 'info'
  message: string
  icon?: ReactNode
  onDismiss?: () => void
}

function SuccessIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill="currentColor" />
    </svg>
  )
}

function WarningIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5l5.5 9.5H2.5L8 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 7v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

function InfoIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

const TONE_CONFIG: Record<
  NonNullable<ToastProps['tone']>,
  { icon: React.JSX.Element; classes: string }
> = {
  success: {
    icon: <SuccessIcon />,
    classes: 'bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))] text-[var(--color-accent-strong)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]',
  },
  error: {
    icon: <ErrorIcon />,
    classes: 'bg-[color-mix(in_srgb,var(--color-destructive)_8%,var(--color-surface))] text-[var(--color-destructive)] border border-[color-mix(in_srgb,var(--color-destructive)_25%,transparent)]',
  },
  warning: {
    icon: <WarningIcon />,
    classes: 'bg-[var(--color-caution-surface)] text-[var(--color-caution)] border border-[color-mix(in_srgb,var(--color-caution)_30%,transparent)]',
  },
  info: {
    icon: <InfoIcon />,
    classes: 'bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]',
  },
}

export function Toast({
  tone = 'info',
  message,
  icon,
  onDismiss,
}: ToastProps): React.JSX.Element {
  const config = TONE_CONFIG[tone]
  const renderedIcon = icon ?? config.icon

  return (
    <div
      role="status"
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={[
        'flex items-start gap-[var(--space-3)]',
        'rounded-[var(--radius)]',
        'shadow-[var(--shadow-md)]',
        'p-[var(--space-4)]',
        'w-full',
        config.classes,
      ].join(' ')}
    >
      <span className="shrink-0 mt-px">{renderedIcon}</span>

      <span className="flex-1 text-[var(--text-sm)] font-medium">{message}</span>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={[
            'shrink-0 flex items-center justify-center',
            'min-h-[44px] min-w-[44px] -me-[var(--space-2)] -mt-[var(--space-2)]',
            'rounded-[var(--radius-sm)]',
            'opacity-70 hover:opacity-100',
            'transition-opacity duration-[var(--duration-fast)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
          ].join(' ')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
