// Badge — design system: design-system/MASTER.md
// Tones: default | success | caution | error | muted
// A11y: NEVER status by color alone — every tone renders an icon + text label.
import type { ReactNode } from 'react'

interface BadgeProps {
  tone?: 'default' | 'success' | 'caution' | 'error' | 'muted'
  icon?: ReactNode
  children: ReactNode
}

export function Badge({ tone = 'default', icon, children }: BadgeProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens. Pill radius (--radius-pill), text-sm.
  // success: bg tint of --color-success; caution: --color-caution-surface / --color-caution text
  // error: subtle --color-destructive; ALWAYS include icon so meaning isn't color-only.
  return (
    <span data-tone={tone}>
      {icon}
      {children}
    </span>
  )
}
