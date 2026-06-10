import { describe, it, expect } from 'vitest';
import { curveSeries } from './curves';
import { lmsForAge } from './lmsForAge';

const SEXES = ['male', 'female'] as const;
const EXPECTED_LABELS = ['3rd', '15th', '50th', '85th', '97th'] as const;

describe('curveSeries — structure', () => {
  it('returns exactly 5 curves with the correct labels', () => {
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      expect(curves).toHaveLength(5);
      const labels = curves.map((c) => c.percentileLabel);
      expect(labels).toEqual([...EXPECTED_LABELS]);
    }
  });

  it('each curve has at least 2 points (both endpoints)', () => {
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      for (const curve of curves) {
        expect(curve.points.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('includes day 0 (start) and day 730 (end) in every curve', () => {
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      for (const curve of curves) {
        const ageDayValues = curve.points.map((p) => p.ageDays);
        expect(ageDayValues[0]).toBe(0);
        expect(ageDayValues[ageDayValues.length - 1]).toBe(730);
      }
    }
  });

  it('points are in strictly ascending ageDays order', () => {
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      for (const curve of curves) {
        for (let i = 1; i < curve.points.length; i++) {
          expect(curve.points[i].ageDays).toBeGreaterThan(curve.points[i - 1].ageDays);
        }
      }
    }
  });
});

describe('curveSeries — custom range options', () => {
  it('respects fromDays / toDays / stepDays options', () => {
    const curves = curveSeries('male', { fromDays: 0, toDays: 100, stepDays: 10 });
    for (const curve of curves) {
      const ages = curve.points.map((p) => p.ageDays);
      expect(ages[0]).toBe(0);
      expect(ages[ages.length - 1]).toBe(100);
      // All intermediate ages must be multiples of 10.
      for (const age of ages) {
        expect(age % 10).toBe(0);
      }
    }
  });
});

describe('curveSeries — correctness', () => {
  it('at every sampled age, the 5 weights are strictly increasing (3rd < 15th < 50th < 85th < 97th)', () => {
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      const numPoints = curves[0].points.length;
      for (let ptIdx = 0; ptIdx < numPoints; ptIdx++) {
        const weights = curves.map((c) => c.points[ptIdx].weightGrams);
        for (let i = 1; i < weights.length; i++) {
          expect(weights[i]).toBeGreaterThan(weights[i - 1]);
        }
      }
    }
  });

  it('50th-percentile weight equals M * 1000 (grams) within epsilon at all sampled ages', () => {
    const EPSILON = 0.001; // sub-milligram tolerance
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      const p50 = curves.find((c) => c.percentileLabel === '50th');
      if (!p50) throw new Error('50th curve missing');

      for (const point of p50.points) {
        const lms = lmsForAge(sex, point.ageDays);
        const expectedGrams = lms.m * 1000;
        expect(Math.abs(point.weightGrams - expectedGrams)).toBeLessThan(EPSILON);
      }
    }
  });

  it('z values on the returned curves match the PERCENTILE_Z constants', () => {
    const curves = curveSeries('male');
    const expectedZs: Record<string, number> = {
      '3rd': -1.880794,
      '15th': -1.036433,
      '50th': 0,
      '85th': 1.036433,
      '97th': 1.880794,
    };
    for (const curve of curves) {
      expect(curve.z).toBeCloseTo(expectedZs[curve.percentileLabel], 5);
    }
  });
});

describe('curveSeries — smoke (weightToZResult round-trip via index)', () => {
  it('at the 50th-percentile weight, z is ~0 and percentile is ~50', async () => {
    const { weightToZResult } = await import('./index');
    for (const sex of SEXES) {
      const curves = curveSeries(sex);
      const p50 = curves.find((c) => c.percentileLabel === '50th')!;
      // Pick the point at day 180 as a representative sample.
      const pt = p50.points.find((p) => p.ageDays === 180) ?? p50.points[Math.floor(p50.points.length / 2)];
      const result = weightToZResult(pt.weightGrams, sex, pt.ageDays);
      expect(result.z).toBeCloseTo(0, 3);
      expect(result.percentile).toBeCloseTo(50, 1);
    }
  });
});
