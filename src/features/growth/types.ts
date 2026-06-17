/**
 * Growth feature — shared result types consumed by the UI and the analysis layer.
 *
 * These are contracts: keep them minimal and stable. Business logic lives in
 * `src/lib/growth/`; display formatting lives in components. This file holds
 * only shapes and constants that cross the boundary.
 */

// ---------------------------------------------------------------------------
// z-score / percentile
// ---------------------------------------------------------------------------

/** The z-score and its normal-CDF percentile for a single weight measurement. */
export interface ZResult {
  /** WHO LMS z-score (standard deviations from the median). */
  z: number;
  /** Percentile (0–100), derived via the standard normal CDF. */
  percentile: number;
}

// ---------------------------------------------------------------------------
// Chart curves
// ---------------------------------------------------------------------------

/** A single (age, weight) point on a WHO percentile curve. */
export interface CurvePoint {
  /** Age in completed days. */
  ageDays: number;
  /** Weight in grams (converted from WHO kg values for consistency with domain). */
  weightGrams: number;
}

/** Percentile labels that GrowUp displays on the growth chart. */
export type PercentileLabel = '3rd' | '15th' | '50th' | '85th' | '97th';

/**
 * One rendered WHO percentile curve — the z-score used to generate it, its
 * display label, and the (ageDays, weightGrams) series for Recharts.
 */
export interface PercentileCurve {
  /** Human-readable label shown on the chart axis and legend. */
  percentileLabel: PercentileLabel;
  /** The z-score at which `percentileWeight(z, lms)` was evaluated for every point. */
  z: number;
  /** Ordered series of points (ascending ageDays). */
  points: CurvePoint[];
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * Output of the 28-day weight projection and gap-to-3rd-percentile calculation.
 * Returned by `src/lib/growth/projection.ts`.
 */
export interface ProjectionResult {
  /** Linear velocity in grams per day (positive = gaining, negative = losing). */
  velocityGramsPerDay: number;
  /** Projected weight in grams at `projectedAgeDays`. */
  projectedWeightGrams: number;
  /** Age in days at the projected measurement (~28 days ahead). */
  projectedAgeDays: number;
  /** WHO percentile of the projected weight at the projected age. */
  projectedPercentile: number;
  /**
   * Grams per day the baby would need to gain (from today's weight) to reach
   * the 3rd-percentile line at the projected age. 0 if already at or above 3rd.
   */
  dailyGainToReach3rdGrams: number;
  /** `dailyGainToReach3rdGrams × 7` for the weekly equivalent display. */
  weeklyGainToReach3rdGrams: number;
  /**
   * True when there are at least 2 weight entries available for regression.
   * False → velocity/projection values are meaningless and the UI should show
   * the "need more data" state instead.
   */
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

/**
 * Interpolation values for an insight's body copy. Each key is a `{token}`
 * placeholder name in the corresponding `growth.insights.<kind>.body` string.
 */
export interface InsightBodyParams {
  /** g/day threshold shown in the slow-velocity insight body. */
  threshold: number;
}

/** An actionable or informational growth insight card. */
export interface Insight {
  /** Stable identifier — used as React key and for deduplication. */
  id: string;
  /**
   * Machine-readable kind so the UI can render a matching icon/colour, and to
   * resolve `title`/`body` copy from `growth.insights.<kind>.*` via `t()`.
   */
  kind: 'weight-loss' | 'slow-velocity' | 'percentile-drop';
  /**
   * Display severity:
   *   - `info`    — noteworthy but not alarming
   *   - `caution` — warrants attention; pairs with the amber alert colour
   */
  severity: 'info' | 'caution';
  /**
   * Values to interpolate into the body copy's `{token}` placeholders.
   * Undefined when the body has no placeholders.
   */
  bodyParams?: InsightBodyParams;
}

// ---------------------------------------------------------------------------
// Constants — percentile → z mapping
// ---------------------------------------------------------------------------

/**
 * Standard z-scores for the five WHO percentile curves GrowUp renders.
 *
 * Values are the exact z such that Φ(z) × 100 equals the named percentile,
 * verified in `src/lib/who/lms.test.ts` (spike M0.5-1, all anchors pass within
 * 0.2 percentage points using the Cody/Numerical Recipes CDF approximation).
 *
 * Negative values match `−Φ⁻¹(positive side)` by symmetry of the normal dist.
 */
export const PERCENTILE_Z = {
  p3: -1.880794,
  p15: -1.036433,
  p50: 0,
  p85: 1.036433,
  p97: 1.880794,
} as const;

/** Type of the keys of `PERCENTILE_Z`. */
export type PercentileKey = keyof typeof PERCENTILE_Z;
