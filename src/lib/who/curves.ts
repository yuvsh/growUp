/**
 * WHO percentile growth curves — generates sampled CurvePoint series for chart rendering.
 *
 * For each of the 5 standard percentile lines (3rd, 15th, 50th, 85th, 97th)
 * this module evaluates `percentileWeight(z, lmsForAge(sex, ageDays))` across
 * the requested age range and returns a `PercentileCurve[]` ready for Recharts.
 *
 * This module is pure: no React, no DOM, no I/O.
 */

import type { Sex } from '../../types';
import type { CurvePoint, PercentileCurve, PercentileLabel } from '../../features/growth/types';
import { PERCENTILE_Z } from '../../features/growth/types';
import { percentileWeight } from './lms';
import { lmsForAge } from './lmsForAge';

/** Default start age in days. */
const DEFAULT_FROM_DAYS = 0;

/** Default end age in days (24 months). */
const DEFAULT_TO_DAYS = 730;

/** Default sample interval in days. */
const DEFAULT_STEP_DAYS = 14;

/** Ordered list of the 5 percentile descriptors. */
const PERCENTILE_DESCRIPTORS: ReadonlyArray<{ label: PercentileLabel; z: number }> = [
  { label: '3rd', z: PERCENTILE_Z.p3 },
  { label: '15th', z: PERCENTILE_Z.p15 },
  { label: '50th', z: PERCENTILE_Z.p50 },
  { label: '85th', z: PERCENTILE_Z.p85 },
  { label: '97th', z: PERCENTILE_Z.p97 },
];

/** Options for customising the age range and resolution of the generated curves. */
export interface CurveSeriesOptions {
  /** Start of the age range in days (default: 0). */
  fromDays?: number;
  /** End of the age range in days (default: 730). */
  toDays?: number;
  /** Step size in days between sampled points (default: 14). */
  stepDays?: number;
}

/**
 * Build the age grid: every `stepDays` from `fromDays` to `toDays`, plus the
 * endpoint `toDays` if not already included as a multiple of `stepDays`.
 *
 * The start endpoint is always the first element; the end endpoint is always
 * the last element. No duplicates.
 */
function buildAgeGrid(fromDays: number, toDays: number, stepDays: number): number[] {
  const grid: number[] = [];
  for (let age = fromDays; age < toDays; age += stepDays) {
    grid.push(age);
  }
  // Always include the final endpoint.
  if (grid.length === 0 || grid[grid.length - 1] !== toDays) {
    grid.push(toDays);
  }
  return grid;
}

/**
 * Generate the 5 WHO percentile curves for a given sex over the specified age range.
 *
 * Each curve contains `CurvePoint[]` with weight in grams computed from the
 * inverse LMS formula. Points are in ascending ageDays order. Both range
 * endpoints are always included.
 *
 * @param sex    - 'male' | 'female'
 * @param opts   - Optional overrides for fromDays, toDays, stepDays.
 * @returns      - Array of 5 `PercentileCurve` objects, one per standard percentile.
 */
export function curveSeries(sex: Sex, opts?: CurveSeriesOptions): PercentileCurve[] {
  const fromDays = opts?.fromDays ?? DEFAULT_FROM_DAYS;
  const toDays = opts?.toDays ?? DEFAULT_TO_DAYS;
  const stepDays = opts?.stepDays ?? DEFAULT_STEP_DAYS;

  const ageGrid = buildAgeGrid(fromDays, toDays, stepDays);

  return PERCENTILE_DESCRIPTORS.map(({ label, z }) => {
    const points: CurvePoint[] = ageGrid.map((ageDays) => {
      const lms = lmsForAge(sex, ageDays);
      const weightGrams = percentileWeight(z, lms);
      return { ageDays, weightGrams };
    });

    return { percentileLabel: label, z, points };
  });
}
