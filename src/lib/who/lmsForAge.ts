/**
 * WHO LMS lookup with linear interpolation between daily rows.
 *
 * The WHO weight-for-age tables are natively indexed by completed day (0–730).
 * This module:
 *   1. Clamps ageDays to [0, 730] — the app only supports 0–24 months.
 *   2. For an integer ageDays → returns the exact LMS row.
 *   3. For a fractional ageDays → linearly interpolates L, M, S between the
 *      two adjacent daily rows.
 *
 * This module is pure: no React, no DOM, no I/O.
 */

import type { Sex } from '../../types';
import type { Lms } from './lms';
import { getWeightForAgeTable } from '../../data/who';
import { MAX_AGE_DAYS } from '../growth/age';

/** Minimum supported age in days (birth). */
const MIN_AGE_DAYS = 0;

/**
 * Return the interpolated (or exact) LMS parameters for a given sex and age.
 *
 * - ageDays < 0   → clamped to day 0.
 * - ageDays > 730 → clamped to day 730.
 * - Integer ageDays in [0, 730] → exact row look-up (O(1) by index since the
 *   table is 0-indexed by day).
 * - Fractional ageDays → linear interpolation between floor and ceil rows.
 */
export function lmsForAge(sex: Sex, ageDays: number): Lms {
  const clamped = Math.max(MIN_AGE_DAYS, Math.min(MAX_AGE_DAYS, ageDays));

  const { rows } = getWeightForAgeTable(sex);

  const lo = Math.floor(clamped);
  const hi = Math.ceil(clamped);

  if (lo === hi) {
    // Integer day — exact row.
    const row = rows[lo];
    return { l: row.l, m: row.m, s: row.s };
  }

  // Fractional day — linear interpolation.
  const t = clamped - lo; // fraction in (0, 1)
  const rowLo = rows[lo];
  const rowHi = rows[hi];

  return {
    l: rowLo.l + t * (rowHi.l - rowLo.l),
    m: rowLo.m + t * (rowHi.m - rowLo.m),
    s: rowLo.s + t * (rowHi.s - rowLo.s),
  };
}
