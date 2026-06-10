// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { WeightEntry } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Mock the repository module.
// vi.mock is hoisted; factory must not reference outer variables.
// ---------------------------------------------------------------------------

vi.mock('../../data/repository/index.js', () => ({
  repository: {
    children: {},
    weights: {
      listByChild: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    feedingConfig: {},
  },
}));

// ---------------------------------------------------------------------------
// Mock useAuth so tests don't need a real AuthProvider or localStorage
// ---------------------------------------------------------------------------

const OWNER_ID = 'owner-test-123';
const CHILD_ID = 'child-test-abc';

vi.mock('../../auth/AuthContext.js', () => ({
  useAuth: () => ({ user: { id: OWNER_ID, isAnonymous: true } }),
}));

// ---------------------------------------------------------------------------
// Import mocked module + hook AFTER vi.mock calls
// ---------------------------------------------------------------------------

import { repository } from '../../data/repository/index.js';
import { useWeights, isWeightDateValid } from './useWeights.js';

const mockListByChild = vi.mocked(repository.weights.listByChild);
const mockCreate = vi.mocked(repository.weights.create);
const mockUpdate = vi.mocked(repository.weights.update);
const mockDelete = vi.mocked(repository.weights.delete);

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<WeightEntry> = {}): WeightEntry {
  return {
    id: 'entry-1',
    childId: CHILD_ID,
    ownerId: OWNER_ID,
    dateMeasured: '2024-03-15',
    weightGrams: 5000,
    createdAt: '2024-03-15T10:00:00.000Z',
    updatedAt: '2024-03-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: useWeights hook
// ---------------------------------------------------------------------------

describe('useWeights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Null childId ---------------------------------------------------------

  it('returns empty weights and no loading when childId is null', () => {
    const { result } = renderHook(() => useWeights(null));

    expect(result.current.weights).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockListByChild).not.toHaveBeenCalled();
  });

  // ---- Load: sorts ascending by dateMeasured --------------------------------

  it('loads weights on mount and sorts them ascending by dateMeasured', async () => {
    const entryC = makeEntry({ id: 'e3', dateMeasured: '2024-05-01', weightGrams: 7000 });
    const entryA = makeEntry({ id: 'e1', dateMeasured: '2024-01-10', weightGrams: 4000 });
    const entryB = makeEntry({ id: 'e2', dateMeasured: '2024-03-15', weightGrams: 5500 });

    mockListByChild.mockResolvedValueOnce([entryC, entryA, entryB]);

    const { result } = renderHook(() => useWeights(CHILD_ID));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.weights).toEqual([entryA, entryB, entryC]);
    expect(result.current.error).toBeNull();
    expect(mockListByChild).toHaveBeenCalledWith(CHILD_ID);
  });

  // ---- Load failure: error state set, no throw to render -------------------

  it('sets error state when repository.listByChild fails, no throw to render', async () => {
    const loadError = new Error('Storage read failed');
    mockListByChild.mockRejectedValueOnce(loadError);

    const { result } = renderHook(() => useWeights(CHILD_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toEqual(loadError);
    expect(result.current.weights).toEqual([]);
  });

  // ---- addWeight: stamps childId + ownerId, persists, sorted order ----------

  it('addWeight stamps childId and ownerId, persists, returns entry in sorted order', async () => {
    const existing = makeEntry({ id: 'e1', dateMeasured: '2024-01-10', weightGrams: 4000 });
    mockListByChild.mockResolvedValueOnce([existing]);

    const created = makeEntry({ id: 'e2', dateMeasured: '2024-02-20', weightGrams: 4800 });
    mockCreate.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: WeightEntry | undefined;
    await act(async () => {
      returned = await result.current.addWeight({
        dateMeasured: '2024-02-20',
        weightGrams: 4800,
      });
    });

    expect(returned).toEqual(created);
    expect(result.current.weights).toEqual([existing, created]);
    expect(result.current.error).toBeNull();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: CHILD_ID,
        ownerId: OWNER_ID,
        dateMeasured: '2024-02-20',
        weightGrams: 4800,
      }),
    );
  });

  it('addWeight with a later date inserts at the correct sorted position', async () => {
    const early = makeEntry({ id: 'e1', dateMeasured: '2024-01-10', weightGrams: 4000 });
    const late = makeEntry({ id: 'e3', dateMeasured: '2024-05-01', weightGrams: 7000 });
    mockListByChild.mockResolvedValueOnce([early, late]);

    const mid = makeEntry({ id: 'e2', dateMeasured: '2024-03-15', weightGrams: 5500 });
    mockCreate.mockResolvedValueOnce(mid);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addWeight({ dateMeasured: '2024-03-15', weightGrams: 5500 });
    });

    expect(result.current.weights.map((w) => w.id)).toEqual(['e1', 'e2', 'e3']);
  });

  // ---- addWeight: schema validation rejects invalid input ------------------

  it('addWeight throws a validation error and sets error state for non-positive weight', async () => {
    mockListByChild.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.addWeight({ dateMeasured: '2024-02-20', weightGrams: 0 });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError).toBeDefined();
    expect(thrownError?.message).toMatch(/validation failed/i);
    expect(result.current.error).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('addWeight throws a validation error for invalid date format', async () => {
    mockListByChild.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.addWeight({ dateMeasured: 'not-a-date', weightGrams: 5000 });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ---- addWeight: repository failure surfaces and re-throws ----------------

  it('addWeight sets error state and re-throws when repository.create fails', async () => {
    mockListByChild.mockResolvedValueOnce([]);
    const createError = new Error('Write quota exceeded');
    mockCreate.mockRejectedValueOnce(createError);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.addWeight({ dateMeasured: '2024-02-20', weightGrams: 5000 });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Write quota exceeded');
    expect(result.current.error).toEqual(createError);
  });

  // ---- editWeight ----------------------------------------------------------

  it('editWeight reflects the patch in the weights list', async () => {
    const original = makeEntry({ id: 'e1', weightGrams: 5000 });
    mockListByChild.mockResolvedValueOnce([original]);

    const updated = makeEntry({ id: 'e1', weightGrams: 5200 });
    mockUpdate.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.editWeight('e1', { weightGrams: 5200 });
    });

    expect(result.current.weights).toContainEqual(updated);
    expect(result.current.weights.find((w) => w.id === 'e1')?.weightGrams).toBe(5200);
    expect(result.current.error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith('e1', { weightGrams: 5200 });
  });

  it('editWeight sets error state and re-throws when repository.update fails', async () => {
    const original = makeEntry({ id: 'e1', weightGrams: 5000 });
    mockListByChild.mockResolvedValueOnce([original]);
    const updateError = new Error('Update conflict');
    mockUpdate.mockRejectedValueOnce(updateError);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.editWeight('e1', { weightGrams: 5200 });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Update conflict');
    expect(result.current.error).toEqual(updateError);
  });

  // ---- deleteWeight --------------------------------------------------------

  it('deleteWeight removes the entry from the weights list', async () => {
    const e1 = makeEntry({ id: 'e1', dateMeasured: '2024-01-10' });
    const e2 = makeEntry({ id: 'e2', dateMeasured: '2024-03-15' });
    mockListByChild.mockResolvedValueOnce([e1, e2]);
    mockDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.weights).toHaveLength(2);

    await act(async () => {
      await result.current.deleteWeight('e1');
    });

    expect(result.current.weights).toHaveLength(1);
    expect(result.current.weights[0].id).toBe('e2');
    expect(result.current.error).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith('e1');
  });

  it('deleteWeight sets error state and re-throws when repository.delete fails', async () => {
    const entry = makeEntry({ id: 'e1' });
    mockListByChild.mockResolvedValueOnce([entry]);
    const deleteError = new Error('Delete forbidden');
    mockDelete.mockRejectedValueOnce(deleteError);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.deleteWeight('e1');
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Delete forbidden');
    expect(result.current.error).toEqual(deleteError);
  });

  // ---- reload --------------------------------------------------------------

  it('reload re-fetches weights from the repository', async () => {
    const initial = [makeEntry({ id: 'e1', dateMeasured: '2024-01-10', weightGrams: 4000 })];
    const reloaded = [
      makeEntry({ id: 'e1', dateMeasured: '2024-01-10', weightGrams: 4000 }),
      makeEntry({ id: 'e2', dateMeasured: '2024-03-15', weightGrams: 5500 }),
    ];

    mockListByChild
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(reloaded);

    const { result } = renderHook(() => useWeights(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weights).toHaveLength(1);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.weights).toHaveLength(2));
    expect(mockListByChild).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: isWeightDateValid (pure helper)
// ---------------------------------------------------------------------------

describe('isWeightDateValid', () => {
  const DOB = '2024-01-15';

  it('returns ok: true when dateMeasured equals dateOfBirth', () => {
    expect(isWeightDateValid('2024-01-15', DOB)).toEqual({ ok: true });
  });

  it('returns ok: true for a date well within the 0–24 month window', () => {
    // 180 days after DOB
    expect(isWeightDateValid('2024-07-13', DOB)).toEqual({ ok: true });
  });

  it('returns ok: true at exactly 730 days after DOB', () => {
    // 2024 is a leap year: Jan 15 + 730 days = Jan 14, 2026
    const exactly730 = new Date(Date.parse(DOB) + 730 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isWeightDateValid(exactly730, DOB)).toEqual({ ok: true });
  });

  it('returns { ok: false, reason: "before-birth" } when dateMeasured is before DOB', () => {
    expect(isWeightDateValid('2024-01-14', DOB)).toEqual({
      ok: false,
      reason: 'before-birth',
    });
  });

  it('returns { ok: false, reason: "before-birth" } far before DOB', () => {
    expect(isWeightDateValid('2020-06-01', DOB)).toEqual({
      ok: false,
      reason: 'before-birth',
    });
  });

  it('returns { ok: false, reason: "beyond-range" } when dateMeasured is 731 days after DOB', () => {
    const beyond = new Date(Date.parse(DOB) + 731 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isWeightDateValid(beyond, DOB)).toEqual({
      ok: false,
      reason: 'beyond-range',
    });
  });

  it('returns { ok: false, reason: "beyond-range" } far beyond the window', () => {
    expect(isWeightDateValid('2028-01-15', DOB)).toEqual({
      ok: false,
      reason: 'beyond-range',
    });
  });
});
