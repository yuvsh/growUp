// Clinic Mode — transient types.
//
// Clinic Mode is fully ephemeral (see docs/HLD-clinic-mode.md §3): none of these
// shapes are ever persisted. They live only in the in-memory `useClinicRead`
// hook for the duration of a single visit.
//
// Birth weight anchors every read at day 0, so birth weight + at least one
// current weight always yields ≥2 dated points. That is why `trend` and
// `catchUp` are REQUIRED on `ClinicRead` — they can always be computed.

import type { Sex } from '../../types';
import type { ZResult } from '../growth/types';

/** One current weight a clinician enters during the visit. */
export interface ClinicWeightEntry {
  /** Stored as integer grams to match the parent app and WHO math. */
  weightGrams: number;
  /** ISO YYYY-MM-DD; defaults to today. */
  measuredOn: string;
}

/**
 * The clinician's raw input — DOB, sex, birth weight, and one or two current
 * weights. Birth weight is required and sits at day 0; the current weights are
 * the recent readings.
 */
export interface ClinicInput {
  /** ISO YYYY-MM-DD. */
  dateOfBirth: string;
  sex: Sex;
  /** Weight at birth (age 0 days); anchors the read. Integer grams. */
  birthWeightGrams: number;
  /** One or two current readings with dates; the second refines recent velocity. */
  currentWeights:
    | [ClinicWeightEntry]
    | [ClinicWeightEntry, ClinicWeightEntry];
}

/** Direction of change between two weights. */
export type TrendDirection = 'gain' | 'loss' | 'flat';

/**
 * The fully derived read shown on the result screen.
 *
 * `trend` and `catchUp` are always present: birth weight (day 0) plus at least
 * one current weight always provides ≥2 dated points.
 */
export interface ClinicRead {
  /** Age in days at the latest current measurement, used for the WHO lookup. */
  ageDaysAtLatest: number;
  /** Percentile/z at the latest current weight. */
  zResult: ZResult;
  /** Percentile/z at birth (day 0) — "born at the Xth". */
  birthZResult: ZResult;
  /** Direction + g/day from birth to the latest current weight. */
  trend: {
    direction: TrendDirection;
    gramsPerDay: number;
  };
  /** Catch-up when below target, maintenance when on/above. */
  catchUp: {
    mode: 'catch-up' | 'maintenance';
    gramsPerDay: number;
    gramsPerWeek: number;
  };
}
