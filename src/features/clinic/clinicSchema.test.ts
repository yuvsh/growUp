import { describe, it, expect } from 'vitest';
import { clinicInputSchema, WHO_MAX_AGE_DAYS } from './clinicSchema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a date string N days from today in YYYY-MM-DD format. */
function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const TODAY = offsetDate(0);
const TOMORROW = offsetDate(1);

/** A DOB ~3 months ago, with a single current weight measured today. */
const validSingleWeight = {
  dateOfBirth: offsetDate(-90),
  sex: 'female' as const,
  birthWeightGrams: 3200,
  currentWeights: [{ weightGrams: 5400, measuredOn: TODAY }],
};

/** Returns the first issue path joined with dots, for path-scoped assertions. */
function firstIssuePath(result: ReturnType<typeof clinicInputSchema.safeParse>): string {
  if (result.success) return '';
  return result.error.issues[0]?.path.join('.') ?? '';
}

// ---------------------------------------------------------------------------
// Valid inputs
// ---------------------------------------------------------------------------

describe('clinicInputSchema — valid inputs', () => {
  it('accepts a valid single current weight', () => {
    const result = clinicInputSchema.safeParse(validSingleWeight);
    expect(result.success).toBe(true);
  });

  it('accepts a valid two current-weight input', () => {
    const result = clinicInputSchema.safeParse({
      ...validSingleWeight,
      currentWeights: [
        { weightGrams: 5200, measuredOn: offsetDate(-7) },
        { weightGrams: 5400, measuredOn: TODAY },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invalid inputs
// ---------------------------------------------------------------------------

describe('clinicInputSchema — invalid inputs', () => {
  it('rejects a future date of birth', () => {
    const result = clinicInputSchema.safeParse({
      ...validSingleWeight,
      dateOfBirth: TOMORROW,
    });
    expect(result.success).toBe(false);
    expect(firstIssuePath(result)).toBe('dateOfBirth');
  });

  it('rejects a missing birth weight', () => {
    const { birthWeightGrams: _omitted, ...withoutBirthWeight } = validSingleWeight;
    const result = clinicInputSchema.safeParse(withoutBirthWeight);
    expect(result.success).toBe(false);
    expect(firstIssuePath(result)).toBe('birthWeightGrams');
  });

  it('rejects an age beyond the WHO 0–730 day range', () => {
    // DOB just over 730 days before the measurement date.
    const result = clinicInputSchema.safeParse({
      ...validSingleWeight,
      dateOfBirth: offsetDate(-(WHO_MAX_AGE_DAYS + 5)),
      currentWeights: [{ weightGrams: 12000, measuredOn: TODAY }],
    });
    expect(result.success).toBe(false);
    expect(firstIssuePath(result)).toBe('currentWeights.0.measuredOn');
  });

  it('rejects a current-weight date before the date of birth', () => {
    const result = clinicInputSchema.safeParse({
      ...validSingleWeight,
      dateOfBirth: offsetDate(-30),
      currentWeights: [{ weightGrams: 5400, measuredOn: offsetDate(-60) }],
    });
    expect(result.success).toBe(false);
    expect(firstIssuePath(result)).toBe('currentWeights.0.measuredOn');
  });

  it('rejects reversed two current-weight dates', () => {
    const result = clinicInputSchema.safeParse({
      ...validSingleWeight,
      currentWeights: [
        { weightGrams: 5400, measuredOn: TODAY },
        { weightGrams: 5200, measuredOn: offsetDate(-7) },
      ],
    });
    expect(result.success).toBe(false);
    expect(firstIssuePath(result)).toBe('currentWeights.1.measuredOn');
  });

  it('rejects a same-date two-weight pair (velocity undefined)', () => {
    const result = clinicInputSchema.safeParse({
      ...validSingleWeight,
      currentWeights: [
        { weightGrams: 5200, measuredOn: TODAY },
        { weightGrams: 5400, measuredOn: TODAY },
      ],
    });
    expect(result.success).toBe(false);
    expect(firstIssuePath(result)).toBe('currentWeights.1.measuredOn');
  });
});
