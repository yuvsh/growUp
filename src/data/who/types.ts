/**
 * Shape of the embedded WHO weight-for-age LMS tables.
 *
 * This module is the single source of truth for the table structure so the
 * data file (boys.ts / girls.ts) and the math file (lmsForAge) can be built
 * in parallel against a stable contract.
 *
 * Unit of age: **completed days**, following the WHO expanded z-score tables
 * convention (month × 30.4375 for month-boundary rows; day 0 = birth).
 * Unit of weight: kilograms in M — matching the WHO source tables and the Lms
 * interface from the spike.
 */

export type { Lms } from '../../lib/who/lms';

import type { Lms } from '../../lib/who/lms';
import type { Sex } from '../../types';

/**
 * One row from the WHO expanded z-score table.
 * `ageDays` is the index column ("Day"); l/m/s are the three LMS parameters.
 * M is in kilograms (WHO convention).
 */
export interface LmsRow {
  /** Age in completed days (WHO "Day" column). */
  ageDays: number;
  /** Box-Cox power (lambda). */
  l: number;
  /** Median weight in kilograms. */
  m: number;
  /** Coefficient of variation (sigma). */
  s: number;
}

/**
 * The full weight-for-age LMS table for one sex.
 * Rows MUST be sorted ascending by `ageDays` so binary-search / linear
 * interpolation in `lmsForAge` works correctly.
 */
export interface WeightForAgeTable {
  sex: Sex;
  /** LMS rows sorted ascending by ageDays. */
  rows: LmsRow[];
}

/**
 * Result of looking up (and interpolating) an LMS row for a specific age.
 * Carries back the exact age requested so callers don't have to thread it.
 */
export interface LmsLookupResult {
  ageDays: number;
  lms: Lms;
}
