import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy, guarded Supabase client singleton.
 *
 * The client is created on the FIRST call to {@link getSupabaseClient}, not at
 * module import time. This is deliberate: local-only users have no
 * `VITE_SUPABASE_*` env vars, and we must never crash the app (or the build)
 * simply because the remote-sync feature is unconfigured.
 */

const MISSING_CONFIG_MESSAGE = 'Supabase is not configured';

let client: SupabaseClient | null = null;

/**
 * Returns the shared Supabase client, creating it on first use.
 *
 * @throws Error with message "Supabase is not configured" when either
 *   `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing — callers that
 *   may run in local-only mode must guard against this.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client !== null) {
    return client;
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

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
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
