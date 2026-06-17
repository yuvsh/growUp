// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Import pure helper AFTER vi.mock calls (none here — isWeightDateValid is pure)
// ---------------------------------------------------------------------------

import { isWeightDateValid } from './useWeights.js';

// ---------------------------------------------------------------------------
// Tests: isWeightDateValid (pure helper)
// Stateful useWeights behavior is tested in WeightsProvider.test.tsx.
// ---------------------------------------------------------------------------

describe('isWeightDateValid', () => {
  const DOB = '2024-01-15';

  it('returns ok: true when dateMeasured equals dateOfBirth', () => {
    expect(isWeightDateValid('2024-01-15', DOB)).toEqual({ ok: true });
  });

  it('returns ok: true for a date well within the 0–24 month window', () => {
    // 180 days after DOB
    expect(isWeightDateValid('2024-07-13', DOB)).toEqual({ ok: true });
  });

  it('returns ok: true at exactly 730 days after DOB', () => {
    // 2024 is a leap year: Jan 15 + 730 days = Jan 14, 2026
    const exactly730 = new Date(Date.parse(DOB) + 730 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isWeightDateValid(exactly730, DOB)).toEqual({ ok: true });
  });

  it('returns { ok: false, reason: "before-birth" } when dateMeasured is before DOB', () => {
    expect(isWeightDateValid('2024-01-14', DOB)).toEqual({
      ok: false,
      reason: 'before-birth',
    });
  });

  it('returns { ok: false, reason: "before-birth" } far before DOB', () => {
    expect(isWeightDateValid('2020-06-01', DOB)).toEqual({
      ok: false,
      reason: 'before-birth',
    });
  });

  it('returns { ok: false, reason: "beyond-range" } when dateMeasured is 731 days after DOB', () => {
    const beyond = new Date(Date.parse(DOB) + 731 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isWeightDateValid(beyond, DOB)).toEqual({
      ok: false,
      reason: 'beyond-range',
    });
  });

  it('returns { ok: false, reason: "beyond-range" } far beyond the window', () => {
    expect(isWeightDateValid('2028-01-15', DOB)).toEqual({
      ok: false,
      reason: 'beyond-range',
    });
  });
});
