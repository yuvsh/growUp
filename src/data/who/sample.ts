/**
 * WHO weight-for-age — VERIFIED LMS sample (spike M0.5-1).
 *
 * SOURCE (official, downloaded and parsed during this spike):
 *   WHO Child Growth Standards, Weight-for-age, "z-scores expanded tables"
 *   (daily L/M/S, birth to 5 years).
 *     Boys:  https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-boys-zscore-expanded-tables.xlsx
 *     Girls: https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-girls-zscore-expanded-tables.xlsx
 *   Landing page: https://www.who.int/tools/child-growth-standards/standards/weight-for-age
 *
 * The expanded tables are indexed by AGE IN DAYS. The rows embedded below were
 * read verbatim from the official .xlsx files (columns: Day, L, M, S, plus the
 * SD weight columns). Day mapping follows the WHO convention month*30.4375:
 *   birth = day 0, 6mo = day 183, 12mo = day 365, 24mo = day 730.
 *
 * PROVENANCE: every L/M/S below is a VERIFIED official WHO figure copied from
 * the downloaded tables — none are guessed. The `weightAnchorsKg` field carries
 * WHO's OWN published weight (kg) at selected z-scores from the same row; we use
 * them in tests as an independent ground truth for `percentileWeight`.
 *
 * Scope note: this is a deliberately SMALL anchor set to prove the method.
 * The full 0-24 month daily tables must be embedded in task M2-1.
 */

import type { Sex } from '../../types';
import type { Lms } from '../../lib/who/lms';

/** WHO's own tabulated weights (kg) at standard z-scores, for cross-checking. */
export interface WeightAnchorsKg {
  /** Weight at z = -3 SD (column SD3neg). */
  sd3neg: number;
  /** Weight at z = -2 SD (column SD2neg). */
  sd2neg: number;
  /** Weight at z = 0 / median (column SD0). Equals `lms.m`. */
  median: number;
  /** Weight at z = +2 SD (column SD2). */
  sd2: number;
  /** Weight at z = +3 SD (column SD3). */
  sd3: number;
}

/** One verified WHO weight-for-age sample cell. */
export interface WhoWeightForAgeSample {
  sex: Sex;
  /** Age in completed days for this row in the WHO expanded table. */
  ageDays: number;
  /** Human label for the age, for test output and documentation. */
  ageLabel: string;
  lms: Lms;
  /** WHO's own published weights (kg) at standard z's from the same table row. */
  weightAnchorsKg: WeightAnchorsKg;
}

/**
 * VERIFIED WHO weight-for-age LMS values at birth, 6, 12 and 24 months.
 * All numbers copied from the official WHO expanded z-score tables (see header).
 */
export const WHO_WEIGHT_FOR_AGE_SAMPLE: readonly WhoWeightForAgeSample[] = [
  // ----- BOYS -----
  {
    sex: 'male',
    ageDays: 0,
    ageLabel: 'birth',
    lms: { l: 0.3487, m: 3.3464, s: 0.14602 },
    weightAnchorsKg: { sd3neg: 2.08, sd2neg: 2.459, median: 3.346, sd2: 4.419, sd3: 5.031 },
  },
  {
    sex: 'male',
    ageDays: 183,
    ageLabel: '6 months',
    lms: { l: 0.1256, m: 7.9389, s: 0.10957 },
    weightAnchorsKg: { sd3neg: 5.675, sd2neg: 6.357, median: 7.939, sd2: 9.855, sd3: 10.956 },
  },
  {
    sex: 'male',
    ageDays: 365,
    ageLabel: '12 months',
    lms: { l: 0.0645, m: 9.646, s: 0.10925 },
    weightAnchorsKg: { sd3neg: 6.926, sd2neg: 7.741, median: 9.646, sd2: 11.983, sd3: 13.341 },
  },
  {
    sex: 'male',
    ageDays: 730,
    ageLabel: '24 months',
    lms: { l: -0.0136, m: 12.1482, s: 0.11425 },
    weightAnchorsKg: { sd3neg: 8.63, sd2neg: 9.67, median: 12.148, sd2: 15.272, sd3: 17.128 },
  },

  // ----- GIRLS -----
  {
    sex: 'female',
    ageDays: 0,
    ageLabel: 'birth',
    lms: { l: 0.3809, m: 3.2322, s: 0.14171 },
    weightAnchorsKg: { sd3neg: 2.033, sd2neg: 2.395, median: 3.232, sd2: 4.23, sd3: 4.793 },
  },
  {
    sex: 'female',
    ageDays: 183,
    ageLabel: '6 months',
    lms: { l: -0.0759, m: 7.3016, s: 0.12204 },
    weightAnchorsKg: { sd3neg: 5.088, sd2neg: 5.733, median: 7.302, sd2: 9.341, sd3: 10.585 },
  },
  {
    sex: 'female',
    ageDays: 365,
    ageLabel: '12 months',
    lms: { l: -0.2022, m: 8.9462, s: 0.12267 },
    weightAnchorsKg: { sd3neg: 6.273, sd2neg: 7.041, median: 8.946, sd2: 11.506, sd3: 13.114 },
  },
  {
    sex: 'female',
    ageDays: 730,
    ageLabel: '24 months',
    lms: { l: -0.294, m: 11.4741, s: 0.12389 },
    weightAnchorsKg: { sd3neg: 8.064, sd2neg: 9.033, median: 11.474, sd2: 14.841, sd3: 17.008 },
  },
];
