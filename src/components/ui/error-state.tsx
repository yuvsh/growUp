// ErrorState — design system: design-system/MASTER.md
// Variants: inline | full-page | with-retry
// A11y: role="alert"; plain-language message (no codes/stack traces); icon + text, never color-only.
import type { ReactNode } from 'react'

interface ErrorStateProps {
  variant?: 'inline' | 'full-page' | 'with-retry'
  title: string
  description?: string
  onRetry?: () => void
  icon?: ReactNode
}

export function ErrorState({
  variant = 'inline',
  title,
  description,
  onRetry,
  icon,
}: ErrorStateProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens. Warm, non-scary. Caution tone (not hard red).
  // with-retry: render a secondary <Button> calling onRetry.
  return (
    <div role="alert" data-variant={variant}>
      {icon}
      <p>{title}</p>
      {description && <p>{description}</p>}
      {variant === 'with-retry' && onRetry && (
        <button onClick={onRetry} type="button">Retry</button>
      )}
    </div>
  )
}
