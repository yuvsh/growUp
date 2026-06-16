import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gatherExportData } from './exportData';
import type { Repository } from '../../data/repository/types';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index';

const OWNER = 'owner-1';

const CHILD: Child = {
  id: 'child-1',
  ownerId: OWNER,
  name: 'Mia',
  sex: 'female',
  dateOfBirth: '2025-01-15',
  createdAt: '2025-01-16T00:00:00.000Z',
  updatedAt: '2025-01-16T00:00:00.000Z',
};

const WEIGHT: WeightEntry = {
  id: 'weight-1',
  childId: 'child-1',
  ownerId: OWNER,
  dateMeasured: '2025-02-01',
  weightGrams: 4200,
  createdAt: '2025-02-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
};

const FEEDING: FeedingConfig = {
  id: 'feeding-1',
  childId: 'child-1',
  ownerId: OWNER,
  feedsPerDay: 8,
  useHighCalorie: false,
  kcalPerMl: 0.67,
  mlPerKgMin: 120,
  mlPerKgMax: 200,
  createdAt: '2025-02-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
};

const mockListChildren = vi.fn();
const mockListWeightsByChild = vi.fn();
const mockGetFeedingByChild = vi.fn();

function makeRepo(): Repository {
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

beforeEach(() => {
  vi.clearAllMocks();
  mockListChildren.mockResolvedValue([CHILD]);
  mockListWeightsByChild.mockResolvedValue([WEIGHT]);
  mockGetFeedingByChild.mockResolvedValue(FEEDING);
});

describe('gatherExportData', () => {
  it('returns a bundle with all children, weights and feeding configs', async () => {
    const bundle = await gatherExportData(makeRepo(), OWNER);

    expect(bundle.children).toEqual([CHILD]);
    expect(bundle.weights).toEqual([WEIGHT]);
    expect(bundle.feedingConfigs).toEqual([FEEDING]);
    expect(typeof bundle.exportedAt).toBe('string');
    expect(Number.isNaN(Date.parse(bundle.exportedAt))).toBe(false);

    expect(mockListChildren).toHaveBeenCalledWith(OWNER);
    expect(mockListWeightsByChild).toHaveBeenCalledWith('child-1');
    expect(mockGetFeedingByChild).toHaveBeenCalledWith('child-1');
  });

  it('omits a missing feeding config from the bundle', async () => {
    mockGetFeedingByChild.mockResolvedValue(null);
    const bundle = await gatherExportData(makeRepo(), OWNER);
    expect(bundle.feedingConfigs).toEqual([]);
  });

  it('returns empty arrays when there is no data', async () => {
    mockListChildren.mockResolvedValue([]);
    const bundle = await gatherExportData(makeRepo(), OWNER);
    expect(bundle.children).toEqual([]);
    expect(bundle.weights).toEqual([]);
    expect(bundle.feedingConfigs).toEqual([]);
  });
});
