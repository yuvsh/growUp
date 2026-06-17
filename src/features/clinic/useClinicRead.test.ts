// @vitest-environment jsdom
//
// Tests for the ephemeral Clinic Mode derivation hook.
//
// Reference values are not hardcoded blindly: where a WHO/projection figure
// matters, the expected value is derived in-test by calling the SAME pure
// functions the hook uses, so the test stays in lock-step with the domain.

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClinicRead } from './useClinicRead';
import type { ClinicInput } from './types';
import { weightToZResult } from '../../lib/who';
import { projectGrowth } from '../../lib/growth/projection';
import { ageFromDob } from '../../lib/growth/age';
import type { WeightEntry } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS_PER_WEEK = 7;

/** Build the same ephemeral WeightEntry[] the hook builds, for cross-checking. */
function buildEntries(input: ClinicInput): WeightEntry[] {
  const stub = (date: string, grams: number): WeightEntry => ({
    id: date,
    childId: 'clinic-ephemeral',
    ownerId: 'clinic-ephemeral',
    dateMeasured: date,
    weightGrams: grams,
    createdAt: '',
    updatedAt: '',
  });
  return [
    stub(input.dateOfBirth, input.birthWeightGrams),
    ...input.currentWeights.map((entry) =>
      stub(entry.measuredOn, entry.weightGrams),
    ),
  ];
}

// ---------------------------------------------------------------------------
// State lifecycle
// ---------------------------------------------------------------------------

describe('useClinicRead — lifecycle', () => {
  it('starts with null input and null read', () => {
    const { result } = renderHook(() => useClinicRead());
    expect(result.current.input).toBeNull();
    expect(result.current.read).toBeNull();
  });

  it('reset() clears input and read back to null', () => {
    const { result } = renderHook(() => useClinicRead());
    const input: ClinicInput = {
      dateOfBirth: '2026-01-01',
      sex: 'male',
      birthWeightGrams: 3400,
      currentWeights: [{ weightGrams: 4600, measuredOn: '2026-01-31' }],
    };

    act(() => result.current.submit(input));
    expect(result.current.read).not.toBeNull();

    act(() => result.current.reset());
    expect(result.current.input).toBeNull();
    expect(result.current.read).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Single current weight — birth anchors trend + catchUp
// ---------------------------------------------------------------------------

describe('useClinicRead — single current weight', () => {
  it('produces trend and catchUp because birth weight anchors day 0', () => {
    const input: ClinicInput = {
      dateOfBirth: '2026-01-01',
      sex: 'male',
      birthWeightGrams: 3400,
      currentWeights: [{ weightGrams: 4600, measuredOn: '2026-01-31' }],
    };

    const { result } = renderHook(() => useClinicRead());
    act(() => result.current.submit(input));

    const read = result.current.read;
    expect(read).not.toBeNull();
    if (read === null) {
      throw new Error('read should be present');
    }

    // Age + z at latest match the pure fns.
    const ageDays = ageFromDob('2026-01-01', '2026-01-31').days;
    expect(read.ageDaysAtLatest).toBe(ageDays);
    expect(read.zResult).toEqual(weightToZResult(4600, 'male', ageDays));
    expect(read.birthZResult).toEqual(weightToZResult(3400, 'male', 0));

    // Trend: (4600 - 3400) / 30 = 40 g/day, gaining.
    expect(read.trend.direction).toBe('gain');
    expect(read.trend.gramsPerDay).toBeCloseTo((4600 - 3400) / ageDays, 6);

    // catchUp is always present (single current weight still has the birth point).
    expect(read.catchUp.mode).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Two current weights
// ---------------------------------------------------------------------------

describe('useClinicRead — two current weights', () => {
  it('uses the later reading for the latest z and trend endpoint', () => {
    const input: ClinicInput = {
      dateOfBirth: '2026-01-01',
      sex: 'male',
      birthWeightGrams: 3400,
      currentWeights: [
        { weightGrams: 4200, measuredOn: '2026-01-20' },
        { weightGrams: 4700, measuredOn: '2026-01-31' },
      ],
    };

    const { result } = renderHook(() => useClinicRead());
    act(() => result.current.submit(input));

    const read = result.current.read;
    if (read === null) {
      throw new Error('read should be present');
    }

    // Latest = the 2026-01-31 / 4700g reading.
    const ageDays = ageFromDob('2026-01-01', '2026-01-31').days;
    expect(read.ageDaysAtLatest).toBe(ageDays);
    expect(read.zResult).toEqual(weightToZResult(4700, 'male', ageDays));

    // Trend endpoint is birth → latest: (4700 - 3400) / 30.
    expect(read.trend.gramsPerDay).toBeCloseTo((4700 - 3400) / ageDays, 6);
    expect(read.trend.direction).toBe('gain');
  });
});

// ---------------------------------------------------------------------------
// catch-up vs maintenance — mirrors ProjectionCard's branch exactly
// ---------------------------------------------------------------------------

describe('useClinicRead — catch-up vs maintenance', () => {
  it("below the 3rd line → mode 'catch-up' with positive g/day and g/week", () => {
    const input: ClinicInput = {
      dateOfBirth: '2026-01-01',
      sex: 'male',
      birthWeightGrams: 2600,
      currentWeights: [{ weightGrams: 3200, measuredOn: '2026-01-31' }],
    };

    // Cross-check against the same projection the hook runs.
    const projection = projectGrowth(buildEntries(input), 'male', '2026-01-01');
    expect(projection.dailyGainToReach3rdGrams).toBeGreaterThan(0);

    const { result } = renderHook(() => useClinicRead());
    act(() => result.current.submit(input));

    const read = result.current.read;
    if (read === null) {
      throw new Error('read should be present');
    }

    expect(read.catchUp.mode).toBe('catch-up');
    expect(read.catchUp.gramsPerDay).toBeCloseTo(
      projection.dailyGainToReach3rdGrams,
      6,
    );
    expect(read.catchUp.gramsPerWeek).toBeCloseTo(
      projection.weeklyGainToReach3rdGrams,
      6,
    );
    expect(read.catchUp.gramsPerDay).toBeGreaterThan(0);
    expect(read.catchUp.gramsPerWeek).toBeGreaterThan(0);
  });

  it("on/above the 3rd line → mode 'maintenance' from regression velocity", () => {
    const input: ClinicInput = {
      dateOfBirth: '2026-01-01',
      sex: 'male',
      birthWeightGrams: 3400,
      currentWeights: [{ weightGrams: 4600, measuredOn: '2026-01-31' }],
    };

    const projection = projectGrowth(buildEntries(input), 'male', '2026-01-01');
    // Gap-to-3rd is non-positive here (baby is on/above the line).
    expect(projection.dailyGainToReach3rdGrams).toBeLessThanOrEqual(0);

    const { result } = renderHook(() => useClinicRead());
    act(() => result.current.submit(input));

    const read = result.current.read;
    if (read === null) {
      throw new Error('read should be present');
    }

    expect(read.catchUp.mode).toBe('maintenance');
    // Maintenance reports the sustaining velocity, never a negative gap-to-3rd.
    expect(read.catchUp.gramsPerDay).toBeCloseTo(
      projection.velocityGramsPerDay,
      6,
    );
    expect(read.catchUp.gramsPerWeek).toBeCloseTo(
      projection.velocityGramsPerDay * DAYS_PER_WEEK,
      6,
    );
  });
});
