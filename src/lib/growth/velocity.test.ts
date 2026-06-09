import { describe, it, expect } from 'vitest';
import { weightVelocity } from './velocity';
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

describe('weightVelocity', () => {
  it('returns null for 0 entries', () => {
    expect(weightVelocity([])).toBeNull();
  });

  it('returns null for 1 entry', () => {
    expect(weightVelocity([entry('2024-01-01', 3000)])).toBeNull();
  });

  it('computes ≈20 g/day for a steady +20 g/day series', () => {
    // 5 entries: day 0 → 3000 g, each day +20 g
    const entries = [
      entry('2024-01-01', 3000),
      entry('2024-01-02', 3020),
      entry('2024-01-03', 3040),
      entry('2024-01-04', 3060),
      entry('2024-01-05', 3080),
    ];
    const v = weightVelocity(entries);
    expect(v).not.toBeNull();
    // Regression of a perfect linear series should give exactly the slope.
    expect(v!).toBeCloseTo(20, 5);
  });

  it('uses only the last 4 entries — older entries must not affect the result', () => {
    // First entry is an outlier far in the past; last 4 entries are +20 g/day.
    const entries = [
      entry('2023-01-01', 1000), // outlier — should be ignored
      entry('2024-01-01', 3000),
      entry('2024-01-02', 3020),
      entry('2024-01-03', 3040),
      entry('2024-01-04', 3060),
    ];
    const v = weightVelocity(entries);
    expect(v).not.toBeNull();
    expect(v!).toBeCloseTo(20, 5);
  });

  it('handles an unordered input array correctly', () => {
    // Same 4-entry steady series, but passed out of order.
    const entries = [
      entry('2024-01-04', 3060),
      entry('2024-01-01', 3000),
      entry('2024-01-03', 3040),
      entry('2024-01-02', 3020),
    ];
    const v = weightVelocity(entries);
    expect(v).not.toBeNull();
    expect(v!).toBeCloseTo(20, 5);
  });

  it('returns a negative velocity for a steadily losing series', () => {
    const entries = [
      entry('2024-01-01', 3100),
      entry('2024-01-02', 3080),
      entry('2024-01-03', 3060),
    ];
    const v = weightVelocity(entries);
    expect(v).not.toBeNull();
    expect(v!).toBeCloseTo(-20, 5);
  });
});
