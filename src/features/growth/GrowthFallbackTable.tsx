/**
 * GrowthFallbackTable — shared accessible fallback table for the growth charts.
 *
 * WeightChart and ZScoreChart each render a Recharts chart plus an always-present
 * (or, for WeightChart, conditionally present when there is data) text table so
 * the chart is never the sole source of the data (MASTER.md Priority-1 a11y
 * constraint). The two tables share identical column headers, classes, and
 * `scope="col"` attributes — this component renders that shared markup while
 * each chart supplies its own already-formatted row strings, so neither
 * chart's visible table output changes.
 */

import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One row in the accessible fallback table — all values pre-formatted by the caller. */
export interface GrowthFallbackRow {
  /** Unique React key for this row (e.g. dateMeasured or entry.id). */
  key: string;
  dateMeasured: string;
  ageLabel: string;
  /** Already includes the " kg" suffix where the caller's prior markup did. */
  weightKgLabel: string;
  zScoreLabel: string;
  /** Already includes a "%" or ordinal suffix where the caller's prior markup did. */
  percentileLabel: string;
}

interface GrowthFallbackTableProps {
  /** Accessible heading text, also used as both <h3> content and the table's aria-label. */
  heading: string;
  rows: GrowthFallbackRow[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GrowthFallbackTable({
  heading,
  rows,
}: GrowthFallbackTableProps): React.JSX.Element {
  return (
    <div className="mt-[var(--space-4)]">
      <h3
        className="text-[length:var(--text-sm)] font-semibold text-[var(--color-foreground)] mb-[var(--space-2)]"
      >
        {heading}
      </h3>

      <table
        className="w-full text-[length:var(--text-sm)] border-collapse"
        aria-label={heading}
      >
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th
              scope="col"
              className="text-start py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-text-muted)] font-medium"
            >
              {t('growth.zChart.colDate')}
            </th>
            <th
              scope="col"
              className="text-start py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-text-muted)] font-medium"
            >
              {t('growth.zChart.colAge')}
            </th>
            <th
              scope="col"
              className="text-start py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-text-muted)] font-medium"
            >
              {t('growth.zChart.colWeight')}
            </th>
            <th
              scope="col"
              className="text-start py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-text-muted)] font-medium"
            >
              {t('growth.zChart.colZScore')}
            </th>
            <th
              scope="col"
              className="text-start py-[var(--space-2)] text-[var(--color-text-muted)] font-medium"
            >
              {t('growth.zChart.colPercentile')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-b border-[var(--color-border)] last:border-0"
            >
              <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                {row.dateMeasured}
              </td>
              <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                {row.ageLabel}
              </td>
              <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                {row.weightKgLabel}
              </td>
              <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                {row.zScoreLabel}
              </td>
              <td className="py-[var(--space-2)] text-[var(--color-foreground)]">
                {row.percentileLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
