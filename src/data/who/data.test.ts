import { describe, it, expect } from 'vitest';
import { getWeightForAgeTable, boysWeightForAge, girlsWeightForAge } from './index';
import type { LmsRow, WeightForAgeTable } from './types';
import type { Sex } from '../../types';
import { percentileWeight } from '../../lib/who/lms';
import { WHO_WEIGHT_FOR_AGE_SAMPLE } from './sample';

const MIN_AGE_DAYS = 0;
const MAX_AGE_DAYS = 730;
const EXPECTED_ROW_COUNT = MAX_AGE_DAYS - MIN_AGE_DAYS + 1; // 731

/** Tiny epsilon for matching L/M/S verbatim against the spike anchors. */
const LMS_EPSILON = 1e-9;
/** Tolerance (grams) for reproducing WHO's own published weights. */
const WEIGHT_TOLERANCE_GRAMS = 5;
/** WHO publishes M in kg with 3-4 dp; allow that slack when comparing M. */
const MEDIAN_EPSILON_KG = 5e-4;

/** The five WHO z-score anchors and the sample column carrying WHO's own weight. */
const Z_ANCHORS = [
  { z: -3, key: 'sd3neg' },
  { z: -2, key: 'sd2neg' },
  { z: 0, key: 'median' },
  { z: 2, key: 'sd2' },
  { z: 3, key: 'sd3' },
] as const;

const TABLES: ReadonlyArray<{ sex: Sex; table: WeightForAgeTable }> = [
  { sex: 'male', table: boysWeightForAge },
  { sex: 'female', table: girlsWeightForAge },
];

describe('WHO weight-for-age table integrity', () => {
  for (const { sex, table } of TABLES) {
    describe(sex, () => {
      it('declares the matching sex', () => {
        expect(table.sex).toBe(sex);
      });

      it('covers ageDays 0..730 inclusive with one row per day', () => {
        expect(table.rows).toHaveLength(EXPECTED_ROW_COUNT);
        expect(table.rows[0].ageDays).toBe(MIN_AGE_DAYS);
        expect(table.rows[table.rows.length - 1].ageDays).toBe(MAX_AGE_DAYS);
      });

      it('is strictly ascending by ageDays with no gaps or duplicates', () => {
        for (let i = 0; i < table.rows.length; i += 1) {
          expect(table.rows[i].ageDays).toBe(MIN_AGE_DAYS + i);
        }
      });

      it('has finite L, positive M, positive S in every row', () => {
        for (const row of table.rows) {
          expect(Number.isFinite(row.l)).toBe(true);
          expect(Number.isFinite(row.m)).toBe(true);
          expect(Number.isFinite(row.s)).toBe(true);
          expect(row.m).toBeGreaterThan(0);
          expect(row.s).toBeGreaterThan(0);
        }
      });

      // WHO's tables contain a real one-day neonatal weight-loss dip: median at
      // day 1 is below day 0 (newborns physiologically lose weight on day 1, then
      // regain). This is source-faithful, not a parse error — day 0 and the day-1
      // values match the verified spike anchors. From day 1 onward M is strictly
      // increasing, so we assert monotonicity over the post-day-0 range and verify
      // the documented dip separately below.
      it('has a strictly increasing median (M) from day 1 onward', () => {
        for (let i = 2; i < table.rows.length; i += 1) {
          expect(table.rows[i].m).toBeGreaterThan(table.rows[i - 1].m);
        }
      });

      it('has the documented day-0 neonatal weight-loss dip (M[0] > M[1])', () => {
        expect(table.rows[0].m).toBeGreaterThan(table.rows[1].m);
      });
    });
  }

  it('getWeightForAgeTable returns the correct table per sex', () => {
    expect(getWeightForAgeTable('male')).toBe(boysWeightForAge);
    expect(getWeightForAgeTable('female')).toBe(girlsWeightForAge);
  });
});

describe('WHO weight-for-age regression vs spike anchors', () => {
  function rowAt(table: WeightForAgeTable, ageDays: number): LmsRow {
    const row = table.rows.find((candidate) => candidate.ageDays === ageDays);
    if (!row) {
      throw new Error(`No embedded row for ageDays=${ageDays}`);
    }
    return row;
  }

  for (const anchor of WHO_WEIGHT_FOR_AGE_SAMPLE) {
    describe(`${anchor.sex} ${anchor.ageLabel} (day ${anchor.ageDays})`, () => {
      const table = getWeightForAgeTable(anchor.sex);
      const row = rowAt(table, anchor.ageDays);

      it('embedded L/M/S match the verified anchor', () => {
        expect(row.l).toBeCloseTo(anchor.lms.l, 9);
        expect(Math.abs(row.l - anchor.lms.l)).toBeLessThan(LMS_EPSILON);
        expect(Math.abs(row.m - anchor.lms.m)).toBeLessThan(LMS_EPSILON);
        expect(Math.abs(row.s - anchor.lms.s)).toBeLessThan(LMS_EPSILON);
      });

      it('percentileWeight(0) equals the median M (kg)', () => {
        const medianGrams = percentileWeight(0, {
          l: row.l,
          m: row.m,
          s: row.s,
        });
        expect(Math.abs(medianGrams / 1000 - row.m)).toBeLessThan(MEDIAN_EPSILON_KG);
      });

      it('reproduces WHO published weights at the 5 standard z-scores within 5 g', () => {
        for (const { z, key } of Z_ANCHORS) {
          const expectedKg = anchor.weightAnchorsKg[key];
          const actualGrams = percentileWeight(z, {
            l: row.l,
            m: row.m,
            s: row.s,
          });
          const diffGrams = Math.abs(actualGrams - expectedKg * 1000);
          expect(diffGrams).toBeLessThanOrEqual(WEIGHT_TOLERANCE_GRAMS);
        }
      });
    });
  }
});
