/**
 * Local → remote migration routine (PRD SYNC-4 / HLD §5).
 *
 * Reads all local entities (children, weight entries, feeding configs) for the
 * anonymous local owner and uploads them to Supabase under the signed-in
 * account's owner id.
 *
 * Design guarantees:
 * - **Id-preserving:** the original entity `id` (and `child_id`) is kept so
 *   child↔weight/feeding references stay intact.
 * - **Idempotent:** uploads use `upsert` keyed on `id` (`onConflict: 'id'`), so
 *   re-running the migration writes the same rows without duplicating.
 * - **Continue-on-error:** each record is uploaded independently; a failure is
 *   captured (counted + short message) and the routine carries on.
 * - **Non-destructive:** local data is never deleted.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client.js';
import { localRepository } from '../../data/repository/index.js';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index.js';
import { describeError } from './describeError.js';

// ---------------------------------------------------------------------------
// Table names (snake_case, as stored in Postgres — HLD §3)
// ---------------------------------------------------------------------------

const TABLES = {
  children: 'children',
  weights: 'weight_entries',
  feedingConfig: 'feeding_configs',
} as const;

const CONFLICT_TARGET = 'id';

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface MigrationCounts {
  children: number;
  weights: number;
  feedingConfigs: number;
}

export interface MigrationResult {
  uploaded: MigrationCounts;
  failed: number;
  errors: string[];
}

export interface MigrateLocalToRemoteArgs {
  /** Anonymous local user id (used to read local rows). */
  localOwnerId: string;
  /** Supabase auth uid — becomes `owner_id` on every uploaded row. */
  remoteOwnerId: string;
  /** Injectable for tests; defaults to the shared lazy client. */
  getClient?: () => SupabaseClient;
}

// ---------------------------------------------------------------------------
// camelCase entity → snake_case row mappers (owner_id forced to remoteOwnerId)
// ---------------------------------------------------------------------------

interface ChildRow {
  id: string;
  owner_id: string;
  name: string;
  sex: string;
  date_of_birth: string;
}

interface WeightEntryRow {
  id: string;
  owner_id: string;
  child_id: string;
  date_measured: string;
  weight_grams: number;
}

interface FeedingConfigRow {
  id: string;
  owner_id: string;
  child_id: string;
  feeds_per_day: number;
  use_high_calorie: boolean;
  kcal_per_ml: number;
  ml_per_kg_min: number;
  ml_per_kg_max: number;
  avg_intake_ml_per_day: number | null;
}

function childToRow(child: Child, remoteOwnerId: string): ChildRow {
  return {
    id: child.id,
    owner_id: remoteOwnerId,
    name: child.name,
    sex: child.sex,
    date_of_birth: child.dateOfBirth,
  };
}

function weightToRow(entry: WeightEntry, remoteOwnerId: string): WeightEntryRow {
  return {
    id: entry.id,
    owner_id: remoteOwnerId,
    child_id: entry.childId,
    date_measured: entry.dateMeasured,
    weight_grams: entry.weightGrams,
  };
}

function feedingConfigToRow(
  config: FeedingConfig,
  remoteOwnerId: string,
): FeedingConfigRow {
  return {
    id: config.id,
    owner_id: remoteOwnerId,
    child_id: config.childId,
    feeds_per_day: config.feedsPerDay,
    use_high_calorie: config.useHighCalorie,
    kcal_per_ml: config.kcalPerMl,
    ml_per_kg_min: config.mlPerKgMin,
    ml_per_kg_max: config.mlPerKgMax,
    avg_intake_ml_per_day: config.avgIntakeMlPerDay ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Upserts a single row keyed on `id`. Returns the captured error message on
 * failure (so the caller can count it and continue), or `null` on success.
 */
async function upsertRow<TRow extends object>(
  client: SupabaseClient,
  table: string,
  row: TRow,
  label: string,
): Promise<string | null> {
  try {
    const { error } = await client
      .from(table)
      .upsert(row, { onConflict: CONFLICT_TARGET });
    if (error) return describeError(label, error);
    return null;
  } catch (cause) {
    return describeError(label, cause);
  }
}

// ---------------------------------------------------------------------------
// Counts (preview) — no upload
// ---------------------------------------------------------------------------

/**
 * Counts the local children, weight entries and feeding configs for the given
 * owner without uploading anything. Used to populate the migration preview.
 */
export async function getLocalDataCounts(
  localOwnerId: string,
): Promise<MigrationCounts> {
  const children = await localRepository.children.list(localOwnerId);

  let weights = 0;
  let feedingConfigs = 0;
  for (const child of children) {
    const childWeights = await localRepository.weights.listByChild(child.id);
    weights += childWeights.length;
    const config = await localRepository.feedingConfig.getByChild(child.id);
    if (config !== null) feedingConfigs += 1;
  }

  return { children: children.length, weights, feedingConfigs };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Uploads all local data for {@link MigrateLocalToRemoteArgs.localOwnerId} to
 * Supabase under {@link MigrateLocalToRemoteArgs.remoteOwnerId}. Idempotent,
 * id-preserving, and continue-on-error. Never deletes local data.
 */
export async function migrateLocalToRemote(
  args: MigrateLocalToRemoteArgs,
): Promise<MigrationResult> {
  const { localOwnerId, remoteOwnerId } = args;
  const getClient = args.getClient ?? getSupabaseClient;
  const client = getClient();

  const uploaded: MigrationCounts = { children: 0, weights: 0, feedingConfigs: 0 };
  const errors: string[] = [];
  let failed = 0;

  const recordFailure = (message: string): void => {
    failed += 1;
    errors.push(message);
  };

  const children = await localRepository.children.list(localOwnerId);

  for (const child of children) {
    const childError = await upsertRow(
      client,
      TABLES.children,
      childToRow(child, remoteOwnerId),
      `child ${child.id}`,
    );
    if (childError === null) {
      uploaded.children += 1;
    } else {
      recordFailure(childError);
    }

    const childWeights = await localRepository.weights.listByChild(child.id);
    for (const entry of childWeights) {
      const weightError = await upsertRow(
        client,
        TABLES.weights,
        weightToRow(entry, remoteOwnerId),
        `weight ${entry.id}`,
      );
      if (weightError === null) {
        uploaded.weights += 1;
      } else {
        recordFailure(weightError);
      }
    }

    const config = await localRepository.feedingConfig.getByChild(child.id);
    if (config !== null) {
      const configError = await upsertRow(
        client,
        TABLES.feedingConfig,
        feedingConfigToRow(config, remoteOwnerId),
        `feedingConfig ${config.id}`,
      );
      if (configError === null) {
        uploaded.feedingConfigs += 1;
      } else {
        recordFailure(configError);
      }
    }
  }

  return { uploaded, failed, errors };
}
