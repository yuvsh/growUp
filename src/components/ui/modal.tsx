// Modal — design system: design-system/MASTER.md
// Variants: default | with-footer. On mobile, present as a bottom sheet (rounded-t-[--radius-lg]).
// A11y: role="dialog" aria-modal; focus trap; Escape closes; return focus to trigger;
//       backdrop click closes; respect prefers-reduced-motion for the slide-up.
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, onClose, title, footer, children }: ModalProps): React.JSX.Element | null {
  // TODO: implement with MASTER.md tokens. Backdrop rgba overlay; panel bg-[--color-surface]
  // shadow-lg rounded-[--radius-lg]; slide-up on mobile; trap focus; wire Escape + backdrop to onClose.
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <header>{title}</header>
      <div>{children}</div>
      {footer && <footer>{footer}</footer>}
      <button type="button" onClick={onClose} aria-label="Close">×</button>
    </div>
  )
}
