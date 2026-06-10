/**
 * Tests for the Nara Baby CSV parser.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseNaraBabyWeights, NaraImportError } from './naraBaby';

const thisDir = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const HEADER =
  '"Type","Profile Name","Start Date/time","Start Date/time (Epoch)","[Bottle Feed] Type","[Growth] Weight","[Growth] Weight Unit"';

function makeRow(
  type: string,
  date: string,
  weight: string,
  unit: string,
): string {
  return `"${type}","Ori","${date}","12345","","${weight}","${unit}"`;
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('parseNaraBabyWeights — basic fixture', () => {
  it('extracts one Growth+weight row, correct grams and date (KG)', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-01-15 00:00:00', '5.5', 'KG'),
      makeRow('Growth', '2026-01-20 00:00:00', '', ''),  // height-only, no weight
      makeRow('Bottle Feed', '2026-01-22 00:00:00', '', ''), // wrong type
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ dateMeasured: '2026-01-15', weightGrams: 5500 });
  });

  it('converts LB correctly', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-02-01 00:00:00', '10', 'LB'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.weightGrams).toBe(Math.round(10 * 453.59237));
  });

  it('converts G (grams) correctly', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-02-01 00:00:00', '4500', 'G'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.weightGrams).toBe(4500);
  });

  it('converts GRAM correctly', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-02-01 00:00:00', '3800', 'GRAM'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.weightGrams).toBe(3800);
  });

  it('converts GRAMS correctly', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-02-01 00:00:00', '3800', 'GRAMS'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.weightGrams).toBe(3800);
  });

  it('skips rows with an unknown unit', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-02-01 00:00:00', '5.0', 'OZ'),
      makeRow('Growth', '2026-02-02 00:00:00', '5.1', 'KG'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.dateMeasured).toBe('2026-02-02');
  });

  it('skips rows with a malformed date (no ISO match)', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '20260201', '5.0', 'KG'), // no spaces, wrong format
      makeRow('Growth', '2026-02-02 00:00:00', '5.1', 'KG'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.dateMeasured).toBe('2026-02-02');
  });

  it('duplicate dates: last occurrence wins', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-03-01 00:00:00', '4.0', 'KG'),
      makeRow('Growth', '2026-03-01 00:00:00', '4.2', 'KG'), // same date, later in file
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.weightGrams).toBe(4200);
  });

  it('throws NaraImportError when a required header is missing', () => {
    // Header is missing "[Growth] Weight"
    const badHeader =
      '"Type","Profile Name","Start Date/time","[Growth] Weight Unit"';
    const csv = [badHeader, makeRow('Growth', '2026-01-01 00:00:00', '5', 'KG')].join(
      '\n',
    );

    expect(() => parseNaraBabyWeights(csv)).toThrowError(NaraImportError);
    expect(() => parseNaraBabyWeights(csv)).toThrowError(
      /Missing required header column: "\[Growth\] Weight"/,
    );
  });

  it('handles \\r\\n line endings', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-01-15 00:00:00', '5.5', 'KG'),
    ].join('\r\n');

    const result = parseNaraBabyWeights(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.weightGrams).toBe(5500);
  });

  it('returns results sorted ascending by date', () => {
    const csv = [
      HEADER,
      makeRow('Growth', '2026-03-01 00:00:00', '5.5', 'KG'),
      makeRow('Growth', '2026-01-01 00:00:00', '4.5', 'KG'),
      makeRow('Growth', '2026-02-01 00:00:00', '5.0', 'KG'),
    ].join('\n');

    const result = parseNaraBabyWeights(csv);

    expect(result.map((r) => r.dateMeasured)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Real-file integration test
// ---------------------------------------------------------------------------

describe('parseNaraBabyWeights — real Nara Baby export', () => {
  it('parses exactly 20 weight entries from the sample export', () => {
    const csvPath = join(
      thisDir,
      '../../../docs/sample_narababy_export.csv',
    );
    const csvText = readFileSync(csvPath, 'utf-8');

    const result = parseNaraBabyWeights(csvText);

    expect(result).toHaveLength(20);
  });

  it('all weightGrams are integers in the sane infant range (2000–8000g)', () => {
    const csvPath = join(
      thisDir,
      '../../../docs/sample_narababy_export.csv',
    );
    const csvText = readFileSync(csvPath, 'utf-8');

    const result = parseNaraBabyWeights(csvText);

    for (const entry of result) {
      expect(Number.isInteger(entry.weightGrams)).toBe(true);
      expect(entry.weightGrams).toBeGreaterThanOrEqual(2000);
      expect(entry.weightGrams).toBeLessThanOrEqual(8000);
    }
  });

  it('all dates match the ISO YYYY-MM-DD pattern', () => {
    const csvPath = join(
      thisDir,
      '../../../docs/sample_narababy_export.csv',
    );
    const csvText = readFileSync(csvPath, 'utf-8');

    const result = parseNaraBabyWeights(csvText);

    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    for (const entry of result) {
      expect(entry.dateMeasured).toMatch(ISO_DATE_RE);
    }
  });
});
