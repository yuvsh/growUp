import { useAuth } from '../../auth/AuthContext.js';
import { localRepository, supabaseRepository } from './index.js';
import type { Repository } from './types.js';

/**
 * Resolves the active {@link Repository} from the current storage mode + auth:
 * - `remote` mode AND a signed-in user → the Supabase-backed repository.
 * - Otherwise (local mode, or remote-but-signed-out) → the local repository.
 *
 * Returning the local repository when remote-signed-out keeps the app safe:
 * no Supabase calls fire until an owner exists. Must be used inside the
 * `AuthProvider` (all screens are).
 */
export function useRepository(): Repository {
  const { mode, user } = useAuth();
  if (mode === 'remote' && user !== null && !user.isAnonymous) {
    return supabaseRepository;
  }
  return localRepository;
}
