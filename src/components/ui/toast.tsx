// Toast — design system: design-system/MASTER.md
// Tones: success | error | warning | info. A11y: aria-live="polite" (assertive for error);
//        icon + text (never color-only); auto-dismiss with a pause-on-focus/hover affordance.
import type { ReactNode } from 'react'

interface ToastProps {
  tone?: 'success' | 'error' | 'warning' | 'info'
  message: string
  icon?: ReactNode
  onDismiss?: () => void
}

export function Toast({ tone = 'info', message, icon, onDismiss }: ToastProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens. Surface card, shadow-md, rounded-[--radius].
  // Used e.g. for "couldn't save" when localStorage write fails (HLD error path).
  return (
    <div role="status" aria-live={tone === 'error' ? 'assertive' : 'polite'} data-tone={tone}>
      {icon}
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss">×</button>}
    </div>
  )
}
