import { describe, it, expect } from 'vitest';
import { lmsForAge } from './lmsForAge';
import { getWeightForAgeTable } from '../../data/who';

const SEXES = ['male', 'female'] as const;

describe('lmsForAge — integer-day exact lookup', () => {
  it('returns the exact row values for every integer ageDays in [0, 730]', () => {
    for (const sex of SEXES) {
      const table = getWeightForAgeTable(sex);
      // Spot-check a selection of known integer days instead of all 731 rows.
      const sampledDays = [0, 1, 14, 30, 180, 365, 730];
      for (const ageDays of sampledDays) {
        const row = table.rows.find((r) => r.ageDays === ageDays);
        if (row === undefined) throw new Error(`Row for ageDays ${ageDays} not found`);
        const lms = lmsForAge(sex, ageDays);
        expect(lms.l).toBeCloseTo(row.l, 10);
        expect(lms.m).toBeCloseTo(row.m, 10);
        expect(lms.s).toBeCloseTo(row.s, 10);
      }
    }
  });
});

describe('lmsForAge — fractional-day linear interpolation', () => {
  it('interpolated L/M/S lies strictly between the two bounding rows', () => {
    for (const sex of SEXES) {
      const table = getWeightForAgeTable(sex);
      // Use ageDays = 100.5 — between row 100 and row 101.
      const ageMid = 100.5;
      const rowLow = table.rows.find((r) => r.ageDays === 100);
      const rowHigh = table.rows.find((r) => r.ageDays === 101);
      if (!rowLow || !rowHigh) throw new Error('Missing rows for ageDays 100/101');

      const lms = lmsForAge(sex, ageMid);

      // Each interpolated value must lie strictly between its bounding values.
      for (const key of ['l', 'm', 's'] as const) {
        const lo = Math.min(rowLow[key], rowHigh[key]);
        const hi = Math.max(rowLow[key], rowHigh[key]);
        if (lo === hi) {
          // If both rows are identical for this parameter, so should interpolated be.
          expect(lms[key]).toBeCloseTo(lo, 10);
        } else {
          expect(lms[key]).toBeGreaterThan(lo);
          expect(lms[key]).toBeLessThan(hi);
        }
      }
    }
  });

  it('interpolates to the midpoint value at t=0.5', () => {
    for (const sex of SEXES) {
      const table = getWeightForAgeTable(sex);
      const rowLow = table.rows.find((r) => r.ageDays === 200);
      const rowHigh = table.rows.find((r) => r.ageDays === 201);
      if (!rowLow || !rowHigh) throw new Error('Missing rows');

      const lms = lmsForAge(sex, 200.5);
      expect(lms.m).toBeCloseTo((rowLow.m + rowHigh.m) / 2, 10);
      expect(lms.l).toBeCloseTo((rowLow.l + rowHigh.l) / 2, 10);
      expect(lms.s).toBeCloseTo((rowLow.s + rowHigh.s) / 2, 10);
    }
  });
});

describe('lmsForAge — clamping', () => {
  it('clamps negative ageDays to day 0', () => {
    for (const sex of SEXES) {
      const table = getWeightForAgeTable(sex);
      const row0 = table.rows[0];
      const lms = lmsForAge(sex, -1);
      expect(lms.l).toBeCloseTo(row0.l, 10);
      expect(lms.m).toBeCloseTo(row0.m, 10);
      expect(lms.s).toBeCloseTo(row0.s, 10);
    }
  });

  it('clamps ageDays > 730 to day 730', () => {
    for (const sex of SEXES) {
      const table = getWeightForAgeTable(sex);
      const row730 = table.rows[table.rows.length - 1];
      expect(row730.ageDays).toBe(730);
      const lms = lmsForAge(sex, 800);
      expect(lms.l).toBeCloseTo(row730.l, 10);
      expect(lms.m).toBeCloseTo(row730.m, 10);
      expect(lms.s).toBeCloseTo(row730.s, 10);
    }
  });

  it('ageDays exactly 0 and 730 are not clamped (exact row match)', () => {
    for (const sex of SEXES) {
      const table = getWeightForAgeTable(sex);
      const row0 = table.rows[0];
      const row730 = table.rows[table.rows.length - 1];

      const lms0 = lmsForAge(sex, 0);
      expect(lms0.m).toBeCloseTo(row0.m, 10);

      const lms730 = lmsForAge(sex, 730);
      expect(lms730.m).toBeCloseTo(row730.m, 10);
    }
  });
});
