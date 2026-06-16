/**
 * IntakeVsNeed — shows a custom gauge comparing the parent-entered average
 * daily intake against the recommended need band derived from the baby's weight.
 *
 * Blueprint: docs/ui-blueprints.md → "Feeding — Average intake vs. need (FEED-4)"
 * Design system: design-system/MASTER.md
 * Status: below = caution amber (NEVER red), within = success, above = neutral.
 * A11y: labelled input; readout is the accessible equivalent of the gauge;
 *        status communicated via icon + text (never color alone).
 *
 * Positioning note: ALL dynamic percentage positions use inline style with
 * logical CSS properties (insetInlineStart, width).  This is the sanctioned
 * exception to the no-inline-styles rule — Tailwind v4 cannot generate classes
 * from runtime-interpolated numbers.  Colors, sizes, and radii stay as Tailwind
 * token classes.
 */

import React from 'react'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { t } from '../../i18n/t'
import { intakeNeed, classifyIntake } from '../../lib/feeding/index'
import { ML_PER_KG_MIN, ML_PER_KG_TARGET, ML_PER_KG_MAX } from '../../lib/constants/feeding'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeVsNeedProps {
  weightKg: number
  intakeMlPerDay: number | null
  onIntakeChange: (value: number | null) => void
  useHighCalorie: boolean
  kcalPerMl: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a ml value to the nearest integer for display. */
function roundMl(value: number): number {
  return Math.round(value)
}

/**
 * Compute the gauge scale maximum: round up to the nearest 50 ml above
 * 115% of the need maximum so the marker and band are always visible.
 */
function computeScaleMax(maxMl: number): number {
  return Math.ceil((maxMl * 1.15) / 50) * 50
}

/**
 * Convert a ml value to a clamped percentage (0–100) relative to scaleMax.
 * Returns a number for use in inline style percentage strings.
 */
function toPercent(value: number, scaleMax: number): number {
  return Math.min(100, Math.max(0, (value / scaleMax) * 100))
}

/** Mirrors the return type of {@link classifyIntake}. */
type IntakeClassification = ReturnType<typeof classifyIntake>

/**
 * Status text color, keyed by intake classification.
 * below → caution amber; within → success green; above → muted neutral.
 * Color is NEVER the sole indicator — icon + text always accompany it.
 */
const STATUS_COLOR_CLASS: Record<IntakeClassification, string> = {
  below: 'text-[var(--color-caution)]',
  within: 'text-[var(--color-success)]',
  above: 'text-[var(--color-text-muted)]',
}

// ---------------------------------------------------------------------------
// Status icon helpers — SVG icons (no emoji, per design-system rules)
// ---------------------------------------------------------------------------

function WithinIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function BelowIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Gentle info / caution circle icon — never alarming */}
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function AboveIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Neutral upward-arrow icon */}
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// ReferenceTick — a single labelled tick mark on the gauge
// ---------------------------------------------------------------------------

interface ReferenceTickProps {
  /** Position as a percentage (0–100) along the gauge width. */
  pct: number
  /** ml/kg/day reference number to display (e.g. 120, 150, 200). */
  mlPerKg: number
}

function ReferenceTick({ pct, mlPerKg }: ReferenceTickProps): React.JSX.Element {
  return (
    <div
      className="absolute top-0 flex flex-col items-center"
      style={{ insetInlineStart: `${pct}%`, transform: 'translateX(-50%)' }}
    >
      {/* Tick line */}
      <div
        className={[
          'w-[1px] h-[12px]',
          'bg-[var(--color-text-muted)]',
          'opacity-60',
        ].join(' ')}
      />
      {/* Label */}
      <span
        className={[
          'text-[length:var(--text-caption)]',
          'text-[var(--color-text-muted)]',
          'whitespace-nowrap',
          'mt-[2px]',
        ].join(' ')}
      >
        {mlPerKg}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GaugeBar — isolated sub-component; receives pre-computed percent values.
// ALL dynamic % positions use inline style (logical CSS) — see file header.
// ---------------------------------------------------------------------------

interface GaugeBarProps {
  /** Start percentage of the need band (at minMl). */
  needBandStartPct: number
  /** Width percentage of the need band (maxMl − minMl). */
  needBandWidthPct: number
  /** Percentage position of the intake marker, or null when intake is unset. */
  markerPct: number | null
  /** Rounded intake value shown below the marker label. */
  intakeMlDisplay: number | null
  /** Scale maximum in ml (shown as the right-most label). */
  scaleMax: number
  /** Tick mark percentages for the three reference levels. */
  tickMinPct: number
  tickTargetPct: number
  tickMaxPct: number
}

function GaugeBar({
  needBandStartPct,
  needBandWidthPct,
  markerPct,
  intakeMlDisplay,
  scaleMax,
  tickMinPct,
  tickTargetPct,
  tickMaxPct,
}: GaugeBarProps): React.JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-col gap-[var(--space-2)]">
      {/* Scale labels */}
      <div
        className={[
          'flex justify-between',
          'text-[length:var(--text-caption)]',
          'text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        <span>0</span>
        <span>
          {roundMl(scaleMax)} {t('feeding.intake.unit')}
        </span>
      </div>

      {/* Track container — needs overflow-visible so ticks and marker label
          can show outside the track bounds */}
      <div className="relative pb-[var(--space-8)]">
        {/* Track */}
        <div
          className={[
            'relative',
            'h-[12px]',
            'rounded-[var(--radius-pill)]',
            'bg-[var(--color-muted)]',
          ].join(' ')}
        >
          {/* Need band — inline style for dynamic % position + width */}
          <div
            className={[
              'absolute top-0 h-full',
              'rounded-[var(--radius-pill)]',
              'bg-[color-mix(in_srgb,var(--color-success)_25%,transparent)]',
            ].join(' ')}
            style={{
              insetInlineStart: `${needBandStartPct}%`,
              width: `${needBandWidthPct}%`,
            }}
          />

          {/* Intake marker — only when intake is set; inline style for % position */}
          {markerPct !== null && (
            <div
              className={[
                'absolute top-[-4px]',
                'h-[20px] w-[3px]',
                'rounded-[var(--radius-pill)]',
                'bg-[var(--color-foreground)]',
              ].join(' ')}
              style={{ insetInlineStart: `${markerPct}%` }}
            />
          )}
        </div>

        {/* Intake value label anchored under the marker — inline style for % position */}
        {markerPct !== null && intakeMlDisplay !== null && (
          <div
            className={[
              'absolute top-[18px]',
              'text-[length:var(--text-caption)]',
              'text-[var(--color-foreground)]',
              'font-medium',
              'whitespace-nowrap',
            ].join(' ')}
            style={{
              insetInlineStart: `${markerPct}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {roundMl(intakeMlDisplay)}
          </div>
        )}

        {/* Reference ticks — 120 / 150 / 200 ml/kg/day — inline style for % positions */}
        <div className="absolute top-[14px] inset-inline-start-0 w-full">
          <ReferenceTick pct={tickMinPct} mlPerKg={ML_PER_KG_MIN} />
          <ReferenceTick pct={tickTargetPct} mlPerKg={ML_PER_KG_TARGET} />
          <ReferenceTick pct={tickMaxPct} mlPerKg={ML_PER_KG_MAX} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntakeVsNeed({
  weightKg,
  intakeMlPerDay,
  onIntakeChange,
  useHighCalorie,
  kcalPerMl,
}: IntakeVsNeedProps): React.JSX.Element {
  const need = intakeNeed(weightKg, useHighCalorie ? kcalPerMl : undefined)
  const scaleMax = computeScaleMax(need.maxMl)

  // ---- Input handler -------------------------------------------------------

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const raw = event.target.value.trim()
    if (raw === '') {
      onIntakeChange(null)
      return
    }
    const parsed = parseFloat(raw)
    onIntakeChange(Number.isFinite(parsed) && parsed > 0 ? parsed : null)
  }

  // ---- Derived display values ----------------------------------------------

  const inputValue: string = intakeMlPerDay !== null ? String(intakeMlPerDay) : ''

  const classification =
    intakeMlPerDay !== null ? classifyIntake(intakeMlPerDay, need) : null

  const needBandStartPct = toPercent(need.minMl, scaleMax)
  const needBandWidthPct = toPercent(need.maxMl - need.minMl, scaleMax)
  const markerPct = intakeMlPerDay !== null ? toPercent(intakeMlPerDay, scaleMax) : null

  // Reference tick positions
  const tickMinPct = toPercent(need.minMl, scaleMax)
  const tickTargetPct = toPercent(need.targetMl, scaleMax)
  const tickMaxPct = toPercent(need.maxMl, scaleMax)

  // ---- Readout text --------------------------------------------------------

  const recommendedText = t('feeding.intake.recommended')
    .replace('{min}', String(roundMl(need.minMl)))
    .replace('{max}', String(roundMl(need.maxMl)))

  const valueText =
    intakeMlPerDay !== null
      ? t('feeding.intake.value').replace('{value}', String(roundMl(intakeMlPerDay)))
      : null

  // ---- Status styling ------------------------------------------------------

  const statusColorClass: string =
    classification !== null ? STATUS_COLOR_CLASS[classification] : ''

  // ---- Render --------------------------------------------------------------

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        {/* Card title */}
        <h2
          className={[
            'text-[length:var(--text-h3)]',
            'font-[family-name:var(--font-heading)]',
            'text-[var(--color-foreground)]',
            'font-semibold',
            'm-0',
          ].join(' ')}
        >
          {t('feeding.intake.gaugeTitle')}
        </h2>

        {/* Intake input */}
        <Input
          id="feeding-intake"
          label={t('feeding.intake.label')}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="1"
          value={inputValue}
          onChange={handleInputChange}
        />

        {/* Gauge — aria-hidden; the readout below is the accessible equivalent */}
        <GaugeBar
          needBandStartPct={needBandStartPct}
          needBandWidthPct={needBandWidthPct}
          markerPct={markerPct}
          intakeMlDisplay={intakeMlPerDay}
          scaleMax={scaleMax}
          tickMinPct={tickMinPct}
          tickTargetPct={tickTargetPct}
          tickMaxPct={tickMaxPct}
        />

        {/* Readout — accessible live region */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-col gap-[var(--space-2)]"
        >
          {intakeMlPerDay !== null && classification !== null ? (
            <>
              {/* Value + recommended range */}
              <p
                className={[
                  'text-[length:var(--text-body)]',
                  'text-[var(--color-foreground)]',
                  'm-0',
                ].join(' ')}
              >
                {valueText}
                {' · '}
                {recommendedText}
              </p>

              {/* Status — icon + words (never color alone) */}
              <p
                className={[
                  'flex items-center gap-[var(--space-2)]',
                  'text-[length:var(--text-sm)]',
                  'font-medium',
                  'm-0',
                  statusColorClass,
                ].join(' ')}
              >
                {classification === 'below' && (
                  <>
                    <BelowIcon />
                    {t('feeding.intake.below')}
                  </>
                )}
                {classification === 'within' && (
                  <>
                    <WithinIcon />
                    {t('feeding.intake.within')}
                  </>
                )}
                {classification === 'above' && (
                  <>
                    <AboveIcon />
                    {t('feeding.intake.above')}
                  </>
                )}
              </p>
            </>
          ) : (
            /* Prompt when no intake entered yet */
            <p
              className={[
                'text-[length:var(--text-body)]',
                'text-[var(--color-text-muted)]',
                'm-0',
              ].join(' ')}
            >
              {t('feeding.intake.prompt')}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
