// Input — design system: design-system/MASTER.md
// Variants via props: default | error | disabled | with-icon
// A11y: ALWAYS render a visible <label> (never placeholder-only); error text BELOW the field,
//       linked via aria-describedby; aria-invalid when error. Min height 44px.
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export function Input({ id, label, error, hint, icon, ...props }: InputProps): React.JSX.Element {
  // TODO: implement with MASTER.md tokens.
  // <label htmlFor={id}> visible, text-sm, color --color-foreground
  // field: bg-[--color-surface] border border-[--color-border] rounded-[--radius-sm] min-h-[44px]
  //        ps-3 (logical) — if icon, reserve inline-start space
  // error: border-[--color-destructive], aria-invalid, message in --color-destructive below field
  // focus: ring-2 ring-[--color-ring]
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {icon}
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
      {hint && !error && <p id={`${id}-hint`}>{hint}</p>}
      {error && <p id={`${id}-error`} role="alert">{error}</p>}
    </div>
  )
}
