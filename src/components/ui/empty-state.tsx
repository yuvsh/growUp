// EmptyState — design system: design-system/MASTER.md
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
  // TODO: implement with MASTER.md tokens. Centered, generous whitespace (Apple anchor),
  // soft organic illustration slot, calm copy via t(). Title h3, description --color-text-muted.
  return (
    <div>
      {illustration ?? icon}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
