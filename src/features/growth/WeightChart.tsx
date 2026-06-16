/**
 * WeightChart — Recharts-based WHO percentile chart with accessible fallback.
 *
 * Renders the 5 WHO percentile curves (3rd/15th/50th/85th/97th) as background
 * reference lines and overlays the baby's measured weight points on top at
 * EXACT computed ages (no snapping to the 14-day curve grid).
 *
 * A `1mo · 3mo · 6mo · All · 2yr` segmented toggle above the chart lets the parent
 * focus on a recent window. The auto-fit Y domain keeps small changes legible.
 *
 * An accessible text table is rendered below the chart so the chart is never
 * the sole source of the data (MASTER.md Priority-1 a11y constraint).
 *
 * Colors use CSS custom properties from src/index.css — never raw hex.
 * No inline styles for layout; all layout via Tailwind classes.
 * Inline style objects are only used for Recharts label/tick/tooltip props
 * that accept a React.CSSProperties object — these cannot be replaced by
 * Tailwind class strings.
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
import { weightToZResult, lmsForAge, percentileWeight } from '../../lib/who';
import { ageFromDob, formatAge } from '../../lib/growth/age';
import type { AgeBreakdown } from '../../lib/growth/age';
import { computeChartWindow } from '../../lib/growth/chartWindow';
import { t } from '../../i18n/t';
import type { WeightEntry, Sex } from '../../types';
import { PERCENTILE_Z } from './types';
import type { PercentileLabel } from './types';
import type { ChartRange } from '../../lib/growth/chartWindow';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Days-per-month divisor for converting ageDays → months on the chart x-axis. */
const DAYS_PER_MONTH = 30.4375;

/** WHO data spans 0–730 days (0–24 months); curves are sampled every 14 days. */
const MAX_AGE_DAYS = 730;
const CURVE_STEP_DAYS = 14;

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

/** Keys in the `growth.chartRange` copy namespace used by the toggle. */
type ChartRangeLabelKey = 'm1' | 'm3' | 'm6' | 'all' | 'full';

/** The ordered list of range options shown in the toggle. */
const CHART_RANGES: { value: ChartRange; labelKey: ChartRangeLabelKey }[] = [
  { value: '1mo', labelKey: 'm1' },
  { value: '3mo', labelKey: 'm3' },
  { value: '6mo', labelKey: 'm6' },
  { value: 'all', labelKey: 'all' },
  { value: '2y', labelKey: 'full' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeightChartProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
  /** Currently selected time-range; controlled by the parent via UiStateContext. */
  range: ChartRange;
  /** Called when the user selects a different time-range in the toggle. */
  onRangeChange: (r: ChartRange) => void;
}

/** A single point in the unified Recharts dataset for the percentile curves. */
interface CurveDataPoint {
  /** Age in months (rounded to 2 dp). */
  ageMonths: number;
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
  /** Baby's measured weight in kg — present ONLY on rows at a real measurement age. */
  babyKg?: number;
}

/**
 * A measurement with its age + kg derived once. Shared by the chart-window
 * computation, the curve-grid merge, and the accessible fallback table so the
 * entry→age/kg conversion lives in exactly one place.
 */
interface DerivedMeasurement {
  /** The original weight entry. */
  entry: WeightEntry;
  /** Age breakdown at the measurement date. */
  age: AgeBreakdown;
  /** Exact age in months (age.days / 30.4375), NOT snapped to the grid. */
  ageMonths: number;
  /** Measured weight in kg. */
  weightKg: number;
}

/** One row in the accessible fallback table. */
interface FallbackRow {
  dateMeasured: string;
  ageLabel: string;
  weightKg: string;
  zScore: string;
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

export function WeightChart({
  entries,
  sex,
  dateOfBirth,
  range,
  onRangeChange,
}: WeightChartProps): React.JSX.Element {
  // ---- Derive i18n strings -----------------------------------------------
  const chartTitle = t('growth.chart.title');
  const ageAxisLabel = t('growth.chart.ageAxis');
  const weightAxisLabel = t('growth.chart.weightAxis');
  const babyLabel = t('growth.chart.babyLabel');
  const fallbackHeading = t('growth.chart.fallbackHeading');
  const rangeLegendLabel = t('growth.chartRange.label');

  // ---- Derive each measurement's age + kg ONCE (shared everywhere) -------
  // Computing ageFromDob plus the gram→kg / day→month conversions in one place
  // keeps the baby line, the curve-grid merge, and the fallback table in sync,
  // and avoids recomputing the same age three times per measurement.
  const measurements: DerivedMeasurement[] = entries.map((entry) => {
    const age = ageFromDob(dateOfBirth, entry.dateMeasured);
    return {
      entry,
      age,
      ageMonths: age.days / DAYS_PER_MONTH,
      weightKg: entry.weightGrams / 1000,
    };
  });

  // ---- Compute chart window from baby's data + selected range ------------
  const win = computeChartWindow(
    measurements.map((m) => ({ ageMonths: m.ageMonths, weightKg: m.weightKg })),
    range,
  );

  // ---- Build ONE unified dataset shared by curves AND the baby line -------
  // Rows = the curve grid (every 14 days, 0–730) UNION the baby's EXACT ages.
  // Each row carries the 5 WHO percentile weights at that exact age (via the LMS
  // method) plus babyKg only on rows that are a real measurement. Sharing one
  // dataset means the tooltip at a baby point shows the real age + baby weight +
  // the percentile weights together — and no phantom baby points are invented.
  const babyKgByDay = new Map<number, number>();
  measurements.forEach((m) => {
    babyKgByDay.set(m.age.days, m.weightKg);
  });

  const gridDays: number[] = [];
  for (let d = 0; d <= MAX_AGE_DAYS; d += CURVE_STEP_DAYS) gridDays.push(d);
  if (gridDays[gridDays.length - 1] !== MAX_AGE_DAYS) gridDays.push(MAX_AGE_DAYS);

  const allDays = Array.from(new Set<number>([...gridDays, ...babyKgByDay.keys()])).sort(
    (a, b) => a - b,
  );

  const chartData: CurveDataPoint[] = allDays.map((days) => {
    const lms = lmsForAge(sex, days);
    const babyKg = babyKgByDay.get(days);
    const row: CurveDataPoint = {
      ageMonths: round(days / DAYS_PER_MONTH, 2),
      p3Kg: round(percentileWeight(PERCENTILE_Z.p3, lms) / 1000, 4),
      p15Kg: round(percentileWeight(PERCENTILE_Z.p15, lms) / 1000, 4),
      p50Kg: round(percentileWeight(PERCENTILE_Z.p50, lms) / 1000, 4),
      p85Kg: round(percentileWeight(PERCENTILE_Z.p85, lms) / 1000, 4),
      p97Kg: round(percentileWeight(PERCENTILE_Z.p97, lms) / 1000, 4),
    };
    if (babyKg !== undefined) row.babyKg = round(babyKg, 3);
    return row;
  });

  // ---- Build fallback table rows -----------------------------------------
  const sortedMeasurements = [...measurements].sort(
    (a, b) =>
      new Date(b.entry.dateMeasured).getTime() - new Date(a.entry.dateMeasured).getTime(),
  );

  const fallbackRows: FallbackRow[] = sortedMeasurements.map((m) => {
    const { z, percentile } = weightToZResult(m.entry.weightGrams, sex, m.age.days);
    return {
      dateMeasured: m.entry.dateMeasured,
      ageLabel: formatAge(m.age),
      weightKg: formatKg(m.entry.weightGrams),
      zScore: z.toFixed(2),
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

      {/* ------------------------------------------------------------------ */}
      {/* Time-range segmented toggle                                          */}
      {/* radio-group semantics; each option is role="radio" + aria-checked;  */}
      {/* ≥44×44px touch targets; active = primary color + underline cue.     */}
      {/* ------------------------------------------------------------------ */}
      <div
        role="radiogroup"
        aria-label={rangeLegendLabel}
        className="flex gap-[var(--space-1)] mb-[var(--space-3)] flex-wrap"
      >
        {CHART_RANGES.map(({ value, labelKey }) => {
          const isActive = range === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={isActive}
              onClick={() => { onRangeChange(value); }}
              className={[
                // Base styles — sizing, typography, border, focus ring
                'min-h-[44px] min-w-[44px] px-[var(--space-3)] py-[var(--space-2)]',
                'text-[length:var(--text-sm)] font-medium rounded-[var(--radius-pill)]',
                'border transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
                // Active vs inactive state — non-color cue: underline on active
                isActive
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] underline'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-primary)]',
              ].join(' ')}
            >
              {t(`growth.chartRange.${labelKey}`)}
            </button>
          );
        })}
      </div>

      {/* Recharts responsive container — height fixed so it renders in jsdom tests */}
      <div className="w-full rounded-[var(--radius-sm)] overflow-hidden">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
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
              domain={range === '2y' ? [0, 24] : [win.xMinMonths, win.xMaxMonths]}
              allowDataOverflow={range !== '2y'}
              tickCount={range === '2y' ? 9 : 6}
              label={{
                value: ageAxisLabel,
                position: 'insideBottom',
                offset: -12,
                style: { fill: 'var(--color-text-muted)', fontSize: '0.75rem' },
              }}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value: number) => value.toFixed(1)}
            />

            <YAxis
              domain={range === '2y' ? ['auto', 'auto'] : [win.yMinKg, win.yMaxKg]}
              allowDataOverflow={range !== '2y'}
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
              labelFormatter={(label) => `${Number(label).toFixed(1)} months`}
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

            {/* WHO percentile reference curves — grid-sampled, muted, behind baby data */}
            {(['3rd', '15th', '50th', '85th', '97th'] as PercentileLabel[]).map((label) => {
              const dataKey = `p${label.replace('th', '').replace('rd', '')}Kg` as
                | 'p3Kg' | 'p15Kg' | 'p50Kg' | 'p85Kg' | 'p97Kg';
              return (
                <Line
                  key={label}
                  data={chartData}
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

            {/* Baby's measured weight overlay — reads babyKg from the shared dataset
                (present only at real measurement ages, so dots mark real records and
                the tooltip aligns with the percentile curves). connectNulls bridges
                the gaps between measurements. */}
            {hasEntries && (
              <Line
                data={chartData}
                type="monotone"
                dataKey="babyKg"
                name={babyLabel}
                stroke="var(--color-primary)"
                strokeWidth={BABY_STROKE_WIDTH}
                dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: 'var(--color-primary-hover)', strokeWidth: 0 }}
                connectNulls={true}
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
              {fallbackRows.map((row) => (
                <tr
                  key={row.dateMeasured}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                    {row.dateMeasured}
                  </td>
                  <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                    {row.ageLabel}
                  </td>
                  <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                    {row.weightKg} kg
                  </td>
                  <td className="py-[var(--space-2)] pe-[var(--space-3)] text-[var(--color-foreground)]">
                    {row.zScore}
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
