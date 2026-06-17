// WeightsProvider — single shared weights state for the active child (P5).
//
// Why a provider instead of calling useWeights(childId) in every consumer:
// Growth, WeightForm, ImportNaraBaby, and Feeding previously each instantiated
// their own hook copy, resulting in four independent fetches and brittle manual
// reload() plumbing on the Growth screen to re-sync after form mutations. This
// provider is mounted once in PrimaryLayout and shared across all tabs, so
// switching tabs never re-fetches and mutations are immediately reflected
// everywhere.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRepository } from '../../data/repository/useRepository.js';
import type { UpdateWeightEntryInput } from '../../data/repository/index.js';
import { useAuth } from '../../auth/AuthContext.js';
import { useChild } from './useChild.js';
import { weightEntrySchema } from '../../types/schemas.js';
import type { WeightEntry } from '../../types/index.js';
import { normaliseError } from './mutationError.js';
import type { AddWeightInput, UseWeightsResult } from './useWeights.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sortAscByDate(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.dateMeasured.localeCompare(b.dateMeasured));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WeightsContext = createContext<UseWeightsResult | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface WeightsProviderProps {
  children: ReactNode;
}

/**
 * Provides a single shared weights state for the active child.
 *
 * Mount this once in PrimaryLayout (after the child guard passes). All
 * descendants can call `useWeights()` to read weights and perform mutations
 * without triggering duplicate fetches.
 *
 * ## Error contract (identical to the old per-instance useWeights hook)
 *
 * - **Load failures** (`listByChild` rejects): error state is set; the
 *   rejection is _not_ re-thrown so the render cycle stays intact.
 * - **Mutation failures** (`addWeight`, `editWeight`, `deleteWeight`): error
 *   state is set _and_ the normalised `Error` is re-thrown so the call-site
 *   (e.g. a form component) can display a toast without relying solely on the
 *   hook's `error` state.
 * - **Validation failures** in `addWeight`: a wrapped `Error` is thrown
 *   directly — error state is also set — before any repository call is made.
 * - `childId === null` (transient pre-resolve): weights stay empty, no fetch.
 */
export function WeightsProvider({ children }: WeightsProviderProps): React.JSX.Element {
  const { child } = useChild();
  const childId = child?.id ?? null;

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

  const value: UseWeightsResult = {
    weights,
    loading,
    error,
    addWeight,
    editWeight,
    deleteWeight,
    reload,
  };

  return (
    <WeightsContext.Provider value={value}>{children}</WeightsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * Returns the shared weights state from the nearest `WeightsProvider`.
 *
 * The signature is intentionally parameter-less: the provider derives the
 * active childId itself via `useChild()`, so consumers never need to pass it.
 * This is the only way to consume weights — the old `useWeights(childId)` form
 * no longer exists as a stateful hook.
 */
export function useWeights(): UseWeightsResult {
  const context = useContext(WeightsContext);
  if (context === null) {
    throw new Error('useWeights must be used within a WeightsProvider');
  }
  return context;
}
