import type { Child, WeightEntry, FeedingConfig } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Input types — omit server-managed fields; the impl generates id + timestamps
// ---------------------------------------------------------------------------

export type CreateChildInput = Omit<Child, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateChildInput = Partial<Omit<Child, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreateWeightEntryInput = Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateWeightEntryInput = Partial<Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreateFeedingConfigInput = Omit<FeedingConfig, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateFeedingConfigInput = Partial<Omit<FeedingConfig, 'id' | 'createdAt' | 'updatedAt'>>;

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/** Thrown when a write to the persistence layer fails (e.g. storage quota, private mode). */
export class RepositoryWriteError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RepositoryWriteError';
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Repository interface — all methods return Promises so a future network impl
// is a drop-in swap with zero call-site changes.
// ---------------------------------------------------------------------------

interface ChildRepository {
  list(ownerId: string): Promise<Child[]>;
  get(id: string): Promise<Child | null>;
  create(input: CreateChildInput): Promise<Child>;
  update(id: string, patch: UpdateChildInput): Promise<Child>;
  delete(id: string): Promise<void>;
}

interface WeightRepository {
  listByChild(childId: string): Promise<WeightEntry[]>;
  create(input: CreateWeightEntryInput): Promise<WeightEntry>;
  update(id: string, patch: UpdateWeightEntryInput): Promise<WeightEntry>;
  delete(id: string): Promise<void>;
}

interface FeedingConfigRepository {
  getByChild(childId: string): Promise<FeedingConfig | null>;
  upsert(input: CreateFeedingConfigInput): Promise<FeedingConfig>;
}

export interface Repository {
  children: ChildRepository;
  weights: WeightRepository;
  feedingConfig: FeedingConfigRepository;
}
