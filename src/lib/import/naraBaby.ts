/**
 * Nara Baby CSV import parser.
 *
 * Parses a Nara Baby CSV export and extracts weight Growth entries.
 * No external dependencies — uses a small RFC4180-ish tokenizer.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NaraWeight {
  /** ISO YYYY-MM-DD */
  dateMeasured: string;
  /** Integer grams */
  weightGrams: number;
}

/** Thrown when required headers are missing or the file format is invalid. */
export class NaraImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NaraImportError';
  }
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const REQUIRED_HEADERS = [
  'Type',
  'Start Date/time',
  '[Growth] Weight',
  '[Growth] Weight Unit',
] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// RFC4180-ish tokenizer
// ---------------------------------------------------------------------------

/**
 * Tokenizes a single CSV line into fields.
 * Handles double-quoted fields, embedded commas, and `""` escape sequences.
 * The `line` parameter must NOT include the trailing newline.
 */
function tokeniseLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    if (line[i] === '"') {
      // Quoted field
      i++; // consume opening quote
      let value = '';
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') {
            // Escaped double-quote
            value += '"';
            i += 2;
          } else {
            i++; // consume closing quote
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      fields.push(value);
      // Skip the separator comma if present
      if (i < len && line[i] === ',') i++;
    } else {
      // Unquoted field — read until comma or end
      const start = i;
      while (i < len && line[i] !== ',') {
        i++;
      }
      fields.push(line.slice(start, i));
      // Skip the separator comma if present
      if (i < len && line[i] === ',') i++;
    }
  }

  // If the line ends with a comma, the last field is an empty string
  if (len > 0 && line[len - 1] === ',') {
    fields.push('');
  }

  return fields;
}

/**
 * Splits CSV text into logical lines, handling `\r\n` and `\n` endings
 * while respecting quoted fields that may contain newlines.
 * Returns lines without trailing newline characters.
 */
function splitCsvLines(csvText: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  const len = csvText.length;

  while (i < len) {
    const ch = csvText[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      i++;
    } else if (!inQuotes && ch === '\r' && csvText[i + 1] === '\n') {
      lines.push(current);
      current = '';
      i += 2;
    } else if (!inQuotes && ch === '\n') {
      lines.push(current);
      current = '';
      i++;
    } else {
      current += ch;
      i++;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

function toGrams(value: number, unit: string): number | null {
  const normalisedUnit = unit.trim().toUpperCase();
  if (normalisedUnit === 'KG') {
    return Math.round(value * 1000);
  }
  if (normalisedUnit === 'LB') {
    return Math.round(value * 453.59237);
  }
  if (
    normalisedUnit === 'G' ||
    normalisedUnit === 'GRAM' ||
    normalisedUnit === 'GRAMS'
  ) {
    return Math.round(value);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public parser
// ---------------------------------------------------------------------------

/**
 * Parses a Nara Baby CSV export and returns weight entries.
 *
 * - Filters to `Type === 'Growth'` rows with a non-empty, positive weight.
 * - Converts weight to integer grams based on the unit column.
 * - Extracts `dateMeasured` as the first 10 chars of `Start Date/time`.
 * - Skips rows with unsupported units or malformed dates.
 * - When two rows share a date, the LAST occurrence wins.
 * - Returns entries sorted ascending by date.
 *
 * @throws {NaraImportError} When a required header column is missing.
 */
export function parseNaraBabyWeights(csvText: string): NaraWeight[] {
  const lines = splitCsvLines(csvText).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    throw new NaraImportError('CSV file is empty');
  }

  const headerLine = lines[0];
  if (headerLine === undefined) {
    throw new NaraImportError('CSV file has no header row');
  }

  const headers = tokeniseLine(headerLine);

  // Locate required column indices
  const headerIndex = new Map<string, number>();
  for (const [idx, header] of headers.entries()) {
    headerIndex.set(header, idx);
  }

  for (const required of REQUIRED_HEADERS) {
    if (!headerIndex.has(required)) {
      throw new NaraImportError(
        `Missing required header column: "${required}"`,
      );
    }
  }

  const typeIdx = headerIndex.get('Type') as number;
  const dateIdx = headerIndex.get('Start Date/time') as number;
  const weightIdx = headerIndex.get('[Growth] Weight') as number;
  const unitIdx = headerIndex.get('[Growth] Weight Unit') as number;

  // Map from date → weight (last wins)
  const byDate = new Map<string, number>();

  for (let row = 1; row < lines.length; row++) {
    const line = lines[row];
    if (line === undefined) continue;

    const fields = tokeniseLine(line);

    const type = fields[typeIdx] ?? '';
    if (type !== 'Growth') continue;

    const rawWeight = fields[weightIdx] ?? '';
    if (rawWeight.trim() === '') continue;

    const weightValue = parseFloat(rawWeight);
    if (isNaN(weightValue) || weightValue <= 0) continue;

    const rawUnit = fields[unitIdx] ?? '';
    const grams = toGrams(weightValue, rawUnit);
    if (grams === null) continue;

    const rawDate = fields[dateIdx] ?? '';
    const dateMeasured = rawDate.slice(0, 10);
    if (!ISO_DATE_RE.test(dateMeasured)) continue;

    byDate.set(dateMeasured, grams);
  }

  const results: NaraWeight[] = Array.from(byDate.entries()).map(
    ([dateMeasured, weightGrams]) => ({ dateMeasured, weightGrams }),
  );

  results.sort((a, b) => a.dateMeasured.localeCompare(b.dateMeasured));

  return results;
}
