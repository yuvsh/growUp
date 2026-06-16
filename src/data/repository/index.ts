/**
 * The swap point: for the MVP this wires up the localStorage implementation.
 * In a future phase, replace `createLocalStorageRepository(window.localStorage)`
 * with an HTTP-backed implementation — no call-site changes required.
 */
import { createLocalStorageRepository } from './localStorageRepository.js';
import { supabaseRepository } from './supabaseRepository.js';
import type { Repository } from './types.js';

/** The local-only repository instance (offline, default). */
export const localRepository: Repository =
  createLocalStorageRepository(window.localStorage);

/**
 * Default repository for call-sites that have not yet adopted
 * {@link useRepository} (e.g. RootRedirect). Local-only; remote routing is
 * resolved per-render by {@link useRepository}.
 */
export const repository: Repository = localRepository;

export { supabaseRepository };

export type { Repository } from './types.js';
export { RepositoryWriteError } from './types.js';
export type {
  CreateChildInput,
  UpdateChildInput,
  CreateWeightEntryInput,
  UpdateWeightEntryInput,
  CreateFeedingConfigInput,
  UpdateFeedingConfigInput,
} from './types.js';
