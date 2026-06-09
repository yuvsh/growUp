// Button — design-system/MASTER.md
// Variants: primary | secondary | ghost | destructive
// States: default | loading | disabled · Sizes: sm | md | lg
// A11y: aria-label required on icon-only usage; visible focus ring (--color-ring);
//       touch target ≥44×44px (non-negotiable). Press = gentle scale(0.98), reduced-motion safe.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoadingSpinner } from './loading-spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidthOnMobile?: boolean
  children?: ReactNode
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: [
    'bg-[var(--color-primary)]',
    'text-[var(--color-on-primary)]',
    'hover:bg-[var(--color-primary-hover)]',
    'border border-transparent',
  ].join(' '),
  secondary: [
    'bg-[var(--color-surface)]',
    'text-[var(--color-foreground)]',
    'border border-[var(--color-border)]',
    'hover:bg-[var(--color-muted)]',
  ].join(' '),
  ghost: [
    'bg-transparent',
    'text-[var(--color-foreground)]',
    'border border-transparent',
    'hover:bg-[var(--color-muted)]',
  ].join(' '),
  destructive: [
    'bg-[var(--color-destructive)]',
    'text-[var(--color-on-primary)]',
    'border border-transparent',
    'hover:opacity-90',
  ].join(' '),
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-[var(--text-sm)] px-[var(--space-3)] py-[var(--space-1)] min-h-[44px] min-w-[44px]',
  md: 'text-[var(--text-body)] px-[var(--space-4)] py-[var(--space-2)] min-h-[44px] min-w-[44px]',
  lg: 'text-[var(--text-body-lg)] px-[var(--space-6)] py-[var(--space-3)] min-h-[44px] min-w-[44px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidthOnMobile = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps): React.JSX.Element {
  const isDisabled = loading || disabled

  const baseClasses = [
    'inline-flex items-center justify-center gap-[var(--space-2)]',
    'rounded-[var(--radius-sm)]',
    'font-[var(--font-body)] font-medium',
    'transition-all duration-[var(--duration-fast)]',
    'cursor-pointer',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
    'motion-safe:active:scale-[0.98]',
    isDisabled ? 'opacity-50 cursor-not-allowed' : '',
    fullWidthOnMobile ? 'w-full sm:w-auto' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      disabled={isDisabled}
      className={`${baseClasses} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
