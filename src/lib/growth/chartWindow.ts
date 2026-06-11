/**
 * chartWindow — computes the focused X/Y domain for the WeightChart.
 *
 * Given the baby's measured points and the selected time range, returns
 * an {xMin, xMax, yMin, yMax} window that keeps small week-to-week weight
 * changes legible instead of squashing them into the full 0–24 mo frame.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One of the five selectable time-range options for the weight chart. */
export type ChartRange = '1mo' | '3mo' | '6mo' | 'all' | '2y';

/** Axis domain for the weight chart — all values in months or kg. */
export interface ChartWindow {
  /** Left (minimum) edge of the X axis, in months (inclusive). */
  xMinMonths: number;
  /** Right (maximum) edge of the X axis, in months (inclusive). */
  xMaxMonths: number;
  /** Bottom (minimum) edge of the Y axis, in kg. */
  yMinKg: number;
  /** Top (maximum) edge of the Y axis, in kg. */
  yMaxKg: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Horizontal padding on each side of the data (months). */
const X_PAD = 0.25;

/** Minimum Y-axis span enforced even when data is flat or a single point (kg). */
const MIN_SPAN_KG = 1.0;

/** Y padding as a fraction of the raw data span; minimum absolute value. */
const Y_PAD_FRACTION = 0.15;
const Y_PAD_MIN = 0.3;

/** Default window returned when there are no baby points. */
const DEFAULT_WINDOW: ChartWindow = {
  xMinMonths: 0,
  xMaxMonths: 6,
  yMinKg: 2,
  yMaxKg: 8,
};

// ---------------------------------------------------------------------------
// Helper — round to one decimal place
// ---------------------------------------------------------------------------

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the chart window (axis domains) for a given set of baby measurement
 * points and a selected time range.
 *
 * @param babyPoints - Array of { ageMonths, weightKg } for the baby's entries.
 * @param range      - The selected zoom level.
 * @returns          - { xMinMonths, xMaxMonths, yMinKg, yMaxKg }, all rounded
 *                     to 1 decimal place.
 */
export function computeChartWindow(
  babyPoints: { ageMonths: number; weightKg: number }[],
  range: ChartRange,
): ChartWindow {
  if (babyPoints.length === 0) {
    return DEFAULT_WINDOW;
  }

  // ---- X window ----------------------------------------------------------

  const ages = babyPoints.map((p) => p.ageMonths);
  const latest = Math.max(...ages);
  const first = Math.min(...ages);

  // '2y' = full WHO range 0–24 months; Y domain is computed baby-fit below
  // (the chart component overrides Y to 'auto' for the full fan view).
  if (range === '2y') {
    const babyWeights = babyPoints.map((p) => p.weightKg);
    const rawYMin = Math.min(...babyWeights);
    const rawYMax = Math.max(...babyWeights);
    const padY = Math.max(Y_PAD_MIN, Y_PAD_FRACTION * (rawYMax - rawYMin));
    let yMin = Math.max(0, rawYMin - padY);
    let yMax = rawYMax + padY;
    const span = yMax - yMin;
    if (span < MIN_SPAN_KG) {
      const mid = (yMax + yMin) / 2;
      yMin = Math.max(0, mid - MIN_SPAN_KG / 2);
      yMax = mid + MIN_SPAN_KG / 2;
    }
    return {
      xMinMonths: 0,
      xMaxMonths: 24,
      yMinKg: roundOne(yMin),
      yMaxKg: roundOne(yMax),
    };
  }

  let xMax = Math.min(24, latest + X_PAD);
  let xMin: number;

  if (range === 'all') {
    xMin = Math.max(0, first - X_PAD);
  } else {
    const spanMonths = range === '1mo' ? 1 : range === '3mo' ? 3 : 6;
    xMin = Math.max(0, xMax - spanMonths);
  }

  // Guard against degenerate case: single point where xMax ≈ xMin after clamping.
  if (xMax - xMin < 0.5) {
    const mid = (xMax + xMin) / 2;
    xMin = Math.max(0, mid - 0.5);
    xMax = Math.min(24, mid + 0.5);
    // If we hit the 0 boundary, push xMax to compensate.
    if (xMin === 0 && xMax < 0.5) {
      xMax = 0.5;
    }
  }

  // ---- Y window (fit to visible points only) -----------------------------

  const visibleWeights = babyPoints
    .filter((p) => p.ageMonths >= xMin && p.ageMonths <= xMax)
    .map((p) => p.weightKg);

  // If no points fall in the window (edge case with heavy clamping), use all.
  const weightsForFit = visibleWeights.length > 0 ? visibleWeights : babyPoints.map((p) => p.weightKg);

  const rawYMin = Math.min(...weightsForFit);
  const rawYMax = Math.max(...weightsForFit);

  const padY = Math.max(Y_PAD_MIN, Y_PAD_FRACTION * (rawYMax - rawYMin));

  let yMin = rawYMin - padY;
  let yMax = rawYMax + padY;

  // Enforce minimum span (so a single/flat data point is never a hairline).
  const span = yMax - yMin;
  if (span < MIN_SPAN_KG) {
    const mid = (yMax + yMin) / 2;
    yMin = mid - MIN_SPAN_KG / 2;
    yMax = mid + MIN_SPAN_KG / 2;
  }

  // Clamp yMin so the Y axis never goes negative.
  yMin = Math.max(0, yMin);

  return {
    xMinMonths: roundOne(xMin),
    xMaxMonths: roundOne(xMax),
    yMinKg: roundOne(yMin),
    yMaxKg: roundOne(yMax),
  };
}
