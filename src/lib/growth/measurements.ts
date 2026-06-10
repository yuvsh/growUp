/**
 * deriveMeasurements — per-entry WHO z-score / percentile derivation helper.
 *
 * Maps each WeightEntry to its exact computed age + WHO z-score + percentile,
 * sorted ascending by dateMeasured.
 *
 * IMPORTANT: no snapping to the 14-day curve grid (unlike WeightChart's baby
 * points). Each entry uses its exact ageDays so the Z-score trajectory chart
 * plots the real date of each measurement.
 *
 * This module is pure: no React, no DOM, no I/O.
 */

import type { WeightEntry, Sex } from '../../types';
import { ageFromDob, formatAge } from './age';
import { weightToZResult } from '../who';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** All derived values for a single weight entry. */
export interface DerivedMeasurement {
  /** The original entry (retained for edit/delete callbacks). */
  entry: WeightEntry;
  /** Age in completed calendar days at the time of measurement. */
  ageDays: number;
  /** Human-readable age label, e.g. "2 months, 1 week". */
  ageLabel: string;
  /** Weight as stored — integer grams. */
  weightGrams: number;
  /** WHO LMS z-score at this exact age. */
  z: number;
  /** Normal-CDF percentile (0–100) corresponding to `z`. */
  percentile: number;
  /** ISO YYYY-MM-DD date of the measurement (mirror of entry.dateMeasured). */
  dateMeasured: string;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Derive WHO z-score measurements for each weight entry.
 *
 * @param entries      - All weight entries for the child (order does not matter).
 * @param sex          - The child's biological sex (for WHO table selection).
 * @param dateOfBirth  - ISO YYYY-MM-DD date of birth.
 * @returns Array of derived measurements, sorted ascending by `dateMeasured`.
 */
export function deriveMeasurements(
  entries: WeightEntry[],
  sex: Sex,
  dateOfBirth: string,
): DerivedMeasurement[] {
  const sorted = [...entries].sort((a, b) =>
    a.dateMeasured.localeCompare(b.dateMeasured),
  );

  return sorted.map((entry): DerivedMeasurement => {
    const ageBreakdown = ageFromDob(dateOfBirth, entry.dateMeasured);
    const ageDays = ageBreakdown.days;
    const ageLabel = formatAge(ageBreakdown);
    const { z, percentile } = weightToZResult(entry.weightGrams, sex, ageDays);

    return {
      entry,
      ageDays,
      ageLabel,
      weightGrams: entry.weightGrams,
      z,
      percentile,
      dateMeasured: entry.dateMeasured,
    };
  });
}
