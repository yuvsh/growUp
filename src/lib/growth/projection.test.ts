import { describe, it, expect } from 'vitest';
import { projectGrowth } from './projection';
import { weightVelocity } from './velocity';
import { lmsForAge, percentileWeight } from '../who';
import { PERCENTILE_Z } from '../../features/growth/types';
import { ageFromDob } from './age';
import type { WeightEntry } from '../../types';

/** Build a minimal WeightEntry for test purposes. */
function entry(dateMeasured: string, weightGrams: number): WeightEntry {
  return {
    id: dateMeasured,
    childId: 'test-child',
    ownerId: 'test-owner',
    dateMeasured,
    weightGrams,
    createdAt: `${dateMeasured}T00:00:00Z`,
    updatedAt: `${dateMeasured}T00:00:00Z`,
  };
}

const DOB = '2024-01-01';
const SEX = 'male' as const;
const HORIZON = 28;

describe('projectGrowth', () => {
  it('returns hasEnoughData=false for 0 entries', () => {
    const result = projectGrowth([], SEX, DOB);
    expect(result.hasEnoughData).toBe(false);
    expect(result.velocityGramsPerDay).toBe(0);
  });

  it('returns hasEnoughData=false for 1 entry', () => {
    const result = projectGrowth([entry('2024-02-01', 4000)], SEX, DOB);
    expect(result.hasEnoughData).toBe(false);
  });

  describe('with a concrete 3-entry series (+20 g/day)', () => {
    // DOB 2024-01-01; entries start 30 days later.
    // Entries:
    //   day 30: 3600 g (age 30 days)
    //   day 31: 3620 g
    //   day 32: 3640 g  ← latest
    const entries = [
      entry('2024-01-31', 3600), // DOB + 30 days
      entry('2024-02-01', 3620), // DOB + 31 days
      entry('2024-02-02', 3640), // DOB + 32 days
    ];

    it('hasEnoughData is true', () => {
      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.hasEnoughData).toBe(true);
    });

    it('projectedWeightGrams = latest + velocity * horizonDays', () => {
      const velocity = weightVelocity(entries)!;
      const latest = entries[2]!; // 2024-02-02 = 3640 g
      const expected = latest.weightGrams + velocity * HORIZON;

      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.projectedWeightGrams).toBeCloseTo(expected, 3);
    });

    it('projectedPercentile is in [0, 100]', () => {
      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.projectedPercentile).toBeGreaterThanOrEqual(0);
      expect(result.projectedPercentile).toBeLessThanOrEqual(100);
    });

    it('dailyGainToReach3rdGrams matches (target - latest) / horizonDays', () => {
      const latest = entries[2]!; // 2024-02-02
      const latestAgeDays = ageFromDob(DOB, latest.dateMeasured).days;
      const projectedAgeDays = latestAgeDays + HORIZON;
      const lms = lmsForAge(SEX, projectedAgeDays);
      const target3rd = percentileWeight(PERCENTILE_Z.p3, lms);
      const expected = (target3rd - latest.weightGrams) / HORIZON;

      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.dailyGainToReach3rdGrams).toBeCloseTo(expected, 3);
    });

    it('weeklyGainToReach3rdGrams = dailyGainToReach3rdGrams * 7', () => {
      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.weeklyGainToReach3rdGrams).toBeCloseTo(
        result.dailyGainToReach3rdGrams * 7,
        5,
      );
    });

    it('projectedAgeDays = latestAgeDays + horizonDays', () => {
      const latestEntry = entries[2]!;
      const latestAgeDays = ageFromDob(DOB, latestEntry.dateMeasured).days;
      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.projectedAgeDays).toBe(latestAgeDays + HORIZON);
    });

    it('velocityGramsPerDay matches weightVelocity output', () => {
      const velocity = weightVelocity(entries)!;
      const result = projectGrowth(entries, SEX, DOB, HORIZON);
      expect(result.velocityGramsPerDay).toBeCloseTo(velocity, 5);
    });
  });
});
