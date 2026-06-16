/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — only present when remote sync is configured. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anonymous (public) API key — only present when remote sync is configured. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
