import { useState, useEffect, useCallback } from 'react';
import { useRepository } from '../../data/repository/useRepository.js';
import type { UpdateChildInput } from '../../data/repository/index.js';
import { useAuth } from '../../auth/AuthContext.js';
import type { Child, Sex } from '../../types/index.js';
import { normaliseError } from './mutationError.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

interface CreateChildValues {
  name: string;
  sex: Sex;
  dateOfBirth: string;
}

interface UseChildResult {
  child: Child | null;
  loading: boolean;
  error: Error | null;
  createChild: (values: CreateChildValues) => Promise<Child>;
  updateChild: (id: string, patch: UpdateChildInput) => Promise<Child>;
  deleteChild: (id: string) => Promise<void>;
  reload: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the single child for the current owner (MVP — one child per account).
 *
 * Mutation error strategy: mutations wrap repository calls in try/catch,
 * set the `error` state with the caught error, and then RE-THROW so the
 * caller (e.g. a form) can also handle it (e.g. show a toast). This gives
 * both the hook's error state and the call-site full information.
 */
export function useChild(): UseChildResult {
  const { user } = useAuth();
  const repository = useRepository();
  const ownerId = user?.id ?? null;
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Incrementing this counter triggers a re-fetch without recreating callbacks.
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // ---- Fetch on mount / reload ---------------------------------------------

  useEffect(() => {
    if (ownerId === null) {
      // No owner yet (e.g. remote mode, signed out) — nothing to load.
      setChild(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    repository.children
      .list(ownerId)
      .then((children) => {
        if (cancelled) return;
        setChild(children[0] ?? null);
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
  }, [ownerId, reloadCounter, repository]);

  // ---- Mutations -----------------------------------------------------------

  const createChild = useCallback(
    async (values: CreateChildValues): Promise<Child> => {
      if (ownerId === null) {
        const noOwnerError = new Error('Cannot create child: no signed-in user');
        setError(noOwnerError);
        throw noOwnerError;
      }
      setError(null);
      try {
        const created = await repository.children.create({
          ownerId,
          name: values.name,
          sex: values.sex,
          dateOfBirth: values.dateOfBirth,
        });
        setChild(created);
        return created;
      } catch (err: unknown) {
        const normalised = normaliseError(err);
        setError(normalised);
        throw normalised;
      }
    },
    [ownerId, repository],
  );

  const updateChild = useCallback(
    async (id: string, patch: UpdateChildInput): Promise<Child> => {
      setError(null);
      try {
        const updated = await repository.children.update(id, patch);
        setChild(updated);
        return updated;
      } catch (err: unknown) {
        const normalised = normaliseError(err);
        setError(normalised);
        throw normalised;
      }
    },
    [repository],
  );

  const deleteChild = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await repository.children.delete(id);
        setChild(null);
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

  return { child, loading, error, createChild, updateChild, deleteChild, reload };
}
