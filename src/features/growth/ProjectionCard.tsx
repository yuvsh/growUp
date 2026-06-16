/**
 * ProjectionCard — 4-week growth outlook.
 *
 * Shows the baby's recent gain velocity, projected weight, projected percentile,
 * and (when the baby is below the 3rd percentile) the daily/weekly gain needed
 * to reach the 3rd-percentile line.
 *
 * Design rules (MASTER.md):
 *   - Card with --color-surface, --radius, --shadow-sm
 *   - Foreground text: --color-foreground / --color-text-muted
 *   - Gain-needed uses accent (--color-accent) for positive, hopeful framing
 *   - Never show a ≤ 0 gram figure for gain needed (baby is already on/above 3rd)
 *   - Logical CSS only (no left/right)
 *   - All copy via t()
 *   - No inline styles, no hardcoded hex, no console.log
 */

import type { WeightEntry, Sex } from '../../types';
import { projectGrowth } from '../../lib/growth/projection';
import { formatGramsAsKg, formatGramsTrimmed, formatPercentile } from '../../lib/growth/format';
import { Card } from '../../components/ui/card';
import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectionCardProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format grams with one decimal, trimming trailing zero (e.g. 12.0 → "12"). */
function formatGrams(grams: number): string {
  return formatGramsTrimmed(grams, 1);
}

/** Convert grams to kg string with 2 decimal places (e.g. 4250 → "4.25"). */
function gramsToKg(grams: number): string {
  return formatGramsAsKg(grams, 2);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single data row: label on the start, value on the end. */
function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-3)] py-[var(--space-1)]">
      <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="text-[var(--text-body-lg)] font-semibold text-[var(--color-foreground)] text-end">
        {value}
      </span>
    </div>
  );
}

/** A divider line using the border token. */
function Divider(): React.JSX.Element {
  return (
    <hr className="border-[var(--color-border)] my-[var(--space-2)]" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectionCard({
  entries,
  sex,
  dateOfBirth,
}: ProjectionCardProps): React.JSX.Element {
  const projection = projectGrowth(entries, sex, dateOfBirth);

  // Not enough data — calm informational state
  if (!projection.hasEnoughData) {
    return (
      <Card>
        <p className="text-[var(--text-body)] text-[var(--color-text-muted)] text-center py-[var(--space-2)]">
          {t('growth.projection.notEnough')}
        </p>
      </Card>
    );
  }

  const {
    velocityGramsPerDay,
    projectedWeightGrams,
    projectedPercentile,
    dailyGainToReach3rdGrams,
    weeklyGainToReach3rdGrams,
  } = projection;

  // Only show the gain-needed section when the baby is below the 3rd percentile.
  // The raw values may be ≤ 0 when already at/above 3rd — never display negative.
  const showGainNeeded =
    dailyGainToReach3rdGrams > 0 && weeklyGainToReach3rdGrams > 0;

  return (
    <Card>
      {/* Title */}
      <h2 className="text-[var(--text-h3)] font-semibold text-[var(--color-foreground)] mb-[var(--space-3)]">
        {t('growth.projection.title')}
      </h2>

      {/* Core metrics */}
      <dl className="flex flex-col">
        {/* Velocity */}
        <DataRow
          label={t('growth.projection.velocity')}
          value={
            <>
              {formatGrams(velocityGramsPerDay)}&thinsp;g/{t('growth.projection.perDay')}
            </>
          }
        />

        <Divider />

        {/* Projected weight */}
        <DataRow
          label={t('growth.projection.forecast')}
          value={<>{gramsToKg(projectedWeightGrams)}&thinsp;kg</>}
        />

        {/* Projected percentile */}
        <DataRow
          label={t('growth.projection.projectedPercentile')}
          value={<>{formatPercentile(projectedPercentile, 1)}th</>}
        />

        {/* Gain needed — only shown when baby is below 3rd */}
        {showGainNeeded && (
          <>
            <Divider />
            <div className="flex flex-col gap-[var(--space-1)] py-[var(--space-1)]">
              <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
                {t('growth.projection.gainNeeded')}
              </span>
              <div className="flex gap-[var(--space-3)] flex-wrap text-[var(--color-accent-strong)]">
                <span className="text-[var(--text-body)] font-semibold">
                  {formatGrams(dailyGainToReach3rdGrams)}&thinsp;g&nbsp;
                  {t('growth.projection.perDay')}
                </span>
                <span
                  className="text-[var(--text-sm)] text-[var(--color-text-muted)] self-center"
                  aria-hidden="true"
                >
                  /
                </span>
                <span className="text-[var(--text-body)] font-semibold">
                  {formatGrams(weeklyGainToReach3rdGrams)}&thinsp;g&nbsp;
                  {t('growth.projection.perWeek')}
                </span>
              </div>
            </div>
          </>
        )}
      </dl>

      {/* Assumptions note */}
      <p className="mt-[var(--space-3)] text-[var(--text-caption)] text-[var(--color-text-muted)] leading-relaxed">
        {t('growth.projection.assumptions')}
      </p>
    </Card>
  );
}
