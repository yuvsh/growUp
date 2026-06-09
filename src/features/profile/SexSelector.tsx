// SexSelector — controlled segmented radio group for baby's sex.
// Blueprint: docs/ui-blueprints.md → "Add / Edit Child"
// Design system: design-system/MASTER.md
//
// A11y requirements (Priority 1 — non-negotiable):
//  - role="radiogroup" with a visible accessible group label
//  - Each option is a native <input type="radio"> visually styled as a segment
//  - Keyboard operable: Tab / arrow keys / Enter
//  - Visible focus ring via var(--color-ring)
//  - Touch targets ≥ 44×44px
//  - Selected state conveyed by color + check icon (not color alone)
//  - "Why we ask" helper linked to the group via aria-describedby
//  - Error text below the group with role="alert"

import { useId, useRef } from 'react';
import { t } from '../../i18n/t.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SexSelectorProps {
  value: 'male' | 'female' | null;
  onChange: (sex: 'male' | 'female') => void;
  error?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEX_OPTIONS = [
  { value: 'male', label: () => t('profile.sex.male') },
  { value: 'female', label: () => t('profile.sex.female') },
] as const satisfies ReadonlyArray<{ value: 'male' | 'female'; label: () => string }>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SexSelector({
  value,
  onChange,
  error,
  id,
}: SexSelectorProps): React.JSX.Element {
  const autoId = useId();
  const groupId = id ?? `sex-selector-${autoId}`;
  const whyId = `${groupId}-why`;
  const errorId = `${groupId}-error`;
  const labelId = `${groupId}-label`;

  // Refs to the individual radio inputs for keyboard navigation
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null]);

  const describedBy = error ? `${whyId} ${errorId}` : whyId;

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number,
  ): void {
    const { key } = event;

    if (key === 'Enter') {
      event.preventDefault();
      const option = SEX_OPTIONS[currentIndex];
      if (option !== undefined) {
        onChange(option.value);
      }
      return;
    }

    const isNext = key === 'ArrowRight' || key === 'ArrowDown';
    const isPrev = key === 'ArrowLeft' || key === 'ArrowUp';

    if (!isNext && !isPrev) return;

    event.preventDefault();

    const nextIndex = isNext
      ? (currentIndex + 1) % SEX_OPTIONS.length
      : (currentIndex - 1 + SEX_OPTIONS.length) % SEX_OPTIONS.length;

    const nextOption = SEX_OPTIONS[nextIndex];
    const nextInput = inputRefs.current[nextIndex];

    if (nextOption !== undefined && nextInput !== null) {
      nextInput.focus();
      onChange(nextOption.value);
    }
  }

  return (
    <div>
      {/* Visible label for the group — associated via aria-labelledby */}
      <span
        id={labelId}
        style={{
          display: 'block',
          marginBlockEnd: 'var(--space-2)',
          fontSize: 'var(--text-sm)',
          fontWeight: '600',
          color: 'var(--color-foreground)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {t('profile.sex.label')}
      </span>

      {/* Why-we-ask helper — linked via aria-describedby */}
      <p
        id={whyId}
        style={{
          marginBlockEnd: 'var(--space-2)',
          fontSize: 'var(--text-caption)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {t('profile.sex.why')}
      </p>

      {/* Radio group */}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
        }}
      >
        {SEX_OPTIONS.map((option, index) => {
          const isSelected = value === option.value;
          const inputId = `${groupId}-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              style={{
                // Meet ≥44×44px touch target requirement
                minHeight: '44px',
                minWidth: '44px',
                // Segmented button appearance
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
                paddingBlock: 'var(--space-2)',
                paddingInline: 'var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : '2px solid var(--color-border)',
                backgroundColor: isSelected
                  ? 'var(--color-primary)'
                  : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'background-color var(--duration-fast), border-color var(--duration-fast)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-body)',
                fontWeight: isSelected ? '700' : '400',
                color: isSelected
                  ? 'var(--color-on-primary)'
                  : 'var(--color-foreground)',
                // Reduce motion
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
              } as React.CSSProperties}
            >
              {/* Visually hidden native radio preserves full keyboard/screen-reader semantics */}
              <input
                ref={(el) => { inputRefs.current[index] = el; }}
                type="radio"
                id={inputId}
                name={groupId}
                value={option.value}
                checked={isSelected}
                aria-checked={isSelected}
                onChange={() => { onChange(option.value); }}
                onKeyDown={(e) => { handleKeyDown(e, index); }}
                // Tab stops: only the selected (or first, when none selected) is in tab order
                tabIndex={
                  isSelected || (value === null && index === 0) ? 0 : -1
                }
                style={{
                  // Visually hidden but still interactive so that keyboard/AT access works
                  position: 'absolute',
                  opacity: 0,
                  width: '1px',
                  height: '1px',
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              />
              {/* Non-color-only cue: check icon when selected */}
              {isSelected && (
                <svg
                  aria-hidden="true"
                  focusable="false"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {option.label()}
            </label>
          );
        })}
      </div>

      {/* Error message — role="alert" so it is announced by screen readers */}
      {error !== undefined && error.length > 0 && (
        <p
          id={errorId}
          role="alert"
          style={{
            marginBlockStart: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-destructive)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
