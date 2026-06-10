/**
 * Tests for deriveMeasurements.
 *
 * Tests verify:
 *   1. Output count matches input count exactly (one result per entry).
 *   2. z ≈ 0 (within 1e-2) when the weight equals the WHO median M*1000 grams.
 *   3. Two entries only 1 day apart produce two separate results.
 */

import { describe, it, expect } from 'vitest';
import { deriveMeasurements } from './measurements';
import { getWeightForAgeTable } from '../../data/who';
import type { WeightEntry, Sex } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  id: string,
  dateMeasured: string,
  weightGrams: number,
): WeightEntry {
  return {
    id,
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured,
    weightGrams,
    createdAt: `${dateMeasured}T00:00:00Z`,
    updatedAt: `${dateMeasured}T00:00:00Z`,
  };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const DOB = '2024-01-01';
const SEX: Sex = 'male';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('deriveMeasurements', () => {
  it('returns exactly one result per input entry (count matches)', () => {
    const entries: WeightEntry[] = [
      makeEntry('e1', '2024-02-05', 4500),  // ~35 days
      makeEntry('e2', '2024-04-01', 6200),  // ~91 days
      makeEntry('e3', '2024-06-01', 7800),  // ~152 days
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    expect(results).toHaveLength(3);
  });

  it('returns one result for a single entry', () => {
    const entries: WeightEntry[] = [
      makeEntry('e1', '2024-02-05', 4500),
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    expect(results).toHaveLength(1);
  });

  it('returns zero results for an empty entry list', () => {
    const results = deriveMeasurements([], SEX, DOB);
    expect(results).toHaveLength(0);
  });

  it('z ≈ 0 (within 1e-2) when weight equals WHO median M*1000 grams at ageDays=0 (male)', () => {
    // ageDays = 0: DOB is the same as measurement date.
    const table = getWeightForAgeTable('male');
    const row = table.rows[0]; // day 0
    expect(row).toBeDefined();
    // M is in kg; multiply by 1000 for grams
    const medianGrams = Math.round(row!.m * 1000);

    const entries: WeightEntry[] = [
      makeEntry('e-median', DOB, medianGrams),
    ];

    const results = deriveMeasurements(entries, 'male', DOB);

    expect(results).toHaveLength(1);
    expect(Math.abs(results[0]!.z)).toBeLessThan(0.01);
  });

  it('z ≈ 0 (within 1e-2) when weight equals WHO median M*1000 grams at ageDays=91 (male)', () => {
    // Pick a specific age in the middle of the range.
    const ageDays = 91;
    const table = getWeightForAgeTable('male');
    const row = table.rows[ageDays];
    expect(row).toBeDefined();
    const medianGrams = Math.round(row!.m * 1000);

    // DOB set so that measurement date gives exactly ageDays.
    // DOB: 2024-01-01, ageDays=91 → 2024-04-01
    const dob = '2024-01-01';
    const measuredDate = '2024-04-01'; // 91 days later (2024 is a leap year: Jan 31 + Feb 29 + Mar 31 = 91 days)

    const entries: WeightEntry[] = [
      makeEntry('e-median-91', measuredDate, medianGrams),
    ];

    const results = deriveMeasurements(entries, 'male', dob);

    expect(results).toHaveLength(1);
    expect(Math.abs(results[0]!.z)).toBeLessThan(0.01);
  });

  it('z ≈ 0 (within 1e-2) when weight equals WHO median M*1000 grams (female, ageDays=0)', () => {
    const table = getWeightForAgeTable('female');
    const row = table.rows[0];
    expect(row).toBeDefined();
    const medianGrams = Math.round(row!.m * 1000);

    const entries: WeightEntry[] = [
      makeEntry('e-median-f', DOB, medianGrams),
    ];

    const results = deriveMeasurements(entries, 'female', DOB);

    expect(results).toHaveLength(1);
    expect(Math.abs(results[0]!.z)).toBeLessThan(0.01);
  });

  it('two entries 1 day apart produce two separate results (no dedup)', () => {
    const entries: WeightEntry[] = [
      makeEntry('e1', '2024-03-01', 5000), // day 60
      makeEntry('e2', '2024-03-02', 5010), // day 61
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    expect(results).toHaveLength(2);
    // Confirm they differ in ageDays
    expect(results[0]!.ageDays).toBe(60);
    expect(results[1]!.ageDays).toBe(61);
  });

  it('results are sorted ascending by dateMeasured regardless of input order', () => {
    const entries: WeightEntry[] = [
      makeEntry('e2', '2024-04-01', 6200),
      makeEntry('e1', '2024-02-05', 4500),
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    expect(results[0]!.dateMeasured).toBe('2024-02-05');
    expect(results[1]!.dateMeasured).toBe('2024-04-01');
  });

  it('each result includes weightGrams matching the entry', () => {
    const entries: WeightEntry[] = [
      makeEntry('e1', '2024-02-05', 4500),
      makeEntry('e2', '2024-04-01', 6200),
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    expect(results[0]!.weightGrams).toBe(4500);
    expect(results[1]!.weightGrams).toBe(6200);
  });

  it('each result has a non-empty ageLabel string', () => {
    const entries: WeightEntry[] = [
      makeEntry('e1', '2024-02-05', 4500),
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    expect(typeof results[0]!.ageLabel).toBe('string');
    expect(results[0]!.ageLabel.length).toBeGreaterThan(0);
  });

  it('percentile is in the range [0, 100]', () => {
    const entries: WeightEntry[] = [
      makeEntry('e1', '2024-02-05', 4500),
      makeEntry('e2', '2024-04-01', 6200),
    ];

    const results = deriveMeasurements(entries, SEX, DOB);

    results.forEach((r) => {
      expect(r.percentile).toBeGreaterThanOrEqual(0);
      expect(r.percentile).toBeLessThanOrEqual(100);
    });
  });
});
