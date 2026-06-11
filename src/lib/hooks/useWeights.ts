import { useState, useEffect, useCallback } from 'react';
import { useRepository } from '../../data/repository/useRepository.js';
import type { UpdateWeightEntryInput } from '../../data/repository/index.js';
import { useAuth } from '../../auth/AuthContext.js';
import { weightEntrySchema } from '../../types/schemas.js';
import type { WeightEntry } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

interface AddWeightInput {
  dateMeasured: string;
  weightGrams: number;
}

interface UseWeightsResult {
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

/** Maximum supported age window in days (0–24 months). */
const MAX_AGE_DAYS = 730;

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
// Internal helpers
// ---------------------------------------------------------------------------

function sortAscByDate(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.dateMeasured.localeCompare(b.dateMeasured));
}

function normaliseError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages weight entries for a single child.
 *
 * ## Error contract
 *
 * - **Load failures** (`listByChild` rejects): error state is set; the
 *   rejection is _not_ re-thrown so the render cycle stays intact.
 * - **Mutation failures** (`addWeight`, `editWeight`, `deleteWeight`): error
 *   state is set _and_ the normalised `Error` is re-thrown so the call-site
 *   (e.g. a form component) can display a toast without relying solely on the
 *   hook's `error` state.
 * - **Validation failures** in `addWeight`: a `ZodError` (or a wrapped
 *   `Error`) is thrown directly — error state is also set — before any
 *   repository call is made.
 *
 * @param childId - The child whose weights to load. Pass `null` to skip
 *   loading (weights will be an empty array).
 */
export function useWeights(childId: string | null): UseWeightsResult {
  const { user } = useAuth();
  const repository = useRepository();
  const ownerId = user?.id ?? null;
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // ---- Fetch on mount / childId change / reload ---------------------------

  useEffect(() => {
    if (childId === null) {
      setWeights([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    repository.weights
      .listByChild(childId)
      .then((entries) => {
        if (cancelled) return;
        setWeights(sortAscByDate(entries));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(normaliseError(err));
        setLoading(false);
        // Do not re-throw: load failures must not propagate to the render cycle.
      });

    return () => {
      cancelled = true;
    };
  }, [childId, reloadCounter, repository]);

  // ---- Mutations -----------------------------------------------------------

  const addWeight = useCallback(
    async (input: AddWeightInput): Promise<WeightEntry> => {
      if (childId === null) {
        const noChildError = new Error('Cannot add weight: no child selected');
        setError(noChildError);
        throw noChildError;
      }
      if (ownerId === null) {
        const noOwnerError = new Error('Cannot add weight: no signed-in user');
        setError(noOwnerError);
        throw noOwnerError;
      }

      setError(null);

      // Build the candidate object that would be persisted (minus server fields).
      // We need all required fields for schema validation, so we supply
      // placeholder values for server-managed fields to run the schema check.
      const now = new Date().toISOString();
      const candidate = {
        id: 'pending',
        childId,
        ownerId,
        dateMeasured: input.dateMeasured,
        weightGrams: input.weightGrams,
        createdAt: now,
        updatedAt: now,
      };

      const parseResult = weightEntrySchema.safeParse(candidate);
      if (!parseResult.success) {
        const validationError = new Error(
          `Weight entry validation failed: ${parseResult.error.errors.map((e) => e.message).join('; ')}`,
        );
        setError(validationError);
        throw validationError;
      }

      try {
        const created = await repository.weights.create({
          childId,
          ownerId,
          dateMeasured: input.dateMeasured,
          weightGrams: input.weightGrams,
        });
        setWeights((prev) => sortAscByDate([...prev, created]));
        return created;
      } catch (err: unknown) {
        const normalised = normaliseError(err);
        setError(normalised);
        throw normalised;
      }
    },
    [childId, ownerId, repository],
  );

  const editWeight = useCallback(
    async (id: string, patch: UpdateWeightEntryInput): Promise<WeightEntry> => {
      setError(null);
      try {
        const updated = await repository.weights.update(id, patch);
        setWeights((prev) =>
          sortAscByDate(prev.map((w) => (w.id === id ? updated : w))),
        );
        return updated;
      } catch (err: unknown) {
        const normalised = normaliseError(err);
        setError(normalised);
        throw normalised;
      }
    },
    [repository],
  );

  const deleteWeight = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await repository.weights.delete(id);
        setWeights((prev) => prev.filter((w) => w.id !== id));
      } catch (err: unknown) {
        const normalised = normaliseError(err);
        setError(normalised);
        throw normalised;
      }
    },
    [repository],
  );

  const reload = useCallback((): void => {
    setReloadCounter((n) => n + 1);
  }, []);

  return { weights, loading, error, addWeight, editWeight, deleteWeight, reload };
}
