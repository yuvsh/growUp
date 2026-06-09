import { childSchema, weightEntrySchema, feedingConfigSchema } from '../../types/schemas.js';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index.js';
import type {
  Repository,
  CreateChildInput,
  UpdateChildInput,
  CreateWeightEntryInput,
  UpdateWeightEntryInput,
  CreateFeedingConfigInput,
} from './types.js';
import { RepositoryWriteError } from './types.js';

// ---------------------------------------------------------------------------
// Storage keys (namespaced to avoid collisions)
// ---------------------------------------------------------------------------

const KEYS = {
  children: 'growup:children',
  weights: 'growup:weights',
  feedingConfig: 'growup:feedingConfig',
} as const;

// ---------------------------------------------------------------------------
// Storage abstraction — injected so tests can stub it
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowUtcIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Read and parse a JSON array from storage. Returns an empty array if the key
 * is missing, the value is not valid JSON, or the parsed data fails schema
 * validation. Never throws.
 */
function readArray<T>(
  storage: StorageAdapter,
  key: string,
  validate: (item: unknown) => T,
): T[] {
  const raw = storage.getItem(key);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const result: T[] = [];
  for (const item of parsed) {
    try {
      result.push(validate(item));
    } catch {
      // Malformed item — skip it rather than crashing
    }
  }
  return result;
}

/**
 * Serialize an array to storage. Throws `RepositoryWriteError` on failure
 * (e.g. quota exceeded, private-browsing restriction).
 */
function writeArray(storage: StorageAdapter, key: string, data: unknown[]): void {
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch (err) {
    throw new RepositoryWriteError(
      `Failed to write to storage key "${key}"`,
      err,
    );
  }
}

// ---------------------------------------------------------------------------
// Validators (thin wrappers around zod schemas)
// ---------------------------------------------------------------------------

function validateChild(item: unknown): Child {
  return childSchema.parse(item);
}

function validateWeightEntry(item: unknown): WeightEntry {
  return weightEntrySchema.parse(item);
}

function validateFeedingConfig(item: unknown): FeedingConfig {
  return feedingConfigSchema.parse(item);
}

// ---------------------------------------------------------------------------
// Factory — creates a Repository bound to the given storage adapter
// ---------------------------------------------------------------------------

export function createLocalStorageRepository(storage: StorageAdapter): Repository {
  // ---- Children ------------------------------------------------------------

  const children = {
    async list(ownerId: string): Promise<Child[]> {
      return readArray(storage, KEYS.children, validateChild).filter(
        (child) => child.ownerId === ownerId,
      );
    },

    async get(id: string): Promise<Child | null> {
      const all = readArray(storage, KEYS.children, validateChild);
      return all.find((child) => child.id === id) ?? null;
    },

    async create(input: CreateChildInput): Promise<Child> {
      const all = readArray(storage, KEYS.children, validateChild);
      const now = nowUtcIso();
      const newChild: Child = { ...input, id: newId(), createdAt: now, updatedAt: now };
      writeArray(storage, KEYS.children, [...all, newChild]);
      return newChild;
    },

    async update(id: string, patch: UpdateChildInput): Promise<Child> {
      const all = readArray(storage, KEYS.children, validateChild);
      const index = all.findIndex((child) => child.id === id);
      if (index === -1) {
        throw new Error(`Child with id "${id}" not found`);
      }
      const existing = all[index];
      if (existing === undefined) {
        throw new Error(`Child with id "${id}" not found`);
      }
      const updated: Child = { ...existing, ...patch, id, updatedAt: nowUtcIso() };
      const next = [...all];
      next[index] = updated;
      writeArray(storage, KEYS.children, next);
      return updated;
    },

    async delete(id: string): Promise<void> {
      const all = readArray(storage, KEYS.children, validateChild);
      writeArray(
        storage,
        KEYS.children,
        all.filter((child) => child.id !== id),
      );
    },
  };

  // ---- WeightEntries -------------------------------------------------------

  const weights = {
    async listByChild(childId: string): Promise<WeightEntry[]> {
      return readArray(storage, KEYS.weights, validateWeightEntry).filter(
        (entry) => entry.childId === childId,
      );
    },

    async create(input: CreateWeightEntryInput): Promise<WeightEntry> {
      const all = readArray(storage, KEYS.weights, validateWeightEntry);
      const now = nowUtcIso();
      const newEntry: WeightEntry = { ...input, id: newId(), createdAt: now, updatedAt: now };
      writeArray(storage, KEYS.weights, [...all, newEntry]);
      return newEntry;
    },

    async update(id: string, patch: UpdateWeightEntryInput): Promise<WeightEntry> {
      const all = readArray(storage, KEYS.weights, validateWeightEntry);
      const index = all.findIndex((entry) => entry.id === id);
      if (index === -1) {
        throw new Error(`WeightEntry with id "${id}" not found`);
      }
      const existing = all[index];
      if (existing === undefined) {
        throw new Error(`WeightEntry with id "${id}" not found`);
      }
      const updated: WeightEntry = { ...existing, ...patch, id, updatedAt: nowUtcIso() };
      const next = [...all];
      next[index] = updated;
      writeArray(storage, KEYS.weights, next);
      return updated;
    },

    async delete(id: string): Promise<void> {
      const all = readArray(storage, KEYS.weights, validateWeightEntry);
      writeArray(
        storage,
        KEYS.weights,
        all.filter((entry) => entry.id !== id),
      );
    },
  };

  // ---- FeedingConfig -------------------------------------------------------

  const feedingConfig = {
    async getByChild(childId: string): Promise<FeedingConfig | null> {
      const all = readArray(storage, KEYS.feedingConfig, validateFeedingConfig);
      return all.find((config) => config.childId === childId) ?? null;
    },

    async upsert(input: CreateFeedingConfigInput): Promise<FeedingConfig> {
      const all = readArray(storage, KEYS.feedingConfig, validateFeedingConfig);
      const now = nowUtcIso();
      const existingIndex = all.findIndex(
        (config) => config.childId === input.childId,
      );

      if (existingIndex !== -1) {
        const existing = all[existingIndex];
        if (existing === undefined) {
          throw new Error(`FeedingConfig at index ${existingIndex} not found`);
        }
        const updated: FeedingConfig = {
          ...existing,
          ...input,
          id: existing.id,
          updatedAt: now,
        };
        const next = [...all];
        next[existingIndex] = updated;
        writeArray(storage, KEYS.feedingConfig, next);
        return updated;
      }

      const created: FeedingConfig = { ...input, id: newId(), createdAt: now, updatedAt: now };
      writeArray(storage, KEYS.feedingConfig, [...all, created]);
      return created;
    },
  };

  return { children, weights, feedingConfig };
}
