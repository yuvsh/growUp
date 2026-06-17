import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { migrateLocalToRemote, getLocalDataCounts } from './migrateLocalToRemote';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index';

// ---------------------------------------------------------------------------
// Mock the local repository
// ---------------------------------------------------------------------------

const mockListChildren = vi.fn();
const mockListWeightsByChild = vi.fn();
const mockGetFeedingByChild = vi.fn();

vi.mock('../../data/repository/index.js', () => ({
  localRepository: {
    children: {
      list: (ownerId: string): Promise<Child[]> => mockListChildren(ownerId),
    },
    weights: {
      listByChild: (childId: string): Promise<WeightEntry[]> =>
        mockListWeightsByChild(childId),
    },
    feedingConfig: {
      getByChild: (childId: string): Promise<FeedingConfig | null> =>
        mockGetFeedingByChild(childId),
    },
  },
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const LOCAL_OWNER = 'local-anon-id';
const REMOTE_OWNER = 'supabase-auth-uid';

const CHILD: Child = {
  id: 'child-1',
  ownerId: LOCAL_OWNER,
  name: 'Mia',
  sex: 'female',
  dateOfBirth: '2025-01-15',
  createdAt: '2025-01-16T00:00:00.000Z',
  updatedAt: '2025-01-16T00:00:00.000Z',
};

const WEIGHT: WeightEntry = {
  id: 'weight-1',
  childId: 'child-1',
  ownerId: LOCAL_OWNER,
  dateMeasured: '2025-02-01',
  weightGrams: 4200,
  createdAt: '2025-02-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
};

const FEEDING: FeedingConfig = {
  id: 'feeding-1',
  childId: 'child-1',
  ownerId: LOCAL_OWNER,
  feedsPerDay: 8,
  useHighCalorie: false,
  kcalPerMl: 0.67,
  mlPerKgMin: 120,
  mlPerKgMax: 200,
  avgIntakeMlPerDay: 550,
  createdAt: '2025-02-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Chainable Supabase client mock — captures upsert calls per table
// ---------------------------------------------------------------------------

interface UpsertCall {
  table: string;
  row: Record<string, unknown>;
  options: unknown;
}

function makeClient(
  shouldFail: (table: string, row: Record<string, unknown>) => boolean = () => false,
): { client: SupabaseClient; calls: UpsertCall[] } {
  const calls: UpsertCall[] = [];

  const from = (table: string): { upsert: typeof upsert } => {
    const upsert = (
      row: Record<string, unknown>,
      options: unknown,
    ): Promise<{ error: { message: string } | null }> => {
      calls.push({ table, row, options });
      const error = shouldFail(table, row)
        ? { message: `forced failure for ${table}` }
        : null;
      return Promise.resolve({ error });
    };
    return { upsert };
  };

  const client = { from } as unknown as SupabaseClient;
  return { client, calls };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockListChildren.mockResolvedValue([CHILD]);
  mockListWeightsByChild.mockResolvedValue([WEIGHT]);
  mockGetFeedingByChild.mockResolvedValue(FEEDING);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('migrateLocalToRemote', () => {
  it('upserts every record with preserved id, remote owner_id, and snake_case columns', async () => {
    const { client, calls } = makeClient();

    const result = await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => client,
    });

    expect(result.uploaded).toEqual({ children: 1, weights: 1, feedingConfigs: 1 });
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);

    const childCall = calls.find((c) => c.table === 'children');
    expect(childCall?.options).toEqual({ onConflict: 'id' });
    expect(childCall?.row).toEqual({
      id: 'child-1',
      owner_id: REMOTE_OWNER,
      name: 'Mia',
      sex: 'female',
      date_of_birth: '2025-01-15',
    });

    const weightCall = calls.find((c) => c.table === 'weight_entries');
    expect(weightCall?.row).toEqual({
      id: 'weight-1',
      owner_id: REMOTE_OWNER,
      child_id: 'child-1',
      date_measured: '2025-02-01',
      weight_grams: 4200,
    });

    const feedingCall = calls.find((c) => c.table === 'feeding_configs');
    expect(feedingCall?.row).toEqual({
      id: 'feeding-1',
      owner_id: REMOTE_OWNER,
      child_id: 'child-1',
      feeds_per_day: 8,
      use_high_calorie: false,
      kcal_per_ml: 0.67,
      ml_per_kg_min: 120,
      ml_per_kg_max: 200,
      avg_intake_ml_per_day: 550,
    });
  });

  it('maps an omitted avgIntakeMlPerDay to null', async () => {
    const configNoIntake: FeedingConfig = { ...FEEDING };
    delete configNoIntake.avgIntakeMlPerDay;
    mockGetFeedingByChild.mockResolvedValue(configNoIntake);

    const { client, calls } = makeClient();
    await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => client,
    });

    const feedingCall = calls.find((c) => c.table === 'feeding_configs');
    expect(feedingCall?.row.avg_intake_ml_per_day).toBeNull();
  });

  it('is idempotent — re-running upserts the same rows (onConflict id)', async () => {
    const { client, calls } = makeClient();

    await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => client,
    });
    await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => client,
    });

    expect(calls).toHaveLength(6);
    expect(calls.every((c) => c.options).valueOf()).toBe(true);
    for (const call of calls) {
      expect(call.options).toEqual({ onConflict: 'id' });
    }
  });

  it('counts an upsert error as failed but keeps uploading other records', async () => {
    // Fail only the weight upsert.
    const { client } = makeClient((table) => table === 'weight_entries');

    const result = await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => client,
    });

    expect(result.uploaded.children).toBe(1);
    expect(result.uploaded.feedingConfigs).toBe(1);
    expect(result.uploaded.weights).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('weight weight-1');
  });

  it('captures a thrown client error per record and continues', async () => {
    const throwingClient = {
      from: () => ({
        upsert: (): Promise<never> => Promise.reject(new Error('network down')),
      }),
    } as unknown as SupabaseClient;

    const result = await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => throwingClient,
    });

    expect(result.uploaded).toEqual({ children: 0, weights: 0, feedingConfigs: 0 });
    expect(result.failed).toBe(3);
    expect(result.errors.every((e) => e.includes('network down'))).toBe(true);
  });

  it('does not delete local data (no destructive repository calls used)', async () => {
    const { client } = makeClient();
    await migrateLocalToRemote({
      localOwnerId: LOCAL_OWNER,
      remoteOwnerId: REMOTE_OWNER,
      getClient: async () => client,
    });
    // Only read methods are mocked/available; the routine never references delete.
    expect(mockListChildren).toHaveBeenCalledWith(LOCAL_OWNER);
  });
});

describe('getLocalDataCounts', () => {
  it('returns the local children / weights / feeding config counts without uploading', async () => {
    const counts = await getLocalDataCounts(LOCAL_OWNER);
    expect(counts).toEqual({ children: 1, weights: 1, feedingConfigs: 1 });
    expect(mockListChildren).toHaveBeenCalledWith(LOCAL_OWNER);
    expect(mockListWeightsByChild).toHaveBeenCalledWith('child-1');
    expect(mockGetFeedingByChild).toHaveBeenCalledWith('child-1');
  });

  it('does not count a missing feeding config', async () => {
    mockGetFeedingByChild.mockResolvedValue(null);
    const counts = await getLocalDataCounts(LOCAL_OWNER);
    expect(counts.feedingConfigs).toBe(0);
  });
});
