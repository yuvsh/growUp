import { describe, it, expect } from 'vitest';
import { ageFromDob, formatAge, type AgeBreakdown } from './age';

describe('ageFromDob', () => {
  describe('newborn: asOf === DOB', () => {
    it('returns 0 days, 0 weeks, 0 months', () => {
      const result = ageFromDob('2024-01-15', '2024-01-15');
      expect(result.days).toBe(0);
      expect(result.weeks).toBe(0);
      expect(result.months).toBe(0);
    });
  });

  describe('exactly 7 days', () => {
    it('returns 7 days, 1 week, 0 months', () => {
      const result = ageFromDob('2024-01-01', '2024-01-08');
      expect(result.days).toBe(7);
      expect(result.weeks).toBe(1);
      expect(result.months).toBe(0);
    });
  });

  describe('exactly 1 completed calendar month', () => {
    it('DOB Jan 15, asOf Feb 15 → 1 month', () => {
      expect(ageFromDob('2024-01-15', '2024-02-15').months).toBe(1);
    });
  });

  describe('exactly 2 completed calendar months', () => {
    it('DOB Jan 15, asOf Mar 15 → 2 months', () => {
      expect(ageFromDob('2024-01-15', '2024-03-15').months).toBe(2);
    });
  });

  describe('exactly 12 completed calendar months', () => {
    it('DOB Jan 15 2024, asOf Jan 15 2025 → 12 months', () => {
      expect(ageFromDob('2024-01-15', '2025-01-15').months).toBe(12);
    });
  });

  describe('exactly 24 completed calendar months', () => {
    it('DOB Jan 15 2023, asOf Jan 15 2025 → 24 months', () => {
      expect(ageFromDob('2023-01-15', '2025-01-15').months).toBe(24);
    });
  });

  describe('days and weeks are computed correctly', () => {
    it('Jan 15 to Mar 15 2024 (leap year) is 60 days, 8 weeks, 2 months', () => {
      const result = ageFromDob('2024-01-15', '2024-03-15');
      expect(result.days).toBe(60);
      expect(result.weeks).toBe(8); // floor(60/7) = 8
      expect(result.months).toBe(2);
    });
  });

  describe('month boundary: DOB Jan 31', () => {
    it('asOf Feb 28 (non-leap year 2023) → 1 completed month', () => {
      // DOB Jan 31 + 1 month = Feb 28 (clamped; Feb 31 doesn't exist).
      // Feb 28 ≤ Feb 28 → 1 completed month.
      expect(ageFromDob('2023-01-31', '2023-02-28').months).toBe(1);
    });

    it('asOf Mar 1 (non-leap year 2023) → 1 completed month', () => {
      // DOB + 1 month = Feb 28 ≤ Mar 1 → 1.
      // DOB + 2 months = Mar 31 > Mar 1 → stop at 1.
      expect(ageFromDob('2023-01-31', '2023-03-01').months).toBe(1);
    });

    it('asOf Mar 31 (non-leap year 2023) → 2 completed months', () => {
      // DOB + 2 months = Mar 31 ≤ Mar 31 → 2.
      expect(ageFromDob('2023-01-31', '2023-03-31').months).toBe(2);
    });
  });

  describe('leap year boundary: DOB Feb 29 2024', () => {
    it('asOf Feb 28 2025 (non-leap) → 12 completed months', () => {
      // DOB + 12 months: Feb 29 2025 doesn't exist → clamped to Feb 28 2025.
      // Feb 28 2025 ≤ Feb 28 2025 → 12 months.
      expect(ageFromDob('2024-02-29', '2025-02-28').months).toBe(12);
    });

    it('asOf Mar 1 2025 → 12 completed months', () => {
      // DOB + 12 months = Feb 28 2025 ≤ Mar 1 → 12.
      // DOB + 13 months = Mar 29 2025 > Mar 1 → stop at 12.
      expect(ageFromDob('2024-02-29', '2025-03-01').months).toBe(12);
    });
  });

  describe('day-before-month-anniversary', () => {
    it('DOB Jan 15, asOf Feb 14 → 0 completed months, 30 days, 4 weeks', () => {
      // Feb 15 (1-month anniversary) > Feb 14 → 0 months.
      const result = ageFromDob('2024-01-15', '2024-02-14');
      expect(result.months).toBe(0);
      expect(result.days).toBe(30); // Jan 15→Feb 14: 30 days
      expect(result.weeks).toBe(4); // floor(30/7) = 4
    });

    it('DOB Jan 15, asOf Feb 15 → 1 completed month', () => {
      expect(ageFromDob('2024-01-15', '2024-02-15').months).toBe(1);
    });
  });

  describe('default asOf is today', () => {
    it('returns non-negative values when called with only DOB', () => {
      const result = ageFromDob('2024-01-01');
      expect(result.days).toBeGreaterThanOrEqual(0);
      expect(result.weeks).toBeGreaterThanOrEqual(0);
      expect(result.months).toBeGreaterThanOrEqual(0);
    });
  });

  describe('weeks is always floor(days / 7)', () => {
    const cases: Array<[string, string]> = [
      ['2024-01-01', '2024-01-06'], // 5 days → 0 weeks
      ['2024-01-01', '2024-01-08'], // 7 days → 1 week
      ['2024-01-01', '2024-01-15'], // 14 days → 2 weeks
      ['2024-01-01', '2024-02-01'], // 31 days → 4 weeks
    ];
    it.each(cases)('ageFromDob(%s, %s) weeks === floor(days/7)', (dob, asOf) => {
      const result = ageFromDob(dob, asOf);
      expect(result.weeks).toBe(Math.floor(result.days / 7));
    });
  });

  describe('remainingDaysAfterMonths', () => {
    it('is 0 when asOf is exactly on the month anniversary', () => {
      const result = ageFromDob('2024-01-15', '2024-03-15');
      expect(result.remainingDaysAfterMonths).toBe(0);
    });

    it('is 7 for DOB Jan 15, asOf Apr 22 (3 months + 7 days)', () => {
      // Jan 15 → Apr 15 = 3 months; Apr 15 → Apr 22 = 7 days remaining.
      const result = ageFromDob('2024-01-15', '2024-04-22');
      expect(result.remainingDaysAfterMonths).toBe(7);
    });
  });
});

describe('formatAge', () => {
  it('formats 0 days as "0 days"', () => {
    const age: AgeBreakdown = { days: 0, weeks: 0, months: 0, remainingDaysAfterMonths: 0 };
    expect(formatAge(age)).toBe('0 days');
  });

  it('formats 1 day as "1 day"', () => {
    const age: AgeBreakdown = { days: 1, weeks: 0, months: 0, remainingDaysAfterMonths: 1 };
    expect(formatAge(age)).toBe('1 day');
  });

  it('formats 5 days as "5 days"', () => {
    const age: AgeBreakdown = { days: 5, weeks: 0, months: 0, remainingDaysAfterMonths: 5 };
    expect(formatAge(age)).toBe('5 days');
  });

  it('formats 1 week (exactly 7 days) as "1 week"', () => {
    const age: AgeBreakdown = { days: 7, weeks: 1, months: 0, remainingDaysAfterMonths: 7 };
    expect(formatAge(age)).toBe('1 week');
  });

  it('formats 2 weeks (14 days) as "2 weeks"', () => {
    const age: AgeBreakdown = { days: 14, weeks: 2, months: 0, remainingDaysAfterMonths: 14 };
    expect(formatAge(age)).toBe('2 weeks');
  });

  it('formats 10 days (1 week, 3 days) as "1 week, 3 days"', () => {
    const age: AgeBreakdown = { days: 10, weeks: 1, months: 0, remainingDaysAfterMonths: 10 };
    expect(formatAge(age)).toBe('1 week, 3 days');
  });

  it('formats 1 month without leftover weeks as "1 month"', () => {
    // 31 days total, months=1, remainingDaysAfterMonths=0 (landed exactly on month boundary)
    const age: AgeBreakdown = { days: 31, weeks: 4, months: 1, remainingDaysAfterMonths: 0 };
    expect(formatAge(age)).toBe('1 month');
  });

  it('formats 3 months + 1 week using real ageFromDob result', () => {
    // DOB Jan 15, asOf Apr 22 2024: 3 months + 7 remaining days → "3 months, 1 week"
    const age = ageFromDob('2024-01-15', '2024-04-22');
    expect(age.months).toBe(3);
    expect(age.remainingDaysAfterMonths).toBe(7);
    expect(formatAge(age)).toBe('3 months, 1 week');
  });

  it('formats 2 months using real ageFromDob result', () => {
    const age = ageFromDob('2024-01-15', '2024-03-15');
    expect(formatAge(age)).toBe('2 months');
  });
});
