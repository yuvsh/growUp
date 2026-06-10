// Input — design-system/MASTER.md
// Variants via props: default | error | disabled | with-icon
// A11y: ALWAYS render a visible <label> (never placeholder-only); error text BELOW the field,
//       linked via aria-describedby; aria-invalid when error. Min height 44px.
import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { id, label, error, hint, icon, className = '', ...props },
    ref,
  ): React.JSX.Element {
    const describedBy = error
      ? `${id}-error`
      : hint
        ? `${id}-hint`
        : undefined

    return (
      <div className="flex flex-col gap-[var(--space-1)]">
        <label
          htmlFor={id}
          className="text-[var(--text-sm)] font-medium text-[var(--color-foreground)]"
        >
          {label}
        </label>

        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute start-[var(--space-3)] flex items-center text-[var(--color-text-muted)]">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            className={[
              'w-full min-h-[44px]',
              'bg-[var(--color-surface)]',
              'text-[var(--color-foreground)]',
              'text-[var(--text-body)]',
              'rounded-[var(--radius-sm)]',
              'border',
              error
                ? 'border-[var(--color-destructive)]'
                : 'border-[var(--color-border)]',
              icon ? 'ps-[calc(var(--space-3)*3)]' : 'ps-[var(--space-3)]',
              'pe-[var(--space-3)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
              'transition-colors duration-[var(--duration-fast)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
        </div>

        {hint && !error && (
          <p
            id={`${id}-hint`}
            className="text-[var(--text-caption)] text-[var(--color-text-muted)]"
          >
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-[var(--text-caption)] text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}
      </div>
    )
  },
)
