import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy, guarded Supabase client singleton.
 *
 * The library is loaded via a DYNAMIC `import()` on the FIRST call to
 * {@link getSupabaseClient}, not at module import time. This keeps the ~211 KB
 * `@supabase/supabase-js` bundle out of the eager startup graph: local-only
 * users (and the first paint for everyone) never download it. The type-only
 * import above is erased at build time, so it adds nothing to the bundle.
 *
 * This is also why the function is async — callers must `await` the client.
 */

const MISSING_CONFIG_MESSAGE = 'Supabase is not configured';

// Cache the PROMISE (not the resolved client) so concurrent first-callers share
// a single dynamic import instead of racing two `import()`s.
let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Returns the shared Supabase client, loading the library and creating the
 * client on first use.
 *
 * @throws Error with message "Supabase is not configured" when either
 *   `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing — callers that
 *   may run in local-only mode must guard against this.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (clientPromise !== null) {
    return clientPromise;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (
    supabaseUrl === undefined ||
    supabaseUrl === '' ||
    supabaseAnonKey === undefined ||
    supabaseAnonKey === ''
  ) {
    throw new Error(MISSING_CONFIG_MESSAGE);
  }

  clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
  );

  return clientPromise;
}

/**
 * Whether the Supabase env vars are present. Lets callers decide whether to
 * offer remote sync without triggering the throw in {@link getSupabaseClient}.
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return (
    supabaseUrl !== undefined &&
    supabaseUrl !== '' &&
    supabaseAnonKey !== undefined &&
    supabaseAnonKey !== ''
  );
}
