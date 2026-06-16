/**
 * BelowThirdAlert — renders a calm caution-amber alert when the latest weight
 * measurement falls below the WHO 3rd percentile.
 *
 * Design rules (MASTER.md):
 *   - Caution amber tokens: --color-caution / --color-caution-surface
 *   - NEVER red/destructive tokens — caution amber only
 *   - Icon + words — never color alone
 *   - role="status"; amber text ≥ 4.5:1
 *   - Logical CSS only (no left/right)
 *   - All copy via t()
 *
 * Returns null when percentile ≥ 3 or when entries is empty.
 */

import type { WeightEntry, Sex } from '../../types';
import { weightToZResult, percentileWeight, lmsForAge } from '../../lib/who';
import { PERCENTILE_Z } from './types';
import { ageFromDob } from '../../lib/growth/age';
import { formatPercentileTh } from '../../lib/growth/format';
import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BelowThirdAlertProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine the most recent entry by dateMeasured (ISO YYYY-MM-DD string
 * sort is lexicographically correct for ISO dates).
 */
function getLatestEntry(entries: WeightEntry[]): WeightEntry | undefined {
  if (entries.length === 0) return undefined;
  return [...entries].sort((a, b) =>
    b.dateMeasured.localeCompare(a.dateMeasured),
  )[0];
}

type TrendKey = 'trendImproving' | 'trendSteady' | 'trendDeclining';

/**
 * Derive a trend from the last two entries (sorted ascending by date so the
 * most recent is last). Needs at least two entries; falls back to 'trendSteady'.
 */
function getTrendKey(entries: WeightEntry[]): TrendKey {
  if (entries.length < 2) return 'trendSteady';

  const sorted = [...entries].sort((a, b) =>
    a.dateMeasured.localeCompare(b.dateMeasured),
  );

  // Safe: we verified length >= 2 above.
  const secondLast = sorted[sorted.length - 2] as WeightEntry;
  const last = sorted[sorted.length - 1] as WeightEntry;

  if (last.weightGrams > secondLast.weightGrams) return 'trendImproving';
  if (last.weightGrams < secondLast.weightGrams) return 'trendDeclining';
  return 'trendSteady';
}

// ---------------------------------------------------------------------------
// Inline SVG — warning triangle icon (a11y: aria-hidden, label provided by text)
// ---------------------------------------------------------------------------

function WarningIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        d="M10 2.5L17.5 16.25H2.5L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8.75V11.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14" r="0.875" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BelowThirdAlert({
  entries,
  sex,
  dateOfBirth,
}: BelowThirdAlertProps): React.JSX.Element | null {
  const latestEntry = getLatestEntry(entries);

  if (latestEntry === undefined) return null;

  const ageDays = ageFromDob(dateOfBirth, latestEntry.dateMeasured).days;
  const { percentile } = weightToZResult(latestEntry.weightGrams, sex, ageDays);

  if (percentile >= 3) return null;

  // Grams needed to reach the 3rd-percentile line at the same age.
  const lms = lmsForAge(sex, ageDays);
  const p3WeightGrams = percentileWeight(PERCENTILE_Z.p3, lms);
  const gramGap = Math.round(p3WeightGrams - latestEntry.weightGrams);

  const trendKey = getTrendKey(entries);
  const trendValue = t(`growth.alert.${trendKey}`);

  return (
    <div
      role="status"
      className={[
        'rounded-[var(--radius)]',
        'bg-[var(--color-caution-surface)]',
        'border border-[var(--color-caution)]',
        'p-[var(--space-4)]',
        'flex gap-[var(--space-3)]',
        'text-[var(--color-caution)]',
        'shadow-[var(--shadow-sm)]',
      ].join(' ')}
    >
      {/* Icon — never color alone */}
      <span className="mt-0.5">
        <WarningIcon />
      </span>

      {/* Content */}
      <div className="flex flex-col gap-[var(--space-2)] min-w-0">
        {/* Title + belowThird sentence */}
        <p className="text-[var(--text-body-lg)] font-semibold leading-snug">
          {t('growth.alert.title')}
        </p>
        <p className="text-[var(--text-body)] leading-relaxed">
          {t('growth.alert.belowThird')}
        </p>

        {/* Data rows */}
        <dl className="flex flex-col gap-[var(--space-1)] text-[var(--text-sm)]">
          {/* Current percentile */}
          <div className="flex gap-[var(--space-2)]">
            <dt className="font-medium">{t('growth.alert.currentPercentile')}:</dt>
            <dd>{formatPercentileTh(percentile, 1)}</dd>
          </div>

          {/* Gram gap */}
          <div className="flex gap-[var(--space-2)]">
            <dt className="font-medium">{gramGap}&thinsp;g</dt>
            <dd>{t('growth.alert.gramGap')}</dd>
          </div>

          {/* Recent trend */}
          <div className="flex gap-[var(--space-2)]">
            <dt className="font-medium">{t('growth.alert.trendLabel')}:</dt>
            <dd>{trendValue}</dd>
          </div>
        </dl>

        {/* Hopeful next step */}
        <p className="text-[var(--text-sm)] leading-relaxed mt-[var(--space-1)]">
          {t('growth.alert.nextStep')}
        </p>
      </div>
    </div>
  );
}
