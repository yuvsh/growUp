// Button — design system: design-system/MASTER.md
// Variants: primary | secondary | ghost | destructive
// States: default | loading | disabled · Sizes: sm | md | lg
// A11y: aria-label required on icon-only usage; visible focus ring (--color-ring);
//       touch target ≥44×44px (non-negotiable). Press = gentle scale(0.98), reduced-motion safe.
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidthOnMobile?: boolean
  children?: ReactNode
}

export function Button({
  variant: _variant = 'primary',
  size: _size = 'md',
  loading = false,
  fullWidthOnMobile: _fullWidthOnMobile = false,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens. All interactive sizes keep min-h-[44px] min-w-[44px].
  // primary: bg-[--color-primary] text-[--color-on-primary] hover:bg-[--color-primary-hover]
  // secondary: border border-[--color-border] bg-[--color-surface] text-[--color-foreground]
  // ghost: transparent hover:bg-[--color-muted]
  // destructive: bg-[--color-destructive] text-white (delete confirms only — NOT for alerts)
  // loading: render <LoadingSpinner size="sm" />, disable, preserve width
  // focus: outline-2 outline-offset-2 outline-[--color-ring]
  // transition-all var(--duration-fast) var(--ease-out)
  return (
    <button disabled={loading || props.disabled} {...props}>
      {children}
    </button>
  )
}
