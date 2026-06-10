// GrowUp design tokens — mirror the CSS custom properties in src/index.css.
// Source of truth: design-system/MASTER.md. TypeScript consumers reference these
// instead of hardcoding values, so the palette stays centralized.

export const tokens = {
  color: {
    primary: 'var(--color-primary)',
    primaryHover: 'var(--color-primary-hover)',
    onPrimary: 'var(--color-on-primary)',
    secondary: 'var(--color-secondary)',
    accent: 'var(--color-accent)',
    accentStrong: 'var(--color-accent-strong)',
    background: 'var(--color-background)',
    surface: 'var(--color-surface)',
    foreground: 'var(--color-foreground)',
    textMuted: 'var(--color-text-muted)',
    muted: 'var(--color-muted)',
    border: 'var(--color-border)',
    caution: 'var(--color-caution)',
    cautionSurface: 'var(--color-caution-surface)',
    success: 'var(--color-success)',
    destructive: 'var(--color-destructive)',
    ring: 'var(--color-ring)',
  },
  font: {
    heading: 'var(--font-heading)',
    body: 'var(--font-body)',
  },
  radius: {
    sm: 'var(--radius-sm)',
    base: 'var(--radius)',
    lg: 'var(--radius-lg)',
    pill: 'var(--radius-pill)',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },
  duration: {
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    slow: 'var(--duration-slow)',
  },
} as const

export type Tokens = typeof tokens
