// Logo — the growUp brand mark + wordmark.
//
// The mark is the "sprout on a growth curve": a rising cyan curve (echoing the
// WHO percentile line) ending in a green sprout. Rendered inline so it themes
// via the brand tokens and stays crisp at any size. The wordmark reuses the
// app's already-loaded heading font (Varela Round).
//
// Variants:
//   - 'full' (default): mark + "growUp" wordmark, laid out inline.
//   - 'mark':           just the mark (e.g. compact headers).
import React from 'react';

interface LogoProps {
  /** 'full' shows the wordmark next to the mark; 'mark' shows the mark only. */
  variant?: 'full' | 'mark';
  /** Mark height in pixels (the wordmark scales with it). */
  size?: number;
  /** Accessible name. Decorative siblings can pass an empty string + aria-hidden. */
  title?: string;
  className?: string;
}

/** The sprout-on-a-curve mark as a standalone, square SVG. */
function Mark({ size, title }: { size: number; title: string }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title === '' ? undefined : title}
      aria-hidden={title === '' ? true : undefined}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M12 50 C 20 49, 27 46, 31 40 C 34 36, 35 33, 36 30"
          stroke="var(--color-primary)"
          strokeWidth="5"
        />
        <path d="M36 31 L 36 19" stroke="var(--color-accent)" strokeWidth="4.5" />
      </g>
      <ellipse
        cx="29"
        cy="17"
        rx="9"
        ry="4.6"
        fill="var(--color-accent)"
        transform="rotate(-35 29 17)"
      />
      <ellipse
        cx="44"
        cy="16"
        rx="9"
        ry="4.6"
        fill="var(--color-accent)"
        transform="rotate(35 44 16)"
      />
    </svg>
  );
}

export function Logo({
  variant = 'full',
  size = 40,
  title = 'GrowUp',
  className,
}: LogoProps): React.JSX.Element {
  if (variant === 'mark') {
    return (
      <span className={className} style={{ display: 'inline-flex' }}>
        <Mark size={size} title={title} />
      </span>
    );
  }

  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
    >
      {/* Mark is decorative here — the wordmark text carries the label. */}
      <Mark size={size} title="" />
      <span
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: `${size * 0.7}px`,
          lineHeight: 1,
          letterSpacing: '-0.01em',
          color: 'var(--color-foreground)',
        }}
      >
        grow<span style={{ color: 'var(--color-primary)' }}>Up</span>
      </span>
    </span>
  );
}
