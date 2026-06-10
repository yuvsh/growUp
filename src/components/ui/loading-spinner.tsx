// LoadingSpinner — design-system/MASTER.md
// Sizes: sm | md | lg. A11y: role="status" + visually-hidden label; motion-safe spin.

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
} as const

export function LoadingSpinner({
  size = 'md',
  label = 'Loading',
}: LoadingSpinnerProps): React.JSX.Element {
  return (
    <span role="status" className="inline-flex items-center justify-center">
      <svg
        className={`${SIZE_MAP[size]} motion-safe:animate-spin text-[var(--color-primary)]`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
