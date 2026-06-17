// @vitest-environment jsdom
//
// Tests for WeightsProvider + useWeights() consumer hook.
// All stateful behavioral tests that previously lived in useWeights.test.ts
// now live here because the fetch/mutation logic moved into the provider.
//
// Strategy: render WeightsProvider with mocked repository + child, and probe
// its value through a lightweight consumer component via renderHook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { WeightEntry } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Mock the repository-routing hook.
// vi.mock is hoisted; factory must not reference outer variables.
// ---------------------------------------------------------------------------

const mockRepository = vi.hoisted(() => ({
  children: {},
  weights: {
    listByChild: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  feedingConfig: {},
}));

vi.mock('../../data/repository/useRepository.js', () => ({
  useRepository: () => mockRepository,
}));

// ---------------------------------------------------------------------------
// Mock useAuth so tests don't need a real AuthProvider or localStorage
// ---------------------------------------------------------------------------

const OWNER_ID = 'owner-test-123';
const CHILD_ID = 'child-test-abc';

vi.mock('../../auth/AuthContext.js', () => ({
  useAuth: () => ({ user: { id: OWNER_ID, isAnonymous: true }, mode: 'local' }),
}));

// ---------------------------------------------------------------------------
// Mock useChild — tests can swap the returned child per-test
// ---------------------------------------------------------------------------

const mockChildState = vi.hoisted(() => ({
  child: null as { id: string } | null,
}));

vi.mock('./useChild.js', () => ({
  useChild: () => ({ child: mockChildState.child }),
}));

// ---------------------------------------------------------------------------
// Import subject AFTER vi.mock calls
// ---------------------------------------------------------------------------

import { WeightsProvider, useWeights } from './WeightsProvider.js';

const repository = mockRepository;

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

// Wrapper that mounts WeightsProvider around the probe hook.
function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <WeightsProvider>{children}</WeightsProvider>;
}

// ---------------------------------------------------------------------------
// Tests: WeightsProvider / useWeights (stateful behavior)
// ---------------------------------------------------------------------------

describe('WeightsProvider / useWeights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no active child
    mockChildState.child = null;
  });

  // ---- Null childId ---------------------------------------------------------

  it('returns empty weights and no loading when childId is null', () => {
    mockChildState.child = null;
    const { result } = renderHook(() => useWeights(), { wrapper });

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
    mockChildState.child = { id: CHILD_ID };

    const { result } = renderHook(() => useWeights(), { wrapper });

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
    mockChildState.child = { id: CHILD_ID };

    const { result } = renderHook(() => useWeights(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toEqual(loadError);
    expect(result.current.weights).toEqual([]);
  });

  // ---- addWeight: stamps childId + ownerId, persists, sorted order ----------

  it('addWeight stamps childId and ownerId, persists, returns entry in sorted order', async () => {
    const existing = makeEntry({ id: 'e1', dateMeasured: '2024-01-10', weightGrams: 4000 });
    mockListByChild.mockResolvedValueOnce([existing]);
    mockChildState.child = { id: CHILD_ID };

    const created = makeEntry({ id: 'e2', dateMeasured: '2024-02-20', weightGrams: 4800 });
    mockCreate.mockResolvedValueOnce(created);

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };

    const mid = makeEntry({ id: 'e2', dateMeasured: '2024-03-15', weightGrams: 5500 });
    mockCreate.mockResolvedValueOnce(mid);

    const { result } = renderHook(() => useWeights(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addWeight({ dateMeasured: '2024-03-15', weightGrams: 5500 });
    });

    expect(result.current.weights.map((w) => w.id)).toEqual(['e1', 'e2', 'e3']);
  });

  // ---- addWeight: schema validation rejects invalid input ------------------

  it('addWeight throws a validation error and sets error state for non-positive weight', async () => {
    mockListByChild.mockResolvedValueOnce([]);
    mockChildState.child = { id: CHILD_ID };

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };
    const createError = new Error('Write quota exceeded');
    mockCreate.mockRejectedValueOnce(createError);

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };

    const updated = makeEntry({ id: 'e1', weightGrams: 5200 });
    mockUpdate.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };
    const updateError = new Error('Update conflict');
    mockUpdate.mockRejectedValueOnce(updateError);

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };
    mockDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };
    const deleteError = new Error('Delete forbidden');
    mockDelete.mockRejectedValueOnce(deleteError);

    const { result } = renderHook(() => useWeights(), { wrapper });
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
    mockChildState.child = { id: CHILD_ID };

    const { result } = renderHook(() => useWeights(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weights).toHaveLength(1);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.weights).toHaveLength(2));
    expect(mockListByChild).toHaveBeenCalledTimes(2);
  });

  // ---- null-guard on consumer hook ----------------------------------------

  it('useWeights() throws when called outside WeightsProvider', () => {
    expect(() => renderHook(() => useWeights())).toThrow(
      'useWeights must be used within a WeightsProvider',
    );
  });
});
