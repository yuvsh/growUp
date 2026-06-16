import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateRemoteToLocal, type LocalWriteStore } from './migrateRemoteToLocal';
import type { Repository } from '../../data/repository/types';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const REMOTE_OWNER = 'supabase-auth-uid';
const LOCAL_OWNER = 'local-anon-id';

const CHILD: Child = {
  id: 'child-1',
  ownerId: REMOTE_OWNER,
  name: 'Mia',
  sex: 'female',
  dateOfBirth: '2025-01-15',
  createdAt: '2025-01-16T00:00:00.000Z',
  updatedAt: '2025-01-16T00:00:00.000Z',
};

const WEIGHT: WeightEntry = {
  id: 'weight-1',
  childId: 'child-1',
  ownerId: REMOTE_OWNER,
  dateMeasured: '2025-02-01',
  weightGrams: 4200,
  createdAt: '2025-02-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
};

const FEEDING: FeedingConfig = {
  id: 'feeding-1',
  childId: 'child-1',
  ownerId: REMOTE_OWNER,
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
// Mocks
// ---------------------------------------------------------------------------

const mockListChildren = vi.fn();
const mockListWeightsByChild = vi.fn();
const mockGetFeedingByChild = vi.fn();

function makeReadRepo(): Repository {
  return {
    children: {
      list: (ownerId: string): Promise<Child[]> => mockListChildren(ownerId),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    weights: {
      listByChild: (childId: string): Promise<WeightEntry[]> =>
        mockListWeightsByChild(childId),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    feedingConfig: {
      getByChild: (childId: string): Promise<FeedingConfig | null> =>
        mockGetFeedingByChild(childId),
      upsert: vi.fn(),
    },
  };
}

/** In-memory store that records reads/writes; can be made to throw on write. */
function makeStore(failOnKey?: string): {
  store: LocalWriteStore;
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  const store: LocalWriteStore = {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      if (key === failOnKey) {
        throw new Error('quota exceeded');
      }
      data.set(key, value);
    },
  };
  return { store, data };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListChildren.mockResolvedValue([CHILD]);
  mockListWeightsByChild.mockResolvedValue([WEIGHT]);
  mockGetFeedingByChild.mockResolvedValue(FEEDING);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('migrateRemoteToLocal', () => {
  it('copies every entity preserving ids and re-stamping the local owner', async () => {
    const { store, data } = makeStore();

    const result = await migrateRemoteToLocal({
      remoteOwnerId: REMOTE_OWNER,
      localOwnerId: LOCAL_OWNER,
      readRepo: makeReadRepo(),
      store,
    });

    expect(result.uploaded).toEqual({ children: 1, weights: 1, feedingConfigs: 1 });
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);

    const storedChildren = JSON.parse(data.get('growup:children') ?? '[]') as Child[];
    expect(storedChildren).toHaveLength(1);
    expect(storedChildren[0]?.id).toBe('child-1');
    expect(storedChildren[0]?.ownerId).toBe(LOCAL_OWNER);

    const storedWeights = JSON.parse(
      data.get('growup:weights') ?? '[]',
    ) as WeightEntry[];
    expect(storedWeights[0]?.id).toBe('weight-1');
    expect(storedWeights[0]?.childId).toBe('child-1');
    expect(storedWeights[0]?.ownerId).toBe(LOCAL_OWNER);

    const storedConfigs = JSON.parse(
      data.get('growup:feedingConfig') ?? '[]',
    ) as FeedingConfig[];
    expect(storedConfigs[0]?.id).toBe('feeding-1');
    expect(storedConfigs[0]?.ownerId).toBe(LOCAL_OWNER);

    expect(mockListChildren).toHaveBeenCalledWith(REMOTE_OWNER);
    expect(mockListWeightsByChild).toHaveBeenCalledWith('child-1');
    expect(mockGetFeedingByChild).toHaveBeenCalledWith('child-1');
  });

  it('replaces an existing local row with the same id (no duplicates)', async () => {
    const { store, data } = makeStore();
    const args = {
      remoteOwnerId: REMOTE_OWNER,
      localOwnerId: LOCAL_OWNER,
      readRepo: makeReadRepo(),
      store,
    };

    await migrateRemoteToLocal(args);
    await migrateRemoteToLocal(args);

    const storedChildren = JSON.parse(data.get('growup:children') ?? '[]') as Child[];
    expect(storedChildren).toHaveLength(1);
  });

  it('skips a missing feeding config', async () => {
    mockGetFeedingByChild.mockResolvedValue(null);
    const { store, data } = makeStore();

    const result = await migrateRemoteToLocal({
      remoteOwnerId: REMOTE_OWNER,
      localOwnerId: LOCAL_OWNER,
      readRepo: makeReadRepo(),
      store,
    });

    expect(result.uploaded.feedingConfigs).toBe(0);
    expect(data.get('growup:feedingConfig')).toBeUndefined();
  });

  it('counts a write error as failed but keeps copying other entities', async () => {
    const { store } = makeStore('growup:weights');

    const result = await migrateRemoteToLocal({
      remoteOwnerId: REMOTE_OWNER,
      localOwnerId: LOCAL_OWNER,
      readRepo: makeReadRepo(),
      store,
    });

    expect(result.uploaded.children).toBe(1);
    expect(result.uploaded.feedingConfigs).toBe(1);
    expect(result.uploaded.weights).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('weight weight-1');
  });
});
