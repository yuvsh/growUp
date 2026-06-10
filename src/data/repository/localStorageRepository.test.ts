import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLocalStorageRepository,
  type StorageAdapter,
} from './localStorageRepository.js';
import { RepositoryWriteError } from './types.js';

// ---------------------------------------------------------------------------
// In-memory storage stub — mirrors window.localStorage behaviour
// ---------------------------------------------------------------------------

function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  };
}

function createThrowingStorage(readStorage: StorageAdapter): StorageAdapter {
  return {
    getItem: (key: string) => readStorage.getItem(key),
    setItem: () => { throw new Error('QuotaExceededError'); },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_ID = 'owner-1';
const CHILD_ID_PLACEHOLDER = 'placeholder-child-id';

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

describe('localStorageRepository › children', () => {
  let repo: ReturnType<typeof createLocalStorageRepository>;
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMemoryStorage();
    repo = createLocalStorageRepository(storage);
  });

  it('list returns empty array when no data exists', async () => {
    const result = await repo.children.list(OWNER_ID);
    expect(result).toEqual([]);
  });

  it('create → list round-trip', async () => {
    const created = await repo.children.create({
      ownerId: OWNER_ID,
      name: 'Noa',
      sex: 'female',
      dateOfBirth: '2024-01-15',
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Noa');
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();

    const listed = await repo.children.list(OWNER_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
  });

  it('get returns the child by id', async () => {
    const created = await repo.children.create({
      ownerId: OWNER_ID,
      name: 'Eitan',
      sex: 'male',
      dateOfBirth: '2023-06-01',
    });

    const found = await repo.children.get(created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe('Eitan');
  });

  it('get returns null for unknown id', async () => {
    const found = await repo.children.get('nonexistent-id');
    expect(found).toBeNull();
  });

  it('list filters by ownerId', async () => {
    await repo.children.create({
      ownerId: OWNER_ID,
      name: 'Mine',
      sex: 'female',
      dateOfBirth: '2024-01-01',
    });
    await repo.children.create({
      ownerId: 'other-owner',
      name: 'NotMine',
      sex: 'male',
      dateOfBirth: '2024-02-01',
    });

    const mine = await repo.children.list(OWNER_ID);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.name).toBe('Mine');
  });

  it('update patches fields and bumps updatedAt', async () => {
    const created = await repo.children.create({
      ownerId: OWNER_ID,
      name: 'OldName',
      sex: 'female',
      dateOfBirth: '2024-03-01',
    });

    const updated = await repo.children.update(created.id, { name: 'NewName' });
    expect(updated.name).toBe('NewName');
    expect(updated.id).toBe(created.id);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);

    const fetched = await repo.children.get(created.id);
    expect(fetched?.name).toBe('NewName');
  });

  it('delete removes the child', async () => {
    const created = await repo.children.create({
      ownerId: OWNER_ID,
      name: 'ToDelete',
      sex: 'male',
      dateOfBirth: '2024-04-01',
    });

    await repo.children.delete(created.id);

    const listed = await repo.children.list(OWNER_ID);
    expect(listed).toHaveLength(0);

    const fetched = await repo.children.get(created.id);
    expect(fetched).toBeNull();
  });

  it('malformed JSON on read yields empty array (no throw)', async () => {
    storage.setItem('growup:children', '{not valid json[');
    const result = await repo.children.list(OWNER_ID);
    expect(result).toEqual([]);
  });

  it('array containing malformed item skips bad items, keeps valid ones', async () => {
    const created = await repo.children.create({
      ownerId: OWNER_ID,
      name: 'Valid',
      sex: 'female',
      dateOfBirth: '2024-05-01',
    });

    // Corrupt the array by injecting an invalid record alongside the valid one
    const raw = storage.getItem('growup:children');
    const parsed = JSON.parse(raw!) as unknown[];
    parsed.push({ id: 'bad', name: 123 }); // schema-invalid
    storage.setItem('growup:children', JSON.stringify(parsed));

    const listed = await repo.children.list(OWNER_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
  });

  it('write failure throws RepositoryWriteError', async () => {
    const throwingRepo = createLocalStorageRepository(
      createThrowingStorage(storage),
    );

    await expect(
      throwingRepo.children.create({
        ownerId: OWNER_ID,
        name: 'Fail',
        sex: 'male',
        dateOfBirth: '2024-06-01',
      }),
    ).rejects.toBeInstanceOf(RepositoryWriteError);
  });
});

// ---------------------------------------------------------------------------
// WeightEntries
// ---------------------------------------------------------------------------

describe('localStorageRepository › weights', () => {
  let repo: ReturnType<typeof createLocalStorageRepository>;
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMemoryStorage();
    repo = createLocalStorageRepository(storage);
  });

  it('listByChild returns empty when no data', async () => {
    const result = await repo.weights.listByChild('child-1');
    expect(result).toEqual([]);
  });

  it('create → listByChild round-trip', async () => {
    const entry = await repo.weights.create({
      childId: 'child-1',
      ownerId: OWNER_ID,
      dateMeasured: '2024-06-01',
      weightGrams: 4000,
    });

    expect(entry.id).toBeTruthy();
    expect(entry.weightGrams).toBe(4000);

    const listed = await repo.weights.listByChild('child-1');
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(entry.id);
  });

  it('listByChild filters by childId', async () => {
    await repo.weights.create({
      childId: 'child-1',
      ownerId: OWNER_ID,
      dateMeasured: '2024-06-01',
      weightGrams: 4000,
    });
    await repo.weights.create({
      childId: 'child-2',
      ownerId: OWNER_ID,
      dateMeasured: '2024-06-02',
      weightGrams: 5000,
    });

    const child1Entries = await repo.weights.listByChild('child-1');
    expect(child1Entries).toHaveLength(1);
    expect(child1Entries[0]?.weightGrams).toBe(4000);
  });

  it('update patches weight and bumps updatedAt', async () => {
    const entry = await repo.weights.create({
      childId: 'child-1',
      ownerId: OWNER_ID,
      dateMeasured: '2024-06-01',
      weightGrams: 3500,
    });

    const updated = await repo.weights.update(entry.id, { weightGrams: 3600 });
    expect(updated.weightGrams).toBe(3600);
    expect(updated.updatedAt >= entry.updatedAt).toBe(true);
  });

  it('delete removes the weight entry', async () => {
    const entry = await repo.weights.create({
      childId: 'child-1',
      ownerId: OWNER_ID,
      dateMeasured: '2024-06-01',
      weightGrams: 4200,
    });

    await repo.weights.delete(entry.id);
    const listed = await repo.weights.listByChild('child-1');
    expect(listed).toHaveLength(0);
  });

  it('malformed JSON on read yields empty (no throw)', async () => {
    storage.setItem('growup:weights', 'not-json');
    const result = await repo.weights.listByChild('child-1');
    expect(result).toEqual([]);
  });

  it('write failure throws RepositoryWriteError', async () => {
    const throwingRepo = createLocalStorageRepository(
      createThrowingStorage(storage),
    );

    await expect(
      throwingRepo.weights.create({
        childId: 'child-1',
        ownerId: OWNER_ID,
        dateMeasured: '2024-06-01',
        weightGrams: 4000,
      }),
    ).rejects.toBeInstanceOf(RepositoryWriteError);
  });
});

// ---------------------------------------------------------------------------
// FeedingConfig
// ---------------------------------------------------------------------------

describe('localStorageRepository › feedingConfig', () => {
  let repo: ReturnType<typeof createLocalStorageRepository>;
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMemoryStorage();
    repo = createLocalStorageRepository(storage);
  });

  const baseConfig = {
    childId: CHILD_ID_PLACEHOLDER,
    ownerId: OWNER_ID,
    feedsPerDay: 8,
    useHighCalorie: false,
    kcalPerMl: 0.67,
    mlPerKgMin: 120,
    mlPerKgMax: 200,
  };

  it('getByChild returns null when none exists', async () => {
    const result = await repo.feedingConfig.getByChild('child-1');
    expect(result).toBeNull();
  });

  it('upsert creates a new config', async () => {
    const config = await repo.feedingConfig.upsert(baseConfig);
    expect(config.id).toBeTruthy();
    expect(config.feedsPerDay).toBe(8);
  });

  it('upsert → getByChild round-trip', async () => {
    const created = await repo.feedingConfig.upsert(baseConfig);
    const fetched = await repo.feedingConfig.getByChild(CHILD_ID_PLACEHOLDER);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);
  });

  it('upsert updates existing config and keeps same id', async () => {
    const created = await repo.feedingConfig.upsert(baseConfig);
    const updated = await repo.feedingConfig.upsert({ ...baseConfig, feedsPerDay: 10 });

    expect(updated.id).toBe(created.id);
    expect(updated.feedsPerDay).toBe(10);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it('malformed JSON on read yields null (no throw)', async () => {
    storage.setItem('growup:feedingConfig', '{bad json');
    const result = await repo.feedingConfig.getByChild('child-1');
    expect(result).toBeNull();
  });

  it('write failure throws RepositoryWriteError', async () => {
    const throwingRepo = createLocalStorageRepository(
      createThrowingStorage(storage),
    );

    await expect(
      throwingRepo.feedingConfig.upsert(baseConfig),
    ).rejects.toBeInstanceOf(RepositoryWriteError);
  });
});
