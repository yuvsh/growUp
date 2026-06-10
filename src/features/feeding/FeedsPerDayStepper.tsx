// FeedsPerDayStepper — Feeding screen (M3-3)
// Blueprint: docs/ui-blueprints.md → "Feeding" section (Per-feed stepper)
// Design system: design-system/MASTER.md
// A11y: ≥44×44px targets, visible focus ring, aria-labels, aria-live announcement.
// Logical CSS only (RTL-ready). No inline styles. Copy via t().

import { t } from '../../i18n/t'
import { DEFAULT_FEEDS_PER_DAY } from '../../lib/constants/feeding'

interface FeedsPerDayStepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
}

/** Minus icon — inline SVG, accessible via parent aria-label. */
function MinusIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 10h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Plus icon — inline SVG, accessible via parent aria-label. */
function PlusIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Shared Tailwind classes for both stepper buttons.
const STEPPER_BUTTON_BASE = [
  'inline-flex items-center justify-center',
  'min-h-[44px] min-w-[44px]',
  'rounded-[var(--radius-sm)]',
  'text-[var(--color-foreground)]',
  'border border-[var(--color-border)]',
  'bg-[var(--color-surface)]',
  'transition-all duration-[var(--duration-fast)]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
  'motion-safe:active:scale-[0.98]',
].join(' ')

const STEPPER_BUTTON_ENABLED = 'hover:bg-[var(--color-muted)] cursor-pointer'

const STEPPER_BUTTON_DISABLED = 'opacity-50 cursor-not-allowed'

/**
 * FeedsPerDayStepper
 *
 * A labelled +/− stepper that controls how many feeds per day the infant receives.
 * The − button is disabled (and styled) at `min` to prevent going below it.
 * The current value is wrapped in an aria-live="polite" region so screen readers
 * announce changes when + or − is pressed.
 */
export function FeedsPerDayStepper({
  value,
  onChange,
  min = 1,
}: FeedsPerDayStepperProps): React.JSX.Element {
  const isAtMin = value <= min

  function handleDecrement(): void {
    if (isAtMin) return
    onChange(value - 1)
  }

  function handleIncrement(): void {
    onChange(value + 1)
  }

  const decrementClasses = [
    STEPPER_BUTTON_BASE,
    isAtMin ? STEPPER_BUTTON_DISABLED : STEPPER_BUTTON_ENABLED,
  ].join(' ')

  const incrementClasses = [STEPPER_BUTTON_BASE, STEPPER_BUTTON_ENABLED].join(' ')

  // DEFAULT_FEEDS_PER_DAY is imported to make it available if callers want the default.
  // It is not used directly here beyond being exported from the constants module.
  void DEFAULT_FEEDS_PER_DAY

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {/* Label */}
      <span
        id="feeds-per-day-label"
        className="text-[var(--text-sm)] font-medium text-[var(--color-foreground)]"
      >
        {t('feeding.feedsPerDay')}
      </span>

      {/* Stepper controls */}
      <div
        role="group"
        aria-labelledby="feeds-per-day-label"
        className="inline-flex items-center gap-[var(--space-3)]"
      >
        {/* Decrement */}
        <button
          type="button"
          className={decrementClasses}
          aria-label={t('feeding.stepper.decrease')}
          disabled={isAtMin}
          onClick={handleDecrement}
        >
          <MinusIcon />
        </button>

        {/* Current value — aria-live so changes are announced */}
        <span
          aria-live="polite"
          aria-atomic="true"
          className="min-w-[var(--space-6)] text-center text-[var(--text-body-lg)] font-medium text-[var(--color-foreground)]"
        >
          {value}
        </span>

        {/* Increment */}
        <button
          type="button"
          className={incrementClasses}
          aria-label={t('feeding.stepper.increase')}
          onClick={handleIncrement}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}
