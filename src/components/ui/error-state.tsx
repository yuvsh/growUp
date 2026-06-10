// ErrorState — design-system/MASTER.md
// Variants: inline | full-page | with-retry
// A11y: role="alert"; plain-language message (no codes/stack traces); icon + text, never color-only.
import type { ReactNode } from 'react'
import { Button } from './button'

interface ErrorStateProps {
  variant?: 'inline' | 'full-page' | 'with-retry'
  title: string
  description?: string
  onRetry?: () => void
  icon?: ReactNode
}

function DefaultErrorIcon(): React.JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L2 21h20L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" />
    </svg>
  )
}

export function ErrorState({
  variant = 'inline',
  title,
  description,
  onRetry,
  icon,
}: ErrorStateProps): React.JSX.Element {
  const isFullPage = variant === 'full-page'
  const renderedIcon = icon ?? <DefaultErrorIcon />

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-[var(--space-3)]',
        'rounded-[var(--radius-sm)]',
        'bg-[var(--color-caution-surface)]',
        'text-[var(--color-caution)]',
        isFullPage
          ? [
              'flex-col items-center text-center justify-center',
              'p-[var(--space-8)]',
              'min-h-[50vh]',
            ].join(' ')
          : 'p-[var(--space-4)]',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'shrink-0 text-[var(--color-caution)]',
          isFullPage ? 'w-10 h-10' : 'w-5 h-5 mt-px',
        ].join(' ')}
      >
        {renderedIcon}
      </span>

      <div
        className={[
          'flex flex-col gap-[var(--space-1)]',
          isFullPage ? 'items-center' : '',
        ].join(' ')}
      >
        <p className="text-[var(--text-body)] font-semibold text-[var(--color-caution)] m-0">
          {title}
        </p>

        {description && (
          <p className="text-[var(--text-sm)] text-[var(--color-caution)] opacity-80 m-0">
            {description}
          </p>
        )}

        {(variant === 'with-retry' || variant === 'full-page') && onRetry && (
          <div className={isFullPage ? 'mt-[var(--space-4)]' : 'mt-[var(--space-3)]'}>
            <Button variant="secondary" size="sm" onClick={onRetry} type="button">
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
