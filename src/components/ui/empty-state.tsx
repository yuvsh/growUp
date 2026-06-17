// EmptyState — design-system/MASTER.md
// Variants: with-icon | with-action | with-illustration-slot
// Rule: NEVER leave a screen blank — always tell the parent what to do next, warmly.
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  illustration?: ReactNode
  action?: ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  action,
}: EmptyStateProps): React.JSX.Element {
  // Illustrations get a roomier box so spot art can breathe; bare icons stay 64px.
  const visual = illustration ?? icon
  const visualBoxClass = illustration
    ? 'w-40 max-w-full h-auto'
    : 'w-16 h-16'

  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        'gap-[var(--space-4)]',
        'py-[var(--space-12)] px-[var(--space-6)]',
      ].join(' ')}
    >
      {visual && (
        <div
          className={[
            'flex items-center justify-center text-[var(--color-text-muted)]',
            visualBoxClass,
          ].join(' ')}
        >
          {visual}
        </div>
      )}

      <div className="flex flex-col items-center gap-[var(--space-2)] max-w-xs">
        <h3
          className={[
            'text-[var(--text-h3)]',
            'font-[var(--font-heading)]',
            'text-[var(--color-foreground)]',
            'font-semibold',
            'm-0',
          ].join(' ')}
        >
          {title}
        </h3>

        {description && (
          <p
            className={[
              'text-[var(--text-body)]',
              'text-[var(--color-text-muted)]',
              'm-0',
            ].join(' ')}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="mt-[var(--space-2)]">
          {action}
        </div>
      )}
    </div>
  )
}
