// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Child } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Mock the repository module.
// vi.mock is hoisted, so the factory must not reference outer variables.
// We use vi.fn() inside the factory; then import the module to grab the fns.
// ---------------------------------------------------------------------------

vi.mock('../../data/repository/index.js', () => ({
  repository: {
    children: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    weights: {},
    feedingConfig: {},
  },
}));

// ---------------------------------------------------------------------------
// Mock useAuth so tests don't need a real AuthProvider or localStorage
// ---------------------------------------------------------------------------

const OWNER_ID = 'owner-123';

vi.mock('../../auth/AuthContext.js', () => ({
  useAuth: () => ({ user: { id: OWNER_ID, isAnonymous: true } }),
}));

// ---------------------------------------------------------------------------
// Import the mocked module AFTER vi.mock calls so we get the mock instance.
// We import the hook after mocks so it picks up mocked deps at module init.
// ---------------------------------------------------------------------------

import { repository } from '../../data/repository/index.js';
import { useChild } from './useChild.js';

// Typed references to the mock functions for convenience in tests.
const mockList = vi.mocked(repository.children.list);
const mockCreate = vi.mocked(repository.children.create);
const mockUpdate = vi.mocked(repository.children.update);
const mockDelete = vi.mocked(repository.children.delete);

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChild(overrides: Partial<Child> = {}): Child {
  return {
    id: 'child-abc',
    ownerId: OWNER_ID,
    name: 'Test Baby',
    sex: 'female',
    dateOfBirth: '2024-01-15',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Mount: loads existing child ----------------------------------------

  it('loads the existing child on mount (loading → child populated)', async () => {
    const existingChild = makeChild();
    mockList.mockResolvedValueOnce([existingChild]);

    const { result } = renderHook(() => useChild());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.child).toBeNull();

    // After the async fetch resolves
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.child).toEqual(existingChild);
    expect(result.current.error).toBeNull();
    expect(mockList).toHaveBeenCalledWith(OWNER_ID);
  });

  it('sets child to null when no children exist on mount', async () => {
    mockList.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useChild());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.child).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // ---- Mount: repository failure ------------------------------------------

  it('sets error state when repository.list fails on load, no throw to render', async () => {
    const loadError = new Error('Storage unavailable');
    mockList.mockRejectedValueOnce(loadError);

    const { result } = renderHook(() => useChild());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toEqual(loadError);
    expect(result.current.child).toBeNull();
    // The hook itself must not throw — the render cycle continues normally.
  });

  // ---- createChild --------------------------------------------------------

  it('createChild stamps ownerId from auth and populates child state', async () => {
    mockList.mockResolvedValueOnce([]); // mount: no child yet
    const createdChild = makeChild({ id: 'child-new', name: 'New Baby' });
    mockCreate.mockResolvedValueOnce(createdChild);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: Child | undefined;
    await act(async () => {
      returned = await result.current.createChild({
        name: 'New Baby',
        sex: 'female',
        dateOfBirth: '2024-06-01',
      });
    });

    expect(returned).toEqual(createdChild);
    expect(result.current.child).toEqual(createdChild);
    expect(result.current.error).toBeNull();

    // Verify ownerId was stamped from auth
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER_ID }),
    );
  });

  it('createChild surfaces error via state and re-throws', async () => {
    mockList.mockResolvedValueOnce([]);
    const createError = new Error('Write failed');
    mockCreate.mockRejectedValueOnce(createError);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.createChild({
          name: 'Fail Baby',
          sex: 'male',
          dateOfBirth: '2024-01-01',
        });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Write failed');
    expect(result.current.error).toEqual(createError);
    expect(result.current.child).toBeNull();
  });

  // ---- updateChild --------------------------------------------------------

  it('updateChild reflects the patch in child state', async () => {
    const existing = makeChild({ name: 'Old Name' });
    mockList.mockResolvedValueOnce([existing]);
    const updated = makeChild({ name: 'New Name' });
    mockUpdate.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateChild('child-abc', { name: 'New Name' });
    });

    expect(result.current.child).toEqual(updated);
    expect(result.current.error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith('child-abc', { name: 'New Name' });
  });

  it('updateChild surfaces error via state and re-throws', async () => {
    const existing = makeChild();
    mockList.mockResolvedValueOnce([existing]);
    const updateError = new Error('Update failed');
    mockUpdate.mockRejectedValueOnce(updateError);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.updateChild('child-abc', { name: 'X' });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Update failed');
    expect(result.current.error).toEqual(updateError);
  });

  // ---- deleteChild --------------------------------------------------------

  it('deleteChild sets child to null', async () => {
    const existing = makeChild();
    mockList.mockResolvedValueOnce([existing]);
    mockDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.child).toEqual(existing);

    await act(async () => {
      await result.current.deleteChild('child-abc');
    });

    expect(result.current.child).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith('child-abc');
  });

  it('deleteChild surfaces error via state and re-throws', async () => {
    const existing = makeChild();
    mockList.mockResolvedValueOnce([existing]);
    const deleteError = new Error('Delete failed');
    mockDelete.mockRejectedValueOnce(deleteError);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.deleteChild('child-abc');
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Delete failed');
    expect(result.current.error).toEqual(deleteError);
  });

  // ---- reload -------------------------------------------------------------

  it('reload re-fetches the child from the repository', async () => {
    const initial = makeChild({ name: 'Before Reload' });
    const afterReload = makeChild({ name: 'After Reload' });

    mockList
      .mockResolvedValueOnce([initial])
      .mockResolvedValueOnce([afterReload]);

    const { result } = renderHook(() => useChild());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.child?.name).toBe('Before Reload');

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.child?.name).toBe('After Reload');
    });

    expect(mockList).toHaveBeenCalledTimes(2);
  });
});
