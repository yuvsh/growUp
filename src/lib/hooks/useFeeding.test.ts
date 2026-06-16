// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { FeedingConfig } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Mock the repository-routing hook.
// vi.mock is hoisted, so the factory must not reference outer variables.
// ---------------------------------------------------------------------------

const mockRepository = vi.hoisted(() => ({
  children: {},
  weights: {},
  feedingConfig: {
    getByChild: vi.fn(),
    upsert: vi.fn(),
  },
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
// Import mocked modules AFTER vi.mock calls
// ---------------------------------------------------------------------------

import { useFeeding } from './useFeeding.js';
import {
  DEFAULT_FEEDS_PER_DAY,
  STANDARD_KCAL_PER_ML,
  ML_PER_KG_MIN,
  ML_PER_KG_MAX,
} from '../constants/feeding.js';

const repository = mockRepository;

// Typed references to mock functions
const mockGetByChild = vi.mocked(repository.feedingConfig.getByChild);
const mockUpsert = vi.mocked(repository.feedingConfig.upsert);

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<FeedingConfig> = {}): FeedingConfig {
  return {
    id: 'config-xyz',
    childId: CHILD_ID,
    ownerId: OWNER_ID,
    feedsPerDay: DEFAULT_FEEDS_PER_DAY,
    useHighCalorie: false,
    kcalPerMl: STANDARD_KCAL_PER_ML,
    mlPerKgMin: ML_PER_KG_MIN,
    mlPerKgMax: ML_PER_KG_MAX,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFeeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- No existing config → defaults ----------------------------------------

  it('exposes in-memory defaults when no config exists in the repository', async () => {
    mockGetByChild.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useFeeding(CHILD_ID));

    // Should start loading
    expect(result.current.loading).toBe(true);
    expect(result.current.config).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(mockGetByChild).toHaveBeenCalledWith(CHILD_ID);

    const cfg = result.current.config;
    expect(cfg).not.toBeNull();
    expect(cfg?.feedsPerDay).toBe(DEFAULT_FEEDS_PER_DAY);
    expect(cfg?.kcalPerMl).toBe(STANDARD_KCAL_PER_ML);
    expect(cfg?.mlPerKgMin).toBe(ML_PER_KG_MIN);
    expect(cfg?.mlPerKgMax).toBe(ML_PER_KG_MAX);
    expect(cfg?.useHighCalorie).toBe(false);

    // The default must NOT have been persisted
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  // ---- Existing config loads from repository --------------------------------

  it('loads an existing config from the repository and exposes it', async () => {
    const existing = makeConfig({ feedsPerDay: 10, useHighCalorie: true });
    mockGetByChild.mockResolvedValueOnce(existing);

    const { result } = renderHook(() => useFeeding(CHILD_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.config).toEqual(existing);
    expect(mockGetByChild).toHaveBeenCalledWith(CHILD_ID);
  });

  // ---- childId null → no load, config null ----------------------------------

  it('returns config null and does not load when childId is null', async () => {
    const { result } = renderHook(() => useFeeding(null));

    // No loading needed
    expect(result.current.loading).toBe(false);
    expect(result.current.config).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetByChild).not.toHaveBeenCalled();
  });

  // ---- saveConfig persists with childId + ownerId stamped -------------------

  it('saveConfig persists with childId and ownerId stamped, and updates state', async () => {
    mockGetByChild.mockResolvedValueOnce(null);

    const savedConfig = makeConfig({ feedsPerDay: 6, useHighCalorie: true });
    mockUpsert.mockResolvedValueOnce(savedConfig);

    const { result } = renderHook(() => useFeeding(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: FeedingConfig | undefined;
    await act(async () => {
      returned = await result.current.saveConfig({ feedsPerDay: 6, useHighCalorie: true });
    });

    expect(returned).toEqual(savedConfig);
    expect(result.current.config).toEqual(savedConfig);
    expect(result.current.error).toBeNull();

    // Verify childId and ownerId were stamped
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: CHILD_ID,
        ownerId: OWNER_ID,
        feedsPerDay: 6,
        useHighCalorie: true,
      }),
    );
  });

  // ---- saveConfig partial patch merges correctly ----------------------------

  it('saveConfig merges partial patch with existing config values', async () => {
    const existing = makeConfig({ feedsPerDay: 10, kcalPerMl: 0.8 });
    mockGetByChild.mockResolvedValueOnce(existing);

    const savedConfig = makeConfig({ feedsPerDay: 10, kcalPerMl: 0.9 });
    mockUpsert.mockResolvedValueOnce(savedConfig);

    const { result } = renderHook(() => useFeeding(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveConfig({ kcalPerMl: 0.9 });
    });

    // feedsPerDay should be preserved from the existing config
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        feedsPerDay: 10,
        kcalPerMl: 0.9,
        childId: CHILD_ID,
        ownerId: OWNER_ID,
      }),
    );
  });

  // ---- Repository load failure → error state, no throw to render -----------

  it('sets error state when repository load fails, does not throw to render', async () => {
    const loadError = new Error('Storage unavailable');
    mockGetByChild.mockRejectedValueOnce(loadError);

    const { result } = renderHook(() => useFeeding(CHILD_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toEqual(loadError);
    expect(result.current.config).toBeNull();
    // The hook must not throw — the render cycle continues normally.
  });

  // ---- saveConfig failure → error state and re-throws ----------------------

  it('saveConfig sets error state and re-throws on repository upsert failure', async () => {
    mockGetByChild.mockResolvedValueOnce(null);
    const saveError = new Error('Write quota exceeded');
    mockUpsert.mockRejectedValueOnce(saveError);

    const { result } = renderHook(() => useFeeding(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.saveConfig({ feedsPerDay: 5 });
      } catch (err) {
        thrownError = err instanceof Error ? err : new Error(String(err));
      }
    });

    expect(thrownError?.message).toBe('Write quota exceeded');
    expect(result.current.error).toEqual(saveError);
  });

  // ---- reload re-fetches ---------------------------------------------------

  it('reload re-fetches the config from the repository', async () => {
    const initial = makeConfig({ feedsPerDay: 8 });
    const afterReload = makeConfig({ feedsPerDay: 12 });

    mockGetByChild
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(afterReload);

    const { result } = renderHook(() => useFeeding(CHILD_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config?.feedsPerDay).toBe(8);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.config?.feedsPerDay).toBe(12);
    });

    expect(mockGetByChild).toHaveBeenCalledTimes(2);
  });
});
