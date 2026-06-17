import type { UpdateWeightEntryInput } from '../../data/repository/index.js';
import type { WeightEntry } from '../../types/index.js';
import { MAX_AGE_DAYS } from '../growth/age.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AddWeightInput {
  dateMeasured: string;
  weightGrams: number;
}

export interface UseWeightsResult {
  weights: WeightEntry[];
  loading: boolean;
  error: Error | null;
  addWeight: (input: AddWeightInput) => Promise<WeightEntry>;
  editWeight: (id: string, patch: UpdateWeightEntryInput) => Promise<WeightEntry>;
  deleteWeight: (id: string) => Promise<void>;
  reload: () => void;
}

/** Result returned by {@link isWeightDateValid}. */
export interface WeightDateValidationResult {
  ok: boolean;
  reason?: 'before-birth' | 'beyond-range';
}

// ---------------------------------------------------------------------------
// Pure helper — exported so the form can validate with the child's DOB
// ---------------------------------------------------------------------------

/**
 * Validates whether a measurement date falls within the supported window for a
 * child born on `dateOfBirth`.
 *
 * - Returns `{ ok: false, reason: 'before-birth' }` when `dateMeasured` is
 *   strictly before `dateOfBirth`.
 * - Returns `{ ok: false, reason: 'beyond-range' }` when `dateMeasured` is
 *   more than 730 days (24 months) after `dateOfBirth`.
 * - Returns `{ ok: true }` otherwise.
 *
 * Both parameters must be ISO `YYYY-MM-DD` strings.
 */
export function isWeightDateValid(
  dateMeasured: string,
  dateOfBirth: string,
): WeightDateValidationResult {
  const measuredMs = Date.parse(dateMeasured);
  const birthMs = Date.parse(dateOfBirth);

  if (measuredMs < birthMs) {
    return { ok: false, reason: 'before-birth' };
  }

  const diffDays = (measuredMs - birthMs) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_AGE_DAYS) {
    return { ok: false, reason: 'beyond-range' };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Note: the stateful useWeights hook lives in WeightsProvider.tsx.
// This file is the canonical home for types and pure helpers that consumers
// (WeightForm, ImportNaraBaby) import directly without needing the provider.
// ---------------------------------------------------------------------------
