// Modal — design-system/MASTER.md
// Variants: default | with-footer. On mobile, present as a bottom sheet (rounded-t-[--radius-lg]).
// A11y: role="dialog" aria-modal; focus trap; Escape closes; return focus to trigger;
//       backdrop click closes; respect prefers-reduced-motion for the slide-up.
import { useEffect, useRef, useCallback } from 'react'
import type { ReactNode, KeyboardEvent } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  footer?: ReactNode
  children: ReactNode
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Modal({
  open,
  onClose,
  title,
  footer,
  children,
}: ModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  // Store and restore focus
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
      // Defer so the panel is painted first
      const timer = setTimeout(() => {
        const panel = panelRef.current
        if (!panel) return
        const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTORS)
        firstFocusable?.focus()
      }, 0)
      return (): void => clearTimeout(timer)
    } else {
      const el = triggerRef.current
      if (el instanceof HTMLElement) {
        el.focus()
      }
    }
  }, [open])

  // Escape to close + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      )
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    },
    [onClose],
  )

  if (!open) return null

  return (
    // Backdrop
    <div
      className={[
        'fixed inset-0 z-[100]',
        'flex items-end sm:items-center justify-center',
        'bg-[var(--color-foreground)]/40',
        'p-0 sm:p-[var(--space-4)]',
      ].join(' ')}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'relative z-10 w-full',
          // Mobile: bottom sheet feel
          'rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)]',
          'max-h-[90vh] sm:max-w-lg overflow-y-auto',
          'bg-[var(--color-surface)]',
          'shadow-[var(--shadow-lg)]',
          'flex flex-col',
          // Slide-up animation — motion-safe
          'motion-safe:animate-[modal-in_var(--duration-normal)_var(--ease-out)_both]',
        ].join(' ')}
        onClick={(e): void => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-[var(--space-4)] p-[var(--space-6)] border-b border-[var(--color-border)]">
          <h2
            className="text-[var(--text-h3)] font-[var(--font-heading)] font-semibold text-[var(--color-foreground)] m-0"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={[
              'flex items-center justify-center',
              'min-h-[44px] min-w-[44px]',
              'rounded-[var(--radius-sm)]',
              'text-[var(--color-text-muted)]',
              'hover:bg-[var(--color-muted)]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
            ].join(' ')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-[var(--space-6)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-[var(--space-6)] border-t border-[var(--color-border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
