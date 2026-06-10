// Badge — design-system/MASTER.md
// Tones: default | success | caution | error | muted
// A11y: NEVER status by color alone — every tone renders an icon + text label.
import type { ReactNode } from 'react'

interface BadgeProps {
  tone?: 'default' | 'success' | 'caution' | 'error' | 'muted'
  icon?: ReactNode
  children: ReactNode
}

// Default SVG icons for each tone (inline, no emoji, no deps)
function DefaultIcon({ tone }: { tone: NonNullable<BadgeProps['tone']> }): React.JSX.Element {
  switch (tone) {
    case 'success':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'caution':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2l6.5 11H1.5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
        </svg>
      )
    case 'error':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="currentColor" />
        </svg>
      )
    case 'muted':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
        </svg>
      )
  }
}

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-[var(--color-muted)] text-[var(--color-foreground)]',
  success: 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-accent-strong)]',
  caution: 'bg-[var(--color-caution-surface)] text-[var(--color-caution)]',
  error: 'bg-[color-mix(in_srgb,var(--color-destructive)_10%,transparent)] text-[var(--color-destructive)]',
  muted: 'bg-[var(--color-muted)] text-[var(--color-text-muted)]',
}

export function Badge({
  tone = 'default',
  icon,
  children,
}: BadgeProps): React.JSX.Element {
  const renderedIcon = icon ?? <DefaultIcon tone={tone} />

  return (
    <span
      className={[
        'inline-flex items-center gap-[var(--space-1)]',
        'rounded-[var(--radius-pill)]',
        'px-[var(--space-2)] py-[var(--space-1)]',
        'text-[var(--text-sm)] font-medium',
        'leading-none',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      {renderedIcon}
      {children}
    </span>
  )
}
