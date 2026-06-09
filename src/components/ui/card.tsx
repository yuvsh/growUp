// Card — design system: design-system/MASTER.md
// Variants: default | hover | selected. Organic look: rounded-[--radius], shadow-sm, bg surface.
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'selected'
  children?: ReactNode
}

export function Card({ variant: _variant = 'default', children, ...props }: CardProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens.
  // base: bg-[--color-surface] rounded-[--radius] shadow-sm p-[--space-4] border border-transparent
  // hover: hover:shadow-md transition-shadow var(--duration-normal)
  // selected: border-[--color-primary]
  return <div {...props}>{children}</div>
}
