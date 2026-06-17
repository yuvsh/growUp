/**
 * Remote → local migration routine (PRD SYNC-5 / HLD §5).
 *
 * Symmetric counterpart to {@link migrateLocalToRemote}: reads all of the
 * signed-in user's rows from the Supabase-backed repository and writes them into
 * the local (on-device) store under the anonymous local owner id.
 *
 * Design guarantees:
 * - **Id-preserving:** the original entity `id` (and `childId`) is kept so
 *   child↔weight/feeding references stay intact. Because the public repository
 *   `create` API mints fresh ids, this routine writes id-preserving rows
 *   directly into the same localStorage keys the local repository reads from.
 * - **Owner re-stamped:** every copied entity's `ownerId` becomes the local
 *   anonymous id so the local repository's owner-scoped reads find them.
 * - **Continue-on-error:** each entity is written independently; a failure is
 *   captured (counted + short message) and the routine carries on.
 * - **Non-destructive:** the cloud copy is never deleted.
 */
import { supabaseRepository } from '../../data/repository/index.js';
import type { Repository } from '../../data/repository/types.js';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index.js';
import type { MigrationCounts, MigrationResult } from './migrateLocalToRemote.js';
import { describeError } from './describeError.js';

// ---------------------------------------------------------------------------
// localStorage keys — must match createLocalStorageRepository's KEYS.
// ---------------------------------------------------------------------------

const LOCAL_KEYS = {
  children: 'growup:children',
  weights: 'growup:weights',
  feedingConfig: 'growup:feedingConfig',
} as const;

// ---------------------------------------------------------------------------
// Minimal storage abstraction (injectable for tests; defaults to localStorage)
// ---------------------------------------------------------------------------

export interface LocalWriteStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MigrateRemoteToLocalArgs {
  /** Supabase auth uid — used to read the signed-in user's remote rows. */
  remoteOwnerId: string;
  /** Anonymous local user id — becomes `ownerId` on every copied entity. */
  localOwnerId: string;
  /** Injectable read source for tests; defaults to the Supabase repository. */
  readRepo?: Repository;
  /** Injectable write target for tests; defaults to `window.localStorage`. */
  store?: LocalWriteStore;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parses a JSON array from the store; returns `[]` for missing/invalid data. */
function readArray<TEntity>(store: LocalWriteStore, key: string): TEntity[] {
  const raw = store.getItem(key);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TEntity[]) : [];
  } catch {
    return [];
  }
}

/**
 * Inserts or replaces (by id) a single id-preserving entity in the store.
 * Returns a captured error message on failure, or `null` on success.
 */
function upsertById<TEntity extends { id: string }>(
  store: LocalWriteStore,
  key: string,
  entity: TEntity,
  label: string,
): string | null {
  try {
    const all = readArray<TEntity>(store, key);
    const next = all.filter((item) => item.id !== entity.id);
    next.push(entity);
    store.setItem(key, JSON.stringify(next));
    return null;
  } catch (cause) {
    return describeError(label, cause);
  }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Copies all remote data for {@link MigrateRemoteToLocalArgs.remoteOwnerId}
 * into the local store under {@link MigrateRemoteToLocalArgs.localOwnerId}.
 * Id-preserving and continue-on-error. Never deletes the cloud copy.
 */
export async function migrateRemoteToLocal(
  args: MigrateRemoteToLocalArgs,
): Promise<MigrationResult> {
  const { remoteOwnerId, localOwnerId } = args;
  const readRepo = args.readRepo ?? supabaseRepository;
  const store = args.store ?? window.localStorage;

  const downloaded: MigrationCounts = {
    children: 0,
    weights: 0,
    feedingConfigs: 0,
  };
  const errors: string[] = [];
  let failed = 0;

  const recordFailure = (message: string): void => {
    failed += 1;
    errors.push(message);
  };

  const children = await readRepo.children.list(remoteOwnerId);

  for (const child of children) {
    const localChild: Child = { ...child, ownerId: localOwnerId };
    const childError = upsertById(
      store,
      LOCAL_KEYS.children,
      localChild,
      `child ${child.id}`,
    );
    if (childError === null) {
      downloaded.children += 1;
    } else {
      recordFailure(childError);
    }

    const childWeights = await readRepo.weights.listByChild(child.id);
    for (const entry of childWeights) {
      const localEntry: WeightEntry = { ...entry, ownerId: localOwnerId };
      const weightError = upsertById(
        store,
        LOCAL_KEYS.weights,
        localEntry,
        `weight ${entry.id}`,
      );
      if (weightError === null) {
        downloaded.weights += 1;
      } else {
        recordFailure(weightError);
      }
    }

    const config = await readRepo.feedingConfig.getByChild(child.id);
    if (config !== null) {
      const localConfig: FeedingConfig = { ...config, ownerId: localOwnerId };
      const configError = upsertById(
        store,
        LOCAL_KEYS.feedingConfig,
        localConfig,
        `feedingConfig ${config.id}`,
      );
      if (configError === null) {
        downloaded.feedingConfigs += 1;
      } else {
        recordFailure(configError);
      }
    }
  }

  return { uploaded: downloaded, failed, errors };
}
