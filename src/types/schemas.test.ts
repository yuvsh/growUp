import { describe, it, expect } from 'vitest';
import { childSchema, weightEntrySchema, feedingConfigSchema } from './schemas';

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
const YESTERDAY = offsetDate(-1);
const TOMORROW = offsetDate(1);

// ---------------------------------------------------------------------------
// childSchema
// ---------------------------------------------------------------------------

describe('childSchema', () => {
  const validChild = {
    id: 'child-1',
    ownerId: 'owner-1',
    name: 'Aria',
    sex: 'female' as const,
    dateOfBirth: YESTERDAY,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('parses a valid child', () => {
    const result = childSchema.safeParse(validChild);
    expect(result.success).toBe(true);
  });

  it('trims whitespace from name', () => {
    const result = childSchema.safeParse({ ...validChild, name: '  Aria  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Aria');
    }
  });

  it('rejects an empty name', () => {
    const result = childSchema.safeParse({ ...validChild, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a future dateOfBirth', () => {
    const result = childSchema.safeParse({ ...validChild, dateOfBirth: TOMORROW });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('future'))).toBe(true);
    }
  });

  it('accepts today as a valid dateOfBirth', () => {
    const result = childSchema.safeParse({ ...validChild, dateOfBirth: TODAY });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid date string', () => {
    const result = childSchema.safeParse({ ...validChild, dateOfBirth: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sex value', () => {
    const result = childSchema.safeParse({ ...validChild, sex: 'other' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing ownerId', () => {
    const { ownerId: _omitted, ...rest } = validChild;
    const result = childSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// weightEntrySchema
// ---------------------------------------------------------------------------

describe('weightEntrySchema', () => {
  const validEntry = {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured: YESTERDAY,
    weightGrams: 3500,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('parses a valid weight entry', () => {
    const result = weightEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it('rejects zero weight', () => {
    const result = weightEntrySchema.safeParse({ ...validEntry, weightGrams: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative weight', () => {
    const result = weightEntrySchema.safeParse({ ...validEntry, weightGrams: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer weight', () => {
    const result = weightEntrySchema.safeParse({ ...validEntry, weightGrams: 3500.5 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid dateMeasured', () => {
    const result = weightEntrySchema.safeParse({ ...validEntry, dateMeasured: '20260101' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing childId', () => {
    const { childId: _omitted, ...rest } = validEntry;
    const result = weightEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// feedingConfigSchema
// ---------------------------------------------------------------------------

describe('feedingConfigSchema', () => {
  const validConfig = {
    id: 'config-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    feedsPerDay: 8,
    useHighCalorie: false,
    kcalPerMl: 0.67,
    mlPerKgMin: 120,
    mlPerKgMax: 200,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('parses a valid feeding config', () => {
    const result = feedingConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('rejects feedsPerDay of 0', () => {
    const result = feedingConfigSchema.safeParse({ ...validConfig, feedsPerDay: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative feedsPerDay', () => {
    const result = feedingConfigSchema.safeParse({ ...validConfig, feedsPerDay: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer feedsPerDay', () => {
    const result = feedingConfigSchema.safeParse({ ...validConfig, feedsPerDay: 7.5 });
    expect(result.success).toBe(false);
  });

  it('rejects mlPerKgMax < mlPerKgMin', () => {
    const result = feedingConfigSchema.safeParse({
      ...validConfig,
      mlPerKgMin: 150,
      mlPerKgMax: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('mlPerKgMax'))).toBe(true);
    }
  });

  it('accepts mlPerKgMax === mlPerKgMin (boundary)', () => {
    const result = feedingConfigSchema.safeParse({
      ...validConfig,
      mlPerKgMin: 150,
      mlPerKgMax: 150,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero kcalPerMl', () => {
    const result = feedingConfigSchema.safeParse({ ...validConfig, kcalPerMl: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative mlPerKgMin', () => {
    const result = feedingConfigSchema.safeParse({ ...validConfig, mlPerKgMin: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects useHighCalorie as non-boolean', () => {
    const result = feedingConfigSchema.safeParse({ ...validConfig, useHighCalorie: 'yes' });
    expect(result.success).toBe(false);
  });
});
