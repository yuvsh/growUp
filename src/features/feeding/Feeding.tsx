// Feeding calculator
// Blueprint: docs/ui-blueprints.md → "Feeding"
// Design system: design-system/MASTER.md
// Uses from ui/: Card, Input, Button, Badge, EmptyState, BottomTabs
// Screen components to create: FeedsPerDayStepper.tsx, HighCaloriePanel.tsx
// Philosophy: Apple — calm calculator, transparent math.
// Data: repository.feedingConfig (persist prefs) + lib/feeding (pure math).
// Constants (named, configurable): mlPerKgMin=120, mlPerKgMax=200, standard density 0.67 kcal/ml.
// States: no weight → EmptyState "Enter a weight to see feeding amounts" (+ link to add a weight);
//         errors: "Enter a valid weight" / "Feeds per day must be at least 1" / "Enter your formula's calories".
// Results announced via aria-live="polite" on input change.

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n/t'
import { useChild } from '../../lib/hooks/useChild'
import { useWeights } from '../../lib/hooks/useWeights'
import { useFeeding } from '../../lib/hooks/useFeeding'
import { dailyVolumeRange, perFeed } from '../../lib/feeding/index'
import { ageFromDob, formatAge } from '../../lib/growth/age'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { EmptyState } from '../../components/ui/empty-state'
import { FeedsPerDayStepper } from './FeedsPerDayStepper'
import { HighCaloriePanel } from './HighCaloriePanel'
import { IntakeVsNeed } from './IntakeVsNeed'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rounds a ml value to the nearest integer for display. */
function roundMl(value: number): number {
  return Math.round(value)
}

/** Returns true when a string represents a positive finite number. */
function isValidWeightString(value: string): boolean {
  const parsed = parseFloat(value)
  return value.trim().length > 0 && Number.isFinite(parsed) && parsed > 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Feeding(): React.JSX.Element {
  const { child } = useChild()
  const childId = child?.id ?? null

  const { weights } = useWeights(childId)
  const { config, saveConfig } = useFeeding(childId)

  // Derive the prefill weight from the latest weight entry (grams → kg).
  // Entries from useWeights are sorted ascending by date, so the last element is latest.
  const latestEntry = weights.length > 0 ? weights[weights.length - 1] : undefined
  const prefillKg: string =
    latestEntry !== undefined ? String(latestEntry.weightGrams / 1000) : ''

  // Local weight input state — initialised from the prefill once available.
  const [weightInput, setWeightInput] = useState<string>(prefillKg)
  const [weightDirty, setWeightDirty] = useState<boolean>(false)

  // Sync the weight input when the prefill arrives from the hook.
  // Only overwrite when the field is still at its initial empty state, i.e.
  // we have not yet received a prefill and the user has not typed anything.
  useEffect(() => {
    if (prefillKg !== '' && weightInput === '') {
      setWeightInput(prefillKg)
    }
  }, [prefillKg, weightInput])

  // ---- Derived state -------------------------------------------------------

  const weightKg: number | null = isValidWeightString(weightInput)
    ? parseFloat(weightInput)
    : null

  const showWeightError: boolean = weightDirty && weightInput.trim() !== '' && weightKg === null

  // Whether we have no weight at all — no prefill and field is empty.
  const hasNoPrefill: boolean = prefillKg === ''
  const fieldIsEmpty: boolean = weightInput.trim() === ''
  const showEmptyState: boolean = hasNoPrefill && fieldIsEmpty && !weightDirty

  // ---- Config values (with safe fallbacks) ---------------------------------

  const feedsPerDay: number = config?.feedsPerDay ?? 8
  const useHighCalorie: boolean = config?.useHighCalorie ?? false

  // The stored kcalPerMl is used directly (always kcal/ml — no unit conversion).
  const storedKcalPerMl: number = config?.kcalPerMl ?? 0.67

  // ---- Computed ranges (only when weight is valid) -------------------------

  const dailyRange =
    weightKg !== null ? dailyVolumeRange(weightKg) : null

  const perFeedRange =
    dailyRange !== null ? perFeed(dailyRange, feedsPerDay) : null

  // ---- Event handlers ------------------------------------------------------

  function handleWeightChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setWeightInput(event.target.value)
    setWeightDirty(true)
  }

  function handleFeedsChange(next: number): void {
    saveConfig({ feedsPerDay: next }).catch(() => {
      // Error is tracked inside the hook; no additional handling needed here.
    })
  }

  function handleHighCalorieChange(patch: {
    enabled?: boolean
    kcalValue?: number
  }): void {
    const nextEnabled = patch.enabled ?? useHighCalorie
    const nextKcalValue = patch.kcalValue ?? storedKcalPerMl

    saveConfig({
      useHighCalorie: nextEnabled,
      kcalPerMl: nextKcalValue > 0 ? nextKcalValue : storedKcalPerMl,
    }).catch(() => {
      // Error tracked by hook.
    })
  }

  // ---- Render --------------------------------------------------------------

  return (
    <main
      className={[
        'flex flex-col gap-[var(--space-5)]',
        'p-[var(--space-4)]',
        'max-w-2xl mx-auto w-full',
        'pb-[var(--space-20)]',
      ].join(' ')}
      aria-label={t('feeding.title')}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Page title                                                           */}
      {/* ------------------------------------------------------------------ */}
      {/* Header — baby name + age, consistent with Growth & Profile */}
      <header className="flex flex-col gap-[var(--space-1)]">
        <h1
          className={[
            'text-[length:var(--text-h1)]',
            'font-[family-name:var(--font-heading)]',
            'text-[var(--color-foreground)]',
            'font-semibold',
            'm-0',
          ].join(' ')}
        >
          {child?.name ?? ''}
        </h1>
        {child !== null && (
          <p className="text-[length:var(--text-body)] text-[var(--color-text-muted)] m-0">
            {formatAge(ageFromDob(child.dateOfBirth))}
          </p>
        )}
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Empty state: no prefill weight and field untouched                  */}
      {/* ------------------------------------------------------------------ */}
      {showEmptyState && (
        <EmptyState
          title={t('feeding.empty.title')}
          action={
            <Link
              to="/growth"
              className={[
                'inline-flex items-center justify-center',
                'min-h-[44px] px-[var(--space-5)]',
                'rounded-[var(--radius-pill)]',
                'bg-[var(--color-primary)]',
                'text-[var(--color-on-primary)]',
                'text-[var(--text-body)] font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
                'motion-safe:active:scale-[0.98] transition-transform duration-[var(--duration-fast)]',
              ].join(' ')}
            >
              {t('feeding.empty.cta')}
            </Link>
          }
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Weight input                                              */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <Input
          id="feeding-weight"
          label={t('feeding.weightLabel')}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={weightInput}
          onChange={handleWeightChange}
          error={showWeightError ? t('feeding.weightError') : undefined}
        />
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Sections 2–4: only shown when a valid weight is present             */}
      {/* ------------------------------------------------------------------ */}
      {weightKg !== null && dailyRange !== null && perFeedRange !== null && (
        <>
          {/* aria-live region so screen readers announce result changes */}
          <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-[var(--space-5)]">
            {/* ---------------------------------------------------------- */}
            {/* Section 2: Daily volume range card                          */}
            {/* ---------------------------------------------------------- */}
            <Card>
              <div className="flex flex-col gap-[var(--space-3)]">
                <span
                  className={[
                    'text-[length:var(--text-sm)]',
                    'font-medium',
                    'text-[var(--color-text-muted)]',
                  ].join(' ')}
                >
                  {t('feeding.dailyRange')}
                </span>

                <p
                  className={[
                    'text-[length:var(--text-body-lg)]',
                    'font-medium',
                    'text-[var(--color-foreground)]',
                    'm-0',
                  ].join(' ')}
                >
                  {roundMl(dailyRange.minMl)}–{roundMl(dailyRange.maxMl)}{' '}
                  <span className="text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                    {t('feeding.mlPerDay')}
                  </span>
                </p>

                <p
                  className={[
                    'text-[length:var(--text-sm)]',
                    'text-[var(--color-text-muted)]',
                    'm-0',
                  ].join(' ')}
                >
                  {t('feeding.rangeNote')}
                </p>
              </div>
            </Card>

            {/* ---------------------------------------------------------- */}
            {/* Section 3: Per-feed stepper                                 */}
            {/* ---------------------------------------------------------- */}
            <Card>
              <div className="flex flex-col gap-[var(--space-4)]">
                <FeedsPerDayStepper
                  value={feedsPerDay}
                  onChange={handleFeedsChange}
                />

                <div className="flex flex-col gap-[var(--space-1)]">
                  <span
                    className={[
                      'text-[length:var(--text-sm)]',
                      'font-medium',
                      'text-[var(--color-text-muted)]',
                    ].join(' ')}
                  >
                    {t('feeding.perFeed')}
                  </span>
                  <span
                    className={[
                      'text-[length:var(--text-body-lg)]',
                      'font-medium',
                      'text-[var(--color-foreground)]',
                    ].join(' ')}
                  >
                    {roundMl(perFeedRange.minMl)}–{roundMl(perFeedRange.maxMl)}{' '}
                    <span className="text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                      {t('feeding.ml')}
                    </span>
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* Section 4: High-calorie panel                                 */}
          {/* ------------------------------------------------------------ */}
          <HighCaloriePanel
            weightKg={weightKg}
            feedsPerDay={feedsPerDay}
            enabled={useHighCalorie}
            kcalValue={storedKcalPerMl}
            onChange={handleHighCalorieChange}
          />

          {/* ------------------------------------------------------------ */}
          {/* Section 5: Average intake vs. need gauge (M3-6 / FEED-4)      */}
          {/* ------------------------------------------------------------ */}
          <IntakeVsNeed
            weightKg={weightKg}
            intakeMlPerDay={config?.avgIntakeMlPerDay ?? null}
            onIntakeChange={(value) => {
              saveConfig({ avgIntakeMlPerDay: value ?? undefined }).catch(() => {
                // Error tracked by hook; no additional handling needed here.
              })
            }}
          />
        </>
      )}
    </main>
  )
}
