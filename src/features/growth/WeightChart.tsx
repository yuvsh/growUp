/**
 * WeightChart — Recharts-based WHO percentile chart with accessible fallback.
 *
 * Renders the 5 WHO percentile curves (3rd/15th/50th/85th/97th) as background
 * reference lines and overlays the baby's measured weight points on top.
 * Age is expressed in months (ageDays / 30.4375) for readability; weight in kg.
 *
 * An accessible text table is rendered below the chart so the chart is never
 * the sole source of the data (MASTER.md Priority-1 a11y constraint).
 *
 * Colors use CSS custom properties from src/index.css — never raw hex.
 * No inline styles for layout; all layout via Tailwind classes.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { curveSeries } from '../../lib/who/curves';
import { weightToZResult } from '../../lib/who';
import { ageFromDob } from '../../lib/growth/age';
import { t } from '../../i18n/t';
import type { WeightEntry, Sex } from '../../types';
import type { PercentileLabel } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Days-per-month divisor for converting ageDays → months on the chart x-axis. */
const DAYS_PER_MONTH = 30.4375;

/** Muted stroke colors for the 5 WHO percentile reference curves. */
const CURVE_STROKES: Record<PercentileLabel, string> = {
  '3rd': 'var(--color-text-muted)',
  '15th': 'var(--color-text-muted)',
  '50th': 'var(--color-secondary)',
  '85th': 'var(--color-text-muted)',
  '97th': 'var(--color-text-muted)',
};

/** Stroke dash patterns — 50th is solid, outer curves are dashed. */
const CURVE_DASH: Record<PercentileLabel, string> = {
  '3rd': '4 3',
  '15th': '4 3',
  '50th': '',
  '85th': '4 3',
  '97th': '4 3',
};

/** Stroke width for the baby's own data line. */
const BABY_STROKE_WIDTH = 2.5;

/** Stroke width for WHO percentile reference lines. */
const CURVE_STROKE_WIDTH = 1.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeightChartProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
}

/** A single point in the unified Recharts dataset (one ageDays column + multi-series values). */
interface ChartDataPoint {
  /** Age in months (rounded to 2 dp). */
  ageMonths: number;
  /** Baby's measured weight in kg, undefined for curve-only rows. */
  babyKg?: number;
  /** WHO 3rd percentile weight in kg. */
  p3Kg: number;
  /** WHO 15th percentile weight in kg. */
  p15Kg: number;
  /** WHO 50th percentile weight in kg. */
  p50Kg: number;
  /** WHO 85th percentile weight in kg. */
  p85Kg: number;
  /** WHO 97th percentile weight in kg. */
  p97Kg: number;
}

/** One row in the accessible fallback table. */
interface FallbackRow {
  dateMeasured: string;
  weightKg: string;
  percentile: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round to n decimal places. */
function round(value: number, dp: number): number {
  const factor = Math.pow(10, dp);
  return Math.round(value * factor) / factor;
}

/** Format a number as kg with 3 decimal places for display (e.g. 3.450 kg). */
function formatKg(grams: number): string {
  return (grams / 1000).toFixed(3);
}

/** Format a percentile to one decimal place with a % suffix. */
function formatPercentile(p: number): string {
  return `${round(p, 1)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeightChart({ entries, sex, dateOfBirth }: WeightChartProps): React.JSX.Element {
  // Build the 5 WHO percentile curves from pure lib.
  const curves = curveSeries(sex);

  // Derive the chart title and axis labels from i18n.
  const chartTitle = t('growth.chart.title');
  const ageAxisLabel = t('growth.chart.ageAxis');
  const weightAxisLabel = t('growth.chart.weightAxis');
  const babyLabel = t('growth.chart.babyLabel');
  const fallbackHeading = t('growth.chart.fallbackHeading');

  // Build a map from ageDays → curve weights for fast lookup.
  // We use the 50th percentile curve as the x-axis grid (all curves share the same age grid).
  const p50Curve = curves.find((c) => c.percentileLabel === '50th');
  const p3Curve = curves.find((c) => c.percentileLabel === '3rd');
  const p15Curve = curves.find((c) => c.percentileLabel === '15th');
  const p85Curve = curves.find((c) => c.percentileLabel === '85th');
  const p97Curve = curves.find((c) => c.percentileLabel === '97th');

  // All curves share the same age grid by construction (curveSeries builds them together).
  const ageGrid: number[] = p50Curve?.points.map((pt) => pt.ageDays) ?? [];

  // Build the Recharts data array from the age grid + baby's entries.
  const curveDataByAgeDays = new Map<number, Omit<ChartDataPoint, 'ageMonths' | 'babyKg'>>();
  ageGrid.forEach((ageDays, idx) => {
    curveDataByAgeDays.set(ageDays, {
      p3Kg: round((p3Curve?.points[idx]?.weightGrams ?? 0) / 1000, 4),
      p15Kg: round((p15Curve?.points[idx]?.weightGrams ?? 0) / 1000, 4),
      p50Kg: round((p50Curve?.points[idx]?.weightGrams ?? 0) / 1000, 4),
      p85Kg: round((p85Curve?.points[idx]?.weightGrams ?? 0) / 1000, 4),
      p97Kg: round((p97Curve?.points[idx]?.weightGrams ?? 0) / 1000, 4),
    });
  });

  // Build baby entry points mapped to the nearest age-grid days.
  const babyByAgeDays = new Map<number, number>();
  entries.forEach((entry) => {
    const ageDays = ageFromDob(dateOfBirth, entry.dateMeasured).days;
    // Snap to the nearest age-grid point for clean chart alignment.
    const nearest = ageGrid.reduce((prev, curr) =>
      Math.abs(curr - ageDays) < Math.abs(prev - ageDays) ? curr : prev,
      ageGrid[0] ?? 0,
    );
    // If multiple entries snap to the same grid point use the latest one.
    babyByAgeDays.set(nearest, entry.weightGrams);
  });

  // Combine into the final chart dataset.
  const chartData: ChartDataPoint[] = ageGrid.map((ageDays) => {
    const curvePoint = curveDataByAgeDays.get(ageDays) ?? {
      p3Kg: 0, p15Kg: 0, p50Kg: 0, p85Kg: 0, p97Kg: 0,
    };
    const babyGrams = babyByAgeDays.get(ageDays);
    return {
      ageMonths: round(ageDays / DAYS_PER_MONTH, 1),
      ...(babyGrams !== undefined ? { babyKg: round(babyGrams / 1000, 3) } : {}),
      ...curvePoint,
    };
  });

  // Build fallback table rows (latest N entries with their computed percentile).
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.dateMeasured).getTime() - new Date(a.dateMeasured).getTime(),
  );

  const fallbackRows: FallbackRow[] = sortedEntries.map((entry) => {
    const ageDays = ageFromDob(dateOfBirth, entry.dateMeasured).days;
    const { percentile } = weightToZResult(entry.weightGrams, sex, ageDays);
    return {
      dateMeasured: entry.dateMeasured,
      weightKg: formatKg(entry.weightGrams),
      percentile: formatPercentile(percentile),
    };
  });

  const hasEntries = entries.length > 0;

  return (
    <section aria-label={chartTitle} className="w-full">
      {/* Chart title */}
      <h2
        className="text-[length:var(--text-h3)] font-[family-name:var(--font-heading)] text-[var(--color-foreground)] mb-[var(--space-2)]"
      >
        {chartTitle}
      </h2>

      {/* Recharts responsive container — height fixed so it renders in jsdom tests */}
      <div className="w-full rounded-[var(--radius-sm)] overflow-hidden">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 24, bottom: 24, left: 8 }}
            aria-label={chartTitle}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="ageMonths"
              type="number"
              domain={[0, 24]}
              tickCount={9}
              label={{
                value: ageAxisLabel,
                position: 'insideBottom',
                offset: -12,
                style: { fill: 'var(--color-text-muted)', fontSize: '0.75rem' },
              }}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />

            <YAxis
              label={{
                value: weightAxisLabel,
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fill: 'var(--color-text-muted)', fontSize: '0.75rem' },
              }}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value: number) => value.toFixed(1)}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                color: 'var(--color-foreground)',
              }}
              formatter={(value, name) => [
                `${Number(value).toFixed(3)} kg`,
                name === 'babyKg' ? babyLabel : String(name),
              ]}
              labelFormatter={(label) => `${String(label)} months`}
              // Recharts defaults to sorting tooltip rows by name ("15th" before "3rd").
              // Sort by the numeric percentile instead; baby's value stays on top.
              itemSorter={(item) => {
                const itemName = String(item.name ?? '');
                if (itemName === babyLabel) return -1;
                const pct = parseInt(itemName, 10);
                return Number.isNaN(pct) ? 999 : pct;
              }}
            />

            <Legend
              // Recharts defaults to sorting legend items by name ("value"), which
              // orders "15th" before "3rd" lexically. null keeps our 3→97 declaration order.
              itemSorter={null}
              wrapperStyle={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                paddingTop: '8px',
              }}
            />

            {/* WHO percentile reference curves — muted, behind baby data */}
            {(['3rd', '15th', '50th', '85th', '97th'] as PercentileLabel[]).map((label) => {
              const dataKey = `p${label.replace('th', '').replace('rd', '')}Kg` as
                | 'p3Kg' | 'p15Kg' | 'p50Kg' | 'p85Kg' | 'p97Kg';
              return (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={dataKey}
                  name={label}
                  stroke={CURVE_STROKES[label]}
                  strokeWidth={CURVE_STROKE_WIDTH}
                  strokeDasharray={CURVE_DASH[label]}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              );
            })}

            {/* Baby's measured weight overlay */}
            {hasEntries && (
              <Line
                type="monotone"
                dataKey="babyKg"
                name={babyLabel}
                stroke="var(--color-primary)"
                strokeWidth={BABY_STROKE_WIDTH}
                dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: 'var(--color-primary-hover)', strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Accessible fallback table — Priority-1 a11y: chart must never be    */}
      {/* the sole source of the data (MASTER.md).                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-[var(--space-4)]">
        <h3
          className="text-[length:var(--text-sm)] font-semibold text-[var(--color-foreground)] mb-[var(--space-2)]"
        >
          {fallbackHeading}
        </h3>

        {fallbackRows.length === 0 ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {t('growth.empty.title')}
          </p>
        ) : (
          <table
            className="w-full text-[length:var(--text-sm)] border-collapse"
            aria-label={fallbackHeading}
          >
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th
                  scope="col"
                  className="text-start py-[var(--space-2)] pe-[var(--space-4)] text-[var(--color-text-muted)] font-medium"
                >
                  {t('growth.weightForm.dateLabel')}
                </th>
                <th
                  scope="col"
                  className="text-start py-[var(--space-2)] pe-[var(--space-4)] text-[var(--color-text-muted)] font-medium"
                >
                  {t('growth.chart.weightAxis')}
                </th>
                <th
                  scope="col"
                  className="text-start py-[var(--space-2)] text-[var(--color-text-muted)] font-medium"
                >
                  {t('growth.percentile')}
                </th>
              </tr>
            </thead>
            <tbody>
              {fallbackRows.map((row) => (
                <tr
                  key={row.dateMeasured}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="py-[var(--space-2)] pe-[var(--space-4)] text-[var(--color-foreground)]">
                    {row.dateMeasured}
                  </td>
                  <td className="py-[var(--space-2)] pe-[var(--space-4)] text-[var(--color-foreground)]">
                    {row.weightKg} kg
                  </td>
                  <td className="py-[var(--space-2)] text-[var(--color-foreground)]">
                    {row.percentile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
