/**
 * The swap point: for the MVP this wires up the localStorage implementation.
 * In a future phase, replace `createLocalStorageRepository(window.localStorage)`
 * with an HTTP-backed implementation — no call-site changes required.
 */
import { createLocalStorageRepository } from './localStorageRepository.js';
import type { Repository } from './types.js';

export const repository: Repository = createLocalStorageRepository(window.localStorage);

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
