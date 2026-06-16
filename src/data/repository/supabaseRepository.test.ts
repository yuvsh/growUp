import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseRepository } from './supabaseRepository.js';
import { RepositoryWriteError } from './types.js';

// ---------------------------------------------------------------------------
// Builder-chain mock
//
// The supabase query builder is chainable (`.from().select().eq()...`) and the
// terminal of the chain resolves to `{ data, error }`. We model that with a
// single object whose chain methods all return the object itself, while it is
// ALSO thenable (so `await builder` and `.single()`/`.maybeSingle()` resolve).
// Each test declares the `{ data, error }` the chain should resolve to.
// ---------------------------------------------------------------------------

interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

function createBuilder<T>(result: SupabaseResult<T>): {
  builder: Record<string, ReturnType<typeof vi.fn>>;
  from: ReturnType<typeof vi.fn>;
  client: SupabaseClient;
} {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
  ];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  // Terminal resolvers.
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Make the builder itself awaitable (for list queries that `await` the chain).
  (builder as unknown as { then: PromiseLike<SupabaseResult<T>>['then'] }).then = (
    onFulfilled,
  ) => Promise.resolve(result).then(onFulfilled);

  const from = vi.fn(() => builder);
  const client = { from } as unknown as SupabaseClient;
  return { builder, from, client };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHILD_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  owner_id: 'owner-1',
  name: 'Maya',
  sex: 'female',
  date_of_birth: '2024-01-15',
  created_at: '2024-01-16T00:00:00.000Z',
  updated_at: '2024-01-16T00:00:00.000Z',
};

const WEIGHT_ROW = {
  id: '22222222-2222-4222-8222-222222222222',
  owner_id: 'owner-1',
  child_id: 'child-1',
  date_measured: '2024-02-01',
  weight_grams: 3500,
  created_at: '2024-02-01T00:00:00.000Z',
  updated_at: '2024-02-01T00:00:00.000Z',
};

const FEEDING_ROW = {
  id: '33333333-3333-4333-8333-333333333333',
  owner_id: 'owner-1',
  child_id: 'child-1',
  feeds_per_day: 8,
  use_high_calorie: false,
  kcal_per_ml: 0.67,
  ml_per_kg_min: 120,
  ml_per_kg_max: 200,
  avg_intake_ml_per_day: null,
  created_at: '2024-02-01T00:00:00.000Z',
  updated_at: '2024-02-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSupabaseRepository', () => {
  describe('children.create', () => {
    it('maps camelCase input -> snake_case row and returns the camelCase entity', async () => {
      const { builder, from, client } = createBuilder({
        data: CHILD_ROW,
        error: null,
      });
      const repo = createSupabaseRepository(() => client);

      const result = await repo.children.create({
        ownerId: 'owner-1',
        name: 'Maya',
        sex: 'female',
        dateOfBirth: '2024-01-15',
      });

      expect(from).toHaveBeenCalledWith('children');
      // Inserted row is snake_case with a generated id and owner_id.
      const insertedRow = builder.insert.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(insertedRow.owner_id).toBe('owner-1');
      expect(insertedRow.name).toBe('Maya');
      expect(insertedRow.sex).toBe('female');
      expect(insertedRow.date_of_birth).toBe('2024-01-15');
      expect(typeof insertedRow.id).toBe('string');

      // Returned entity is camelCase.
      expect(result).toEqual({
        id: CHILD_ROW.id,
        ownerId: 'owner-1',
        name: 'Maya',
        sex: 'female',
        dateOfBirth: '2024-01-15',
        createdAt: CHILD_ROW.created_at,
        updatedAt: CHILD_ROW.updated_at,
      });
    });

    it('throws RepositoryWriteError when supabase returns an error', async () => {
      const { client } = createBuilder({
        data: null,
        error: { message: 'permission denied' },
      });
      const repo = createSupabaseRepository(() => client);

      await expect(
        repo.children.create({
          ownerId: 'owner-1',
          name: 'Maya',
          sex: 'female',
          dateOfBirth: '2024-01-15',
        }),
      ).rejects.toBeInstanceOf(RepositoryWriteError);
    });
  });

  describe('children.list', () => {
    it('maps snake_case rows -> camelCase entities', async () => {
      const { from, builder, client } = createBuilder({
        data: [CHILD_ROW],
        error: null,
      });
      const repo = createSupabaseRepository(() => client);

      const result = await repo.children.list('owner-1');

      expect(from).toHaveBeenCalledWith('children');
      expect(builder.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
      expect(result).toEqual([
        {
          id: CHILD_ROW.id,
          ownerId: 'owner-1',
          name: 'Maya',
          sex: 'female',
          dateOfBirth: '2024-01-15',
          createdAt: CHILD_ROW.created_at,
          updatedAt: CHILD_ROW.updated_at,
        },
      ]);
    });

    it('throws RepositoryWriteError when supabase returns an error', async () => {
      const { client } = createBuilder({
        data: null,
        error: { message: 'network error' },
      });
      const repo = createSupabaseRepository(() => client);

      await expect(repo.children.list('owner-1')).rejects.toBeInstanceOf(
        RepositoryWriteError,
      );
    });
  });

  describe('weights', () => {
    it('create maps camel -> snake and back', async () => {
      const { builder, client } = createBuilder({
        data: WEIGHT_ROW,
        error: null,
      });
      const repo = createSupabaseRepository(() => client);

      const result = await repo.weights.create({
        ownerId: 'owner-1',
        childId: 'child-1',
        dateMeasured: '2024-02-01',
        weightGrams: 3500,
      });

      const insertedRow = builder.insert.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(insertedRow.child_id).toBe('child-1');
      expect(insertedRow.weight_grams).toBe(3500);
      expect(result.childId).toBe('child-1');
      expect(result.weightGrams).toBe(3500);
    });

    it('listByChild maps snake -> camel', async () => {
      const { builder, client } = createBuilder({
        data: [WEIGHT_ROW],
        error: null,
      });
      const repo = createSupabaseRepository(() => client);

      const result = await repo.weights.listByChild('child-1');

      expect(builder.eq).toHaveBeenCalledWith('child_id', 'child-1');
      expect(result[0]?.weightGrams).toBe(3500);
      expect(result[0]?.dateMeasured).toBe('2024-02-01');
    });
  });

  describe('feedingConfig', () => {
    it('upsert uses onConflict child_id and maps null avg intake to undefined', async () => {
      const { builder, client } = createBuilder({
        data: FEEDING_ROW,
        error: null,
      });
      const repo = createSupabaseRepository(() => client);

      const result = await repo.feedingConfig.upsert({
        ownerId: 'owner-1',
        childId: 'child-1',
        feedsPerDay: 8,
        useHighCalorie: false,
        kcalPerMl: 0.67,
        mlPerKgMin: 120,
        mlPerKgMax: 200,
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ child_id: 'child-1' }),
        { onConflict: 'child_id' },
      );
      expect(result.avgIntakeMlPerDay).toBeUndefined();
      expect(result.feedsPerDay).toBe(8);
    });

    it('getByChild returns null when no row exists', async () => {
      const { client } = createBuilder({ data: null, error: null });
      const repo = createSupabaseRepository(() => client);

      const result = await repo.feedingConfig.getByChild('child-1');
      expect(result).toBeNull();
    });

    it('throws RepositoryWriteError on upsert error', async () => {
      const { client } = createBuilder({
        data: null,
        error: { message: 'conflict' },
      });
      const repo = createSupabaseRepository(() => client);

      await expect(
        repo.feedingConfig.upsert({
          ownerId: 'owner-1',
          childId: 'child-1',
          feedsPerDay: 8,
          useHighCalorie: false,
          kcalPerMl: 0.67,
          mlPerKgMin: 120,
          mlPerKgMax: 200,
        }),
      ).rejects.toBeInstanceOf(RepositoryWriteError);
    });
  });
});
