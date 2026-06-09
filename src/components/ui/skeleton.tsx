// Skeleton — design system: design-system/MASTER.md
// Variants: text | card | list-item | full-page. Base fill --color-muted, gentle pulse.
// A11y: aria-hidden; gentle pulse disabled under prefers-reduced-motion.
interface SkeletonProps {
  variant?: 'text' | 'card' | 'list-item' | 'full-page'
  count?: number
}

export function Skeleton({ variant = 'text', count = 1 }: SkeletonProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens.
  // bg-[--color-muted] rounded-[--radius-sm] animate-pulse (motion-safe only)
  return <div aria-hidden="true" data-variant={variant} data-count={count} />
}
