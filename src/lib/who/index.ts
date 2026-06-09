/**
 * WHO math module — public barrel.
 *
 * Re-exports all pure WHO calculation functions and types so feature code
 * imports from a single stable path: `src/lib/who`.
 */

export { weightToZ, zToPercentile, percentileWeight } from './lms';
export type { Lms } from './lms';

export { lmsForAge } from './lmsForAge';

export { curveSeries } from './curves';
export type { CurveSeriesOptions } from './curves';

import type { Sex } from '../../types';
import type { ZResult } from '../../features/growth/types';
import { lmsForAge } from './lmsForAge';
import { weightToZ, zToPercentile } from './lms';

/**
 * Convenience function: compute the WHO z-score and percentile for a weight
 * measurement, resolving LMS parameters from the standard tables.
 *
 * @param weightGrams - The measured weight in grams.
 * @param sex         - 'male' | 'female'
 * @param ageDays     - Age in days (fractional ageDays are interpolated; clamped to [0, 730]).
 * @returns `ZResult` with `z` (z-score) and `percentile` (0–100).
 */
export function weightToZResult(weightGrams: number, sex: Sex, ageDays: number): ZResult {
  const lms = lmsForAge(sex, ageDays);
  const z = weightToZ(weightGrams, lms);
  const percentile = zToPercentile(z);
  return { z, percentile };
}
