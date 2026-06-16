import { useState, useEffect, useCallback } from 'react';
import { useRepository } from '../../data/repository/useRepository.js';
import type { CreateFeedingConfigInput } from '../../data/repository/index.js';
import { useAuth } from '../../auth/AuthContext.js';
import type { FeedingConfig } from '../../types/index.js';
import {
  DEFAULT_FEEDS_PER_DAY,
  STANDARD_KCAL_PER_ML,
  ML_PER_KG_MIN,
  ML_PER_KG_MAX,
} from '../constants/feeding.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Subset of FeedingConfig fields that the caller may patch.
 * childId and ownerId are stamped automatically by saveConfig.
 */
type FeedingConfigPatch = Partial<
  Pick<
    FeedingConfig,
    | 'feedsPerDay'
    | 'useHighCalorie'
    | 'kcalPerMl'
    | 'mlPerKgMin'
    | 'mlPerKgMax'
    | 'avgIntakeMlPerDay'
  >
>;

export interface UseFeedingResult {
  /** The current feeding config, or null when childId is null. */
  config: FeedingConfig | null;
  /** True while the initial async load is in flight. */
  loading: boolean;
  /** Set when an async operation fails; null when no error. */
  error: Error | null;
  /**
   * Merges `patch` into the current config, stamps childId + ownerId,
   * persists via repository, updates state, and returns the saved config.
   *
   * Error strategy: sets `error` state AND re-throws so the caller (e.g. a
   * toast handler) can react to the failure without polling `error`.
   */
  saveConfig: (patch: FeedingConfigPatch) => Promise<FeedingConfig>;
  /** Re-fetches the config from the repository. */
  reload: () => void;
}

// ---------------------------------------------------------------------------
// In-memory default config — returned when no persisted config exists yet.
// We do NOT persist until the user explicitly saves something.
// ---------------------------------------------------------------------------

/**
 * Builds a synthetic in-memory FeedingConfig that acts as a sensible default
 * before the user has saved anything. The `id`, `createdAt`, and `updatedAt`
 * fields are left empty because the record does not exist in storage yet.
 */
function buildDefaultConfig(childId: string, ownerId: string): FeedingConfig {
  return {
    id: '',
    childId,
    ownerId,
    feedsPerDay: DEFAULT_FEEDS_PER_DAY,
    useHighCalorie: false,
    kcalPerMl: STANDARD_KCAL_PER_ML,
    mlPerKgMin: ML_PER_KG_MIN,
    mlPerKgMax: ML_PER_KG_MAX,
    createdAt: '',
    updatedAt: '',
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the feeding configuration for a single child.
 *
 * - When `childId` is null, returns `config: null` and does not attempt any
 *   network / storage call.
 * - When `childId` changes the hook re-fetches. If no config is found in
 *   storage, a sensible in-memory default is surfaced WITHOUT persisting it.
 * - `saveConfig` merges a patch, stamps the required FK fields, and persists.
 *   It re-throws on failure so the caller can show a toast.
 *
 * Load failures set `error` but do NOT propagate to the render cycle.
 */
export function useFeeding(childId: string | null): UseFeedingResult {
  const { user } = useAuth();
  const repository = useRepository();
  const ownerId = user?.id ?? null;

  const [config, setConfig] = useState<FeedingConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  // Incrementing this counter triggers a re-fetch without recreating callbacks.
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // ---- Fetch on mount / childId change / reload ----------------------------

  useEffect(() => {
    if (childId === null || ownerId === null) {
      setConfig(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    repository.feedingConfig
      .getByChild(childId)
      .then((fetched) => {
        if (cancelled) return;
        // If no config exists yet, expose defaults in memory — do not persist.
        setConfig(fetched ?? buildDefaultConfig(childId, ownerId));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const normalised = err instanceof Error ? err : new Error(String(err));
        setError(normalised);
        setLoading(false);
        // Do not re-throw: load failures must not propagate to the render cycle.
      });

    return () => {
      cancelled = true;
    };
  }, [childId, ownerId, reloadCounter, repository]);

  // ---- saveConfig ----------------------------------------------------------

  const saveConfig = useCallback(
    async (patch: FeedingConfigPatch): Promise<FeedingConfig> => {
      if (childId === null) {
        const noChildError = new Error('saveConfig called with no childId');
        setError(noChildError);
        throw noChildError;
      }
      if (ownerId === null) {
        const noOwnerError = new Error('saveConfig called with no signed-in user');
        setError(noOwnerError);
        throw noOwnerError;
      }

      setError(null);

      // Merge the patch on top of the current in-memory config (or defaults).
      const base: FeedingConfig =
        config ?? buildDefaultConfig(childId, ownerId);

      // avgIntakeMlPerDay: use the patch value if explicitly provided (including
      // undefined, which clears the field); otherwise fall back to the stored value.
      const avgIntakeMlPerDay: number | undefined =
        'avgIntakeMlPerDay' in patch
          ? patch.avgIntakeMlPerDay
          : base.avgIntakeMlPerDay;

      const input: CreateFeedingConfigInput = {
        childId,
        ownerId,
        feedsPerDay: patch.feedsPerDay ?? base.feedsPerDay,
        useHighCalorie: patch.useHighCalorie ?? base.useHighCalorie,
        kcalPerMl: patch.kcalPerMl ?? base.kcalPerMl,
        mlPerKgMin: patch.mlPerKgMin ?? base.mlPerKgMin,
        mlPerKgMax: patch.mlPerKgMax ?? base.mlPerKgMax,
        avgIntakeMlPerDay,
      };

      try {
        const saved = await repository.feedingConfig.upsert(input);
        setConfig(saved);
        return saved;
      } catch (err: unknown) {
        const normalised = err instanceof Error ? err : new Error(String(err));
        setError(normalised);
        throw normalised;
      }
    },
    [childId, ownerId, config, repository],
  );

  // ---- reload --------------------------------------------------------------

  const reload = useCallback((): void => {
    setReloadCounter((n) => n + 1);
  }, []);

  return { config, loading, error, saveConfig, reload };
}
