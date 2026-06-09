// LoadingSpinner — design system: design-system/MASTER.md
// Sizes: sm | md | lg. A11y: role="status" + visually-hidden label; motion-safe spin.
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({ size = 'md', label = 'Loading' }: LoadingSpinnerProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens. Stroke uses --color-primary; animate-spin (motion-safe).
  return (
    <span role="status" data-size={size}>
      <span className="sr-only">{label}</span>
    </span>
  )
}
