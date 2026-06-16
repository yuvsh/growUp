import { childSchema, weightEntrySchema, feedingConfigSchema } from '../../types/schemas.js';
import type { Child, WeightEntry, FeedingConfig, Sex } from '../../types/index.js';
import { getSupabaseClient } from '../../lib/supabase/client.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Repository,
  CreateChildInput,
  UpdateChildInput,
  CreateWeightEntryInput,
  UpdateWeightEntryInput,
  CreateFeedingConfigInput,
} from './types.js';
import { RepositoryWriteError } from './types.js';

// ---------------------------------------------------------------------------
// Table names
// ---------------------------------------------------------------------------

const TABLES = {
  children: 'children',
  weights: 'weight_entries',
  feedingConfig: 'feeding_configs',
} as const;

const FEEDING_CONFIG_CONFLICT_TARGET = 'child_id';

// ---------------------------------------------------------------------------
// Row shapes (snake_case, as stored in Postgres)
// ---------------------------------------------------------------------------

interface ChildRow {
  id: string;
  owner_id: string;
  name: string;
  sex: string;
  date_of_birth: string;
  created_at: string;
  updated_at: string;
}

interface WeightEntryRow {
  id: string;
  owner_id: string;
  child_id: string;
  date_measured: string;
  weight_grams: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapping: snake_case row -> camelCase entity (validated with Zod)
// ---------------------------------------------------------------------------

function toChild(row: ChildRow): Child {
  return childSchema.parse({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    sex: row.sex as Sex,
    dateOfBirth: row.date_of_birth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toWeightEntry(row: WeightEntryRow): WeightEntry {
  return weightEntrySchema.parse({
    id: row.id,
    childId: row.child_id,
    ownerId: row.owner_id,
    dateMeasured: row.date_measured,
    weightGrams: row.weight_grams,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toFeedingConfig(row: FeedingConfigRow): FeedingConfig {
  return feedingConfigSchema.parse({
    id: row.id,
    childId: row.child_id,
    ownerId: row.owner_id,
    feedsPerDay: row.feeds_per_day,
    useHighCalorie: row.use_high_calorie,
    kcalPerMl: row.kcal_per_ml,
    mlPerKgMin: row.ml_per_kg_min,
    mlPerKgMax: row.ml_per_kg_max,
    ...(row.avg_intake_ml_per_day !== null
      ? { avgIntakeMlPerDay: row.avg_intake_ml_per_day }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ---------------------------------------------------------------------------
// Mapping: camelCase input -> snake_case row (for insert/update/upsert)
// Only includes keys that are present (so partial updates don't null columns).
// ---------------------------------------------------------------------------

function childInsertRow(input: CreateChildInput, id: string): Partial<ChildRow> {
  return {
    id,
    owner_id: input.ownerId,
    name: input.name,
    sex: input.sex,
    date_of_birth: input.dateOfBirth,
  };
}

function childPatchRow(patch: UpdateChildInput): Partial<ChildRow> {
  const row: Partial<ChildRow> = {};
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.sex !== undefined) row.sex = patch.sex;
  if (patch.dateOfBirth !== undefined) row.date_of_birth = patch.dateOfBirth;
  return row;
}

function weightInsertRow(
  input: CreateWeightEntryInput,
  id: string,
): Partial<WeightEntryRow> {
  return {
    id,
    owner_id: input.ownerId,
    child_id: input.childId,
    date_measured: input.dateMeasured,
    weight_grams: input.weightGrams,
  };
}

function weightPatchRow(patch: UpdateWeightEntryInput): Partial<WeightEntryRow> {
  const row: Partial<WeightEntryRow> = {};
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
  if (patch.childId !== undefined) row.child_id = patch.childId;
  if (patch.dateMeasured !== undefined) row.date_measured = patch.dateMeasured;
  if (patch.weightGrams !== undefined) row.weight_grams = patch.weightGrams;
  return row;
}

function feedingConfigUpsertRow(
  input: CreateFeedingConfigInput,
  id: string,
): Partial<FeedingConfigRow> {
  return {
    id,
    owner_id: input.ownerId,
    child_id: input.childId,
    feeds_per_day: input.feedsPerDay,
    use_high_calorie: input.useHighCalorie,
    kcal_per_ml: input.kcalPerMl,
    ml_per_kg_min: input.mlPerKgMin,
    ml_per_kg_max: input.mlPerKgMax,
    avg_intake_ml_per_day: input.avgIntakeMlPerDay ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Wraps an unexpected failure (network, validation, supabase error) in the
 * repository's typed error so the UI's existing calm error handling applies.
 */
function failWrite(message: string, cause: unknown): never {
  throw new RepositoryWriteError(message, cause);
}

// ---------------------------------------------------------------------------
// Factory — creates a Supabase-backed Repository. The client is resolved lazily
// per call so unconfigured (local-only) users never trigger the guard at
// construction time.
// ---------------------------------------------------------------------------

export function createSupabaseRepository(
  getClient: () => SupabaseClient = getSupabaseClient,
): Repository {
  // ---- Children ------------------------------------------------------------

  const children = {
    async list(ownerId: string): Promise<Child[]> {
      const { data, error } = await getClient()
        .from(TABLES.children)
        .select('*')
        .eq('owner_id', ownerId);
      if (error) failWrite('Failed to load children', error);
      const rows = (data ?? []) as ChildRow[];
      return rows.map(toChild);
    },

    async get(id: string): Promise<Child | null> {
      const { data, error } = await getClient()
        .from(TABLES.children)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) failWrite(`Failed to load child "${id}"`, error);
      if (data === null) return null;
      return toChild(data as ChildRow);
    },

    async create(input: CreateChildInput): Promise<Child> {
      const { data, error } = await getClient()
        .from(TABLES.children)
        .insert(childInsertRow(input, newId()))
        .select()
        .single();
      if (error) failWrite('Failed to create child', error);
      return toChild(data as ChildRow);
    },

    async update(id: string, patch: UpdateChildInput): Promise<Child> {
      const { data, error } = await getClient()
        .from(TABLES.children)
        .update(childPatchRow(patch))
        .eq('id', id)
        .select()
        .single();
      if (error) failWrite(`Failed to update child "${id}"`, error);
      return toChild(data as ChildRow);
    },

    async delete(id: string): Promise<void> {
      const { error } = await getClient()
        .from(TABLES.children)
        .delete()
        .eq('id', id);
      if (error) failWrite(`Failed to delete child "${id}"`, error);
    },
  };

  // ---- WeightEntries -------------------------------------------------------

  const weights = {
    async listByChild(childId: string): Promise<WeightEntry[]> {
      const { data, error } = await getClient()
        .from(TABLES.weights)
        .select('*')
        .eq('child_id', childId);
      if (error) failWrite('Failed to load weight entries', error);
      const rows = (data ?? []) as WeightEntryRow[];
      return rows.map(toWeightEntry);
    },

    async create(input: CreateWeightEntryInput): Promise<WeightEntry> {
      const { data, error } = await getClient()
        .from(TABLES.weights)
        .insert(weightInsertRow(input, newId()))
        .select()
        .single();
      if (error) failWrite('Failed to create weight entry', error);
      return toWeightEntry(data as WeightEntryRow);
    },

    async update(id: string, patch: UpdateWeightEntryInput): Promise<WeightEntry> {
      const { data, error } = await getClient()
        .from(TABLES.weights)
        .update(weightPatchRow(patch))
        .eq('id', id)
        .select()
        .single();
      if (error) failWrite(`Failed to update weight entry "${id}"`, error);
      return toWeightEntry(data as WeightEntryRow);
    },

    async delete(id: string): Promise<void> {
      const { error } = await getClient()
        .from(TABLES.weights)
        .delete()
        .eq('id', id);
      if (error) failWrite(`Failed to delete weight entry "${id}"`, error);
    },
  };

  // ---- FeedingConfig -------------------------------------------------------

  const feedingConfig = {
    async getByChild(childId: string): Promise<FeedingConfig | null> {
      const { data, error } = await getClient()
        .from(TABLES.feedingConfig)
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();
      if (error) failWrite('Failed to load feeding config', error);
      if (data === null) return null;
      return toFeedingConfig(data as FeedingConfigRow);
    },

    async upsert(input: CreateFeedingConfigInput): Promise<FeedingConfig> {
      const { data, error } = await getClient()
        .from(TABLES.feedingConfig)
        .upsert(feedingConfigUpsertRow(input, newId()), {
          onConflict: FEEDING_CONFIG_CONFLICT_TARGET,
        })
        .select()
        .single();
      if (error) failWrite('Failed to save feeding config', error);
      return toFeedingConfig(data as FeedingConfigRow);
    },
  };

  return { children, weights, feedingConfig };
}

/**
 * Default Supabase-backed repository instance, wired to the lazy client.
 * Note: constructing this does NOT resolve the client; that happens on the
 * first method call, keeping local-only users safe.
 */
export const supabaseRepository: Repository = createSupabaseRepository();
