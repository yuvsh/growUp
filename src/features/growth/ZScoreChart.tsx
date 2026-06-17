/**
 * ZScoreChart — Recharts-based WHO z-score trajectory chart with accessible fallback.
 *
 * Plots each weight entry at its exact age (no snapping to a curve grid) as a
 * z-score value over time. Reference lines at z = 0, −2, −3 use calm tokens
 * (never --color-destructive / red). One point per entry; 2+ entries are
 * connected into a line.
 *
 * An accessible text table is always rendered so the chart is never the sole
 * source of the data (MASTER.md Priority-1 a11y constraint).
 *
 * Colors use CSS custom properties from src/index.css — never raw hex.
 * No inline styles for layout; all layout via Tailwind classes.
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { deriveMeasurements } from '../../lib/growth/measurements';
import type { DerivedMeasurement } from '../../lib/growth/measurements';
import { t } from '../../i18n/t';
import { DAYS_PER_MONTH } from '../../lib/growth/age';
import type { WeightEntry, Sex } from '../../types';
import { GrowthFallbackTable } from './GrowthFallbackTable';
import type { GrowthFallbackRow } from './GrowthFallbackTable';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stroke width for the baby's z-score line. */
const LINE_STROKE_WIDTH = 2.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ZScoreChartProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
}

/** A single data point for Recharts. */
interface ZChartPoint {
  /** Age in months (ageDays / DAYS_PER_MONTH), 2 dp. */
  ageMonths: number;
  /** WHO z-score at this measurement. */
  z: number;
  /** Carries the full measurement so the custom Tooltip can access it. */
  measurement: DerivedMeasurement;
}

// ---------------------------------------------------------------------------
// Custom Tooltip — typed as a Recharts content component to avoid formatter
// typing pitfalls (Recharts 3.x types are incompatible with narrow formatters).
// ---------------------------------------------------------------------------

interface CustomTooltipPayloadEntry {
  payload?: ZChartPoint;
}

type CustomTooltipProps = TooltipProps<number, string> & {
  payload?: CustomTooltipPayloadEntry[];
};

function ZScoreTooltip({ active, payload }: CustomTooltipProps): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const m = point.measurement;
  const weightKg = (m.weightGrams / 1000).toFixed(3);
  const zDisplay = m.z.toFixed(2);
  const percentileDisplay = m.percentile.toFixed(1);

  return (
    <div
      className={[
        'bg-[var(--color-surface)]',
        'border border-[var(--color-border)]',
        'rounded-[var(--radius-sm)]',
        'p-[var(--space-2)]',
        'text-[length:var(--text-sm)]',
        'text-[var(--color-foreground)]',
        'shadow-[var(--shadow-sm)]',
      ].join(' ')}
    >
      <p className="font-semibold mb-[var(--space-1)]">{m.dateMeasured}</p>
      <p>{m.ageLabel}</p>
      <p>{weightKg} kg</p>
      <p>Z-score: {zDisplay}</p>
      <p>Percentile: {percentileDisplay}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ZScoreChart({ entries, sex, dateOfBirth }: ZScoreChartProps): React.JSX.Element | null {
  // Depends only on entries/sex/dateOfBirth — the only props this component
  // receives — so it never recomputes on a render triggered by something else.
  const measurements = useMemo(
    () => deriveMeasurements(entries, sex, dateOfBirth),
    [entries, sex, dateOfBirth],
  );

  // Chart data stays chronological ascending (oldest → newest) for the line plot.
  const chartData: ZChartPoint[] = useMemo(
    () =>
      measurements.map((m) => ({
        ageMonths: parseFloat((m.ageDays / DAYS_PER_MONTH).toFixed(2)),
        z: m.z,
        measurement: m,
      })),
    [measurements],
  );

  // Y-domain: keep clinical reference lines always visible. Single-pass reduce
  // avoids `Math.min(...spread)` blowing the call stack / re-scanning the
  // array twice on large measurement lists.
  const { yMin, yMax } = useMemo(() => {
    let dataMin = Infinity;
    let dataMax = -Infinity;
    for (const m of measurements) {
      if (m.z < dataMin) dataMin = m.z;
      if (m.z > dataMax) dataMax = m.z;
    }
    return {
      yMin: Math.min(dataMin, -3) - 0.5,
      yMax: Math.max(dataMax, 0) + 0.5,
    };
  }, [measurements]);

  // Table lists newest → oldest; chartData/measurements keep ascending order.
  const fallbackRows: GrowthFallbackRow[] = useMemo(
    () =>
      [...measurements].reverse().map((m) => ({
        key: m.entry.id,
        dateMeasured: m.dateMeasured,
        ageLabel: m.ageLabel,
        weightKgLabel: `${(m.weightGrams / 1000).toFixed(3)} kg`,
        zScoreLabel: m.z.toFixed(2),
        percentileLabel: `${m.percentile.toFixed(1)}%`,
      })),
    [measurements],
  );

  // Growth already gates on entries.length > 0, but guard defensively.
  // Placed after the hooks above so hook call order stays stable across renders.
  if (entries.length === 0) {
    return null;
  }

  const chartTitle = t('growth.zChart.title');
  const yAxisLabel = t('growth.zChart.yAxis');
  const ageAxisLabel = t('growth.chart.ageAxis');
  const fallbackHeading = t('growth.zChart.fallbackHeading');

  return (
    <section aria-label={chartTitle} className="w-full">
      {/* Chart title */}
      <h2
        className="text-[length:var(--text-h3)] font-[family-name:var(--font-heading)] text-[var(--color-foreground)] mb-[var(--space-2)]"
      >
        {chartTitle}
      </h2>

      {/* Recharts responsive container */}
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
              domain={[yMin, yMax]}
              label={{
                value: yAxisLabel,
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

            <Tooltip content={<ZScoreTooltip />} />

            {/* Reference line: median z = 0 (calm muted color) */}
            <ReferenceLine
              y={0}
              stroke="var(--color-text-muted)"
              strokeDasharray="4 3"
              label={{
                value: t('growth.zChart.refMedian'),
                position: 'insideTopRight',
                style: { fill: 'var(--color-text-muted)', fontSize: '0.7rem' },
              }}
            />

            {/* Reference line: z = −2 (caution — never red) */}
            <ReferenceLine
              y={-2}
              stroke="var(--color-caution)"
              strokeDasharray="4 3"
              label={{
                value: t('growth.zChart.refLow'),
                position: 'insideTopRight',
                style: { fill: 'var(--color-caution)', fontSize: '0.7rem' },
              }}
            />

            {/* Reference line: z = −3 (caution-strong — never red) */}
            <ReferenceLine
              y={-3}
              stroke="var(--color-caution)"
              strokeDasharray="4 3"
              label={{
                value: t('growth.zChart.refVeryLow'),
                position: 'insideTopRight',
                style: { fill: 'var(--color-caution)', fontSize: '0.7rem' },
              }}
            />

            {/* Baby's z-score trajectory — one dot per entry, connected when 2+ */}
            <Line
              type="monotone"
              dataKey="z"
              name={chartTitle}
              stroke="var(--color-primary)"
              strokeWidth={LINE_STROKE_WIDTH}
              dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--color-primary-hover)', strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Accessible fallback table — Priority-1 a11y: chart must never be   */}
      {/* the sole source of the data (MASTER.md).                           */}
      {/* ------------------------------------------------------------------ */}
      <GrowthFallbackTable heading={fallbackHeading} rows={fallbackRows} />
    </section>
  );
}
