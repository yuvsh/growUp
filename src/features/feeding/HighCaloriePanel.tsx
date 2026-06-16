// HighCaloriePanel — Feeding screen (M3-4)
// Blueprint: docs/ui-blueprints.md → "Feeding" section (High-calorie mode)
// Design system: design-system/MASTER.md
// A11y: ≥44×44px targets, visible focus ring, aria-live region, labelled controls.
// Logical CSS only (RTL-ready). No inline styles. Copy via t().

import { t } from '../../i18n/t'
import { calorieAdjustedRange } from '../../lib/feeding/index'
import { roundMl } from '../../lib/feeding/format'
import type { HighCalorieFeedingResult } from './types'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HighCaloriePanelProps {
  weightKg: number
  feedsPerDay: number
  enabled: boolean
  /** The formula's calorie density in kcal/ml entered by the user. 0 = empty / unset. */
  kcalValue: number
  onChange: (patch: { enabled?: boolean; kcalValue?: number }) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a kcal value to 1 decimal place for display. */
function roundKcal(value: number): number {
  return Math.round(value * 10) / 10
}

/** Return true if value is a positive finite number (> 0). */
function isValidKcal(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

// ---------------------------------------------------------------------------
// Toggle button
// ---------------------------------------------------------------------------

interface ToggleProps {
  checked: boolean
  onToggle: () => void
}

function HighCalorieToggle({ checked, onToggle }: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={[
        'inline-flex items-center gap-[var(--space-3)]',
        'min-h-[44px] w-full ps-0 text-start',
        'cursor-pointer rounded-[var(--radius-sm)]',
        'text-[var(--text-body)] font-medium text-[var(--color-foreground)]',
        'bg-transparent border-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
        'motion-safe:active:scale-[0.98] transition-transform duration-[var(--duration-fast)]',
      ].join(' ')}
    >
      {/* Visual toggle track */}
      <span
        aria-hidden="true"
        className={[
          'relative inline-flex shrink-0 items-center',
          'h-[26px] w-[48px]',
          'rounded-[var(--radius-pill)]',
          'transition-colors duration-[var(--duration-normal)]',
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-muted)]',
        ].join(' ')}
      >
        {/* Thumb */}
        <span
          className={[
            'absolute top-[3px]',
            'h-[20px] w-[20px]',
            'rounded-[var(--radius-pill)]',
            'bg-[var(--color-surface)]',
            'shadow-[var(--shadow-sm)]',
            'transition-transform duration-[var(--duration-normal)]',
            checked ? 'translate-x-[25px]' : 'translate-x-[3px]',
          ].join(' ')}
        />
      </span>
      <span>{t('feeding.highCalorie.toggle')}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Results display
// ---------------------------------------------------------------------------

interface ResultsProps {
  result: HighCalorieFeedingResult
}

function HighCalorieResults({ result }: ResultsProps): React.JSX.Element {
  const { calorieTarget, adjustedDaily, adjustedPerFeed } = result

  const minKcal = roundKcal(calorieTarget.minKcal)
  const maxKcal = roundKcal(calorieTarget.maxKcal)
  const minDailyMl = roundMl(adjustedDaily.minMl)
  const maxDailyMl = roundMl(adjustedDaily.maxMl)
  const minPerFeedMl = roundMl(adjustedPerFeed.minMl)
  const maxPerFeedMl = roundMl(adjustedPerFeed.maxMl)

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {/* Calorie target */}
      <div className="flex flex-col gap-[var(--space-1)]">
        <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">
          {t('feeding.highCalorie.calorieTarget')}
        </span>
        <span className="text-[var(--text-body-lg)] font-medium text-[var(--color-foreground)]">
          {minKcal}–{maxKcal} kcal
        </span>
      </div>

      {/* Adjusted daily volume */}
      <div className="flex flex-col gap-[var(--space-1)]">
        <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">
          {t('feeding.highCalorie.adjustedRange')}
        </span>
        <span className="text-[var(--text-body-lg)] font-medium text-[var(--color-foreground)]">
          {minDailyMl}–{maxDailyMl} {t('feeding.mlPerDay')}
        </span>
      </div>

      {/* Adjusted per-feed volume */}
      <div className="flex flex-col gap-[var(--space-1)]">
        <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">
          {t('feeding.perFeed')}
        </span>
        <span className="text-[var(--text-body-lg)] font-medium text-[var(--color-foreground)]">
          {minPerFeedMl}–{maxPerFeedMl} {t('feeding.ml')}
        </span>
      </div>

      {/* Explainer */}
      <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {t('feeding.highCalorie.explainer')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * HighCaloriePanel — controlled component for high-calorie / special formula mode.
 *
 * Renders a toggle and, when enabled, a calorie density (kcal/ml) input
 * plus the calorie-adjusted daily and per-feed volume results announced via aria-live.
 */
export function HighCaloriePanel({
  weightKg,
  feedsPerDay,
  enabled,
  kcalValue,
  onChange,
}: HighCaloriePanelProps): React.JSX.Element {
  // A value of 0 is treated as "not yet entered" (empty state).
  const isValid = isValidKcal(kcalValue)
  const showError = enabled && !isValid

  // Compute result only when enabled and the input is valid.
  // kcalValue is always in kcal/ml — no conversion needed.
  let result: HighCalorieFeedingResult | null = null
  if (enabled && isValid) {
    try {
      result = calorieAdjustedRange(weightKg, kcalValue, feedsPerDay)
    } catch {
      result = null
    }
  }

  function handleToggle(): void {
    onChange({ enabled: !enabled })
  }

  function handleKcalChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const parsed = parseFloat(event.target.value)
    // 0 signals "empty / invalid" to the parent; NaN maps to 0 as well.
    onChange({ kcalValue: isNaN(parsed) || parsed < 0 ? 0 : parsed })
  }

  // Display value: show empty string when 0 (unset), otherwise show the number.
  const inputDisplayValue = kcalValue > 0 ? String(kcalValue) : ''

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        {/* Toggle */}
        <HighCalorieToggle checked={enabled} onToggle={handleToggle} />

        {/* Expanded controls — only shown when enabled */}
        {enabled && (
          <div className="flex flex-col gap-[var(--space-4)]">
            {/* Input row: calorie density field with static unit hint */}
            <div className="flex items-end gap-[var(--space-3)]">
              <div className="flex-1">
                <Input
                  id="hc-kcal-input"
                  label={t('feeding.highCalorie.kcalLabel')}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={inputDisplayValue}
                  onChange={handleKcalChange}
                  error={showError ? t('feeding.highCalorie.kcalError') : undefined}
                />
              </div>
              <span
                className={[
                  'pb-[var(--space-2)]',
                  'text-[var(--text-sm)] font-medium',
                  'text-[var(--color-text-muted)]',
                  'whitespace-nowrap',
                ].join(' ')}
              >
                {t('feeding.highCalorie.unitMl')}
              </span>
            </div>

            {/* Results — aria-live so changes announce to screen readers */}
            <div aria-live="polite" aria-atomic="true">
              {result !== null && <HighCalorieResults result={result} />}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
