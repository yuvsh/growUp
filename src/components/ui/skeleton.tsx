// Skeleton — design-system/MASTER.md
// Variants: text | card | list-item | full-page. Base fill --color-muted, gentle pulse.
// A11y: aria-hidden; gentle pulse disabled under prefers-reduced-motion.
interface SkeletonProps {
  variant?: 'text' | 'card' | 'list-item' | 'full-page'
  count?: number
}

const BASE_CLASSES = 'bg-[var(--color-muted)] motion-safe:animate-pulse'

function SingleSkeleton({ variant }: { variant: NonNullable<SkeletonProps['variant']> }): React.JSX.Element {
  switch (variant) {
    case 'text':
      return (
        <div
          aria-hidden="true"
          className={`${BASE_CLASSES} h-4 rounded-[var(--radius-sm)] w-full`}
        />
      )
    case 'card':
      return (
        <div
          aria-hidden="true"
          className={`${BASE_CLASSES} h-[120px] rounded-[var(--radius)] w-full`}
        />
      )
    case 'list-item':
      return (
        <div
          aria-hidden="true"
          className="flex items-center gap-[var(--space-3)] w-full"
        >
          <div className={`${BASE_CLASSES} h-10 w-10 rounded-[var(--radius-pill)] shrink-0`} />
          <div className="flex flex-col gap-[var(--space-2)] flex-1">
            <div className={`${BASE_CLASSES} h-4 rounded-[var(--radius-sm)] w-3/4`} />
            <div className={`${BASE_CLASSES} h-3 rounded-[var(--radius-sm)] w-1/2`} />
          </div>
        </div>
      )
    case 'full-page':
      return (
        <div
          aria-hidden="true"
          className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]"
        >
          <div className={`${BASE_CLASSES} h-8 rounded-[var(--radius-sm)] w-1/2`} />
          <div className={`${BASE_CLASSES} h-[200px] rounded-[var(--radius)] w-full`} />
          <div className={`${BASE_CLASSES} h-4 rounded-[var(--radius-sm)] w-full`} />
          <div className={`${BASE_CLASSES} h-4 rounded-[var(--radius-sm)] w-5/6`} />
          <div className={`${BASE_CLASSES} h-4 rounded-[var(--radius-sm)] w-4/6`} />
        </div>
      )
  }
}

export function Skeleton({ variant = 'text', count = 1 }: SkeletonProps): React.JSX.Element {
  const items = Array.from({ length: Math.max(1, count) }, (_, i) => i)

  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-[var(--space-2)] w-full"
    >
      {items.map((i) => (
        <SingleSkeleton key={i} variant={variant} />
      ))}
    </div>
  )
}
