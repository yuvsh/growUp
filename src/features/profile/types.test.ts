import { describe, it, expect } from 'vitest';
import { childFormSchema } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a date string that is `offsetDays` from today (UTC). */
function dateOffset(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

const TODAY = dateOffset(0);
const YESTERDAY = dateOffset(-1);
const TOMORROW = dateOffset(1);

// ---------------------------------------------------------------------------
// childFormSchema
// ---------------------------------------------------------------------------

describe('childFormSchema', () => {
  it('accepts a valid entry', () => {
    const result = childFormSchema.safeParse({
      name: 'Noa',
      sex: 'female',
      dateOfBirth: YESTERDAY,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Noa');
      expect(result.data.sex).toBe('female');
      expect(result.data.dateOfBirth).toBe(YESTERDAY);
    }
  });

  it('accepts today as date of birth (edge of "not in the future")', () => {
    const result = childFormSchema.safeParse({
      name: 'Eli',
      sex: 'male',
      dateOfBirth: TODAY,
    });

    expect(result.success).toBe(true);
  });

  it('trims whitespace from name and still accepts it', () => {
    const result = childFormSchema.safeParse({
      name: '  Omer  ',
      sex: 'male',
      dateOfBirth: YESTERDAY,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Omer');
    }
  });

  it('rejects an empty name', () => {
    const result = childFormSchema.safeParse({
      name: '',
      sex: 'female',
      dateOfBirth: YESTERDAY,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('name');
    }
  });

  it('rejects a whitespace-only name', () => {
    const result = childFormSchema.safeParse({
      name: '   ',
      sex: 'female',
      dateOfBirth: YESTERDAY,
    });

    expect(result.success).toBe(false);
  });

  it('rejects null sex', () => {
    const result = childFormSchema.safeParse({
      name: 'Noa',
      sex: null,
      dateOfBirth: YESTERDAY,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('sex');
    }
  });

  it('rejects an unrecognised sex value', () => {
    const result = childFormSchema.safeParse({
      name: 'Noa',
      sex: 'other',
      dateOfBirth: YESTERDAY,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a future date of birth', () => {
    const result = childFormSchema.safeParse({
      name: 'Noa',
      sex: 'female',
      dateOfBirth: TOMORROW,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('dateOfBirth');
    }
  });

  it('rejects an empty dateOfBirth string', () => {
    const result = childFormSchema.safeParse({
      name: 'Noa',
      sex: 'female',
      dateOfBirth: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a non-date string for dateOfBirth', () => {
    const result = childFormSchema.safeParse({
      name: 'Noa',
      sex: 'female',
      dateOfBirth: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });
});
