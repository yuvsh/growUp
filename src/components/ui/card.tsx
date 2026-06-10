// Card — design-system/MASTER.md
// Variants: default | hover | selected. Organic look: rounded-[--radius], shadow-sm, bg surface.
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'selected'
  children?: ReactNode
}

const VARIANT_CLASSES: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'border border-transparent',
  hover: [
    'border border-transparent',
    'transition-shadow duration-[var(--duration-normal)]',
    'hover:shadow-[var(--shadow-md)]',
  ].join(' '),
  selected: 'border border-[var(--color-primary)]',
}

export function Card({
  variant = 'default',
  children,
  className = '',
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={[
        'bg-[var(--color-surface)]',
        'rounded-[var(--radius)]',
        'shadow-[var(--shadow-sm)]',
        'p-[var(--space-4)]',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
