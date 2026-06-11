# HLD: GrowUp — Optional Remote Sync

> **Version:** 1.0 · **Date:** 2026-06-11 · **Status:** Draft
> **PRD reference:** docs/PRD-remote-sync.md · **Complements:** docs/HLD.md (§10 Forward Compatibility already designed the seams used here).
> **Decisions:** Supabase (Postgres + Auth + RLS) · Google OAuth only · managed security · remote = source of truth, online · local stays offline/default.

---

## 1. Tech Stack (additions only)

| Layer | Technology | Why |
|---|---|---|
| Remote DB | **Supabase Postgres** | Managed Postgres; relational model matches our entities; RLS for per-user isolation. Already configured (MCP + skill). |
| Auth | **Supabase Auth — Google OAuth** | One-tap sign-in, no password handling. Local mode uses no auth. |
| Client SDK | `@supabase/supabase-js` v2 | DB + auth client for the SPA. |
| Security | **Row-Level Security**, TLS, encryption at rest | Owner-only row access; the core privacy guarantee. |
| Existing | React + Vite SPA, async `Repository` interface, `AuthContext` | Unchanged — we add a second repository + a real auth provider behind the existing seams. |

**Cost:** Supabase free tier at this scale ($0). **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public, browser-safe — RLS is what protects data; never ship the service-role key to the client).

---

## 2. System Architecture

The app picks **which `Repository` implementation** to use from a persisted **storage mode**, and gets the current user from `AuthContext`. Nothing else in the UI changes — screens/hooks already call `repository.*` and `useAuth()`.

```mermaid
graph TD
  subgraph Browser (SPA)
    UI[Screens / hooks: useChild, useWeights, useFeeding]
    Auth[AuthContext: anonymous local OR Supabase user]
    Mode[StorageMode: 'local' | 'remote' in localStorage]
    Repo[Repository interface]
    Local[LocalStorageRepository]
    Supa[SupabaseRepository]
    SB[supabase-js client]
  end
  subgraph Supabase (cloud)
    GAuth[Auth: Google OAuth]
    PG[(Postgres: children / weight_entries / feeding_configs)]
    RLS[Row-Level Security: owner_id = auth.uid()]
  end

  UI --> Repo
  UI --> Auth
  Mode --> Repo
  Repo -->|mode=local| Local
  Repo -->|mode=remote| Supa
  Supa --> SB --> PG
  Auth --> GAuth
  PG --- RLS
```

**Key decisions:**
- **The repository is chosen at the composition root** (`src/data/repository/index.ts`) from `storageMode` + auth state. `local` → `LocalStorageRepository` (today). `remote` (and signed in) → `SupabaseRepository`.
- **`ownerId` is the seam already present** on every entity. Local mode = the anonymous local id (today). Remote mode = `auth.uid()`. RLS enforces it server-side regardless of client.
- **Remote = source of truth, online.** `SupabaseRepository` methods are real network calls; failures throw typed errors the UI already handles with calm messaging. No local mirror in v1 (keeps it simple, no conflict resolution).

---

## 3. Data Model (Supabase)

Mirrors the local entities (docs/HLD.md §3), one table each. `owner_id` references the auth user; timestamps are server-managed.

```sql
-- children
create table public.children (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sex text not null check (sex in ('male','female')),
  date_of_birth date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- weight_entries
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  date_measured date not null,
  weight_grams integer not null check (weight_grams > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- feeding_configs (incl. the intake field, FEED-4)
create table public.feeding_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  feeds_per_day integer not null default 8,
  use_high_calorie boolean not null default false,
  kcal_per_ml numeric not null default 0.67,
  ml_per_kg_min numeric not null default 120,
  ml_per_kg_max numeric not null default 200,
  avg_intake_ml_per_day numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id)
);
```

### Row-Level Security (the privacy core)

```sql
alter table public.children enable row level security;
alter table public.weight_entries enable row level security;
alter table public.feeding_configs enable row level security;

-- For each table: the owner may do everything to their own rows, nobody else can see them.
create policy "own rows" on public.children
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- (same policy on weight_entries and feeding_configs)
```

**Business rules at the DB level:** FK cascades (deleting a child removes its weights/configs; deleting the auth user removes all rows), `weight_grams > 0`, `sex` check, one feeding_config per child. All migrations are timestamped SQL files (`supabase/migrations/YYYYMMDDHHMMSS_*.sql`), idempotent.

> **Mapping note:** DB uses snake_case columns; the `SupabaseRepository` maps to/from the camelCase TS entities. Weight stays integer grams; dates as ISO strings.

---

## 4. Repository & Auth

### `SupabaseRepository` (`src/data/repository/supabaseRepository.ts`)
Implements the existing async `Repository` interface using `supabase-js`:
- `children.list/get/create/update/delete`, `weights.listByChild/create/update/delete`, `feedingConfig.getByChild/upsert` → `supabase.from('...').select/insert/update/delete()` with snake↔camel mapping.
- `owner_id` is set to `auth.uid()` on insert (and enforced by RLS).
- Network/permission failures → throw the existing typed errors so the UI's calm error handling/toasts work unchanged.
- Reads validate shape with the existing Zod schemas (defense in depth).

### Composition root (`src/data/repository/index.ts`)
```
getRepository(mode, isSignedIn):
  if mode === 'remote' && isSignedIn → SupabaseRepository
  else → LocalStorageRepository
```
Exposed via a small provider/hook so hooks (`useChild`, etc.) get the right instance reactively when mode/auth changes.

### Auth (`src/auth/AuthContext.tsx` — real implementation)
- Today: anonymous local user. Add a Supabase-backed mode: `signInWithGoogle()` (OAuth redirect), `signOut()`, and a session listener (`supabase.auth.onAuthStateChange`) exposing `{ user, isAnonymous, signInWithGoogle, signOut }`.
- **Local mode** keeps returning the anonymous local user (no Supabase calls).
- OAuth redirect handling for the Vite SPA: a callback route restores the session, then routes into the app.

### Storage mode (`src/lib/storageMode.ts`)
- `'local' | 'remote'` persisted in `localStorage` (`growup:storageMode`). Read at startup; default `'local'`. Set during onboarding and in Settings.

---

## 5. Onboarding, Migration & Switching

- **Onboarding** gains a storage-choice step (PRD SYNC-1). `remote` → trigger Google sign-in; on success, set mode=remote and continue.
- **Migration (local → remote, SYNC-4):** a one-time routine — read all entities from `LocalStorageRepository`, write them to `SupabaseRepository` (new ids or preserve ids; `owner_id`=auth user), inside a confirm modal that states what will be uploaded. Mark migrated. Keep the local copy until the user clears it (safer).
- **Settings → Storage & Privacy (SYNC-5/6):** show current mode; switch modes (re-running migration / re-auth as needed); **Export** (serialize all current-repo data to a JSON download); **Delete account & data** (delete rows via cascade + `auth` user) with a hard confirm.

---

## 6. Folder Structure (additions)

```
/src
  /data/repository
    supabaseRepository.ts        # new: Repository over supabase-js
    index.ts                     # updated: choose impl by mode + auth
  /lib
    /supabase/client.ts          # supabase-js client (env-configured)
    storageMode.ts               # 'local' | 'remote' persistence
  /auth/AuthContext.tsx          # updated: Google sign-in + session
  /features
    /onboarding                  # storage-choice step (or extend profile/Onboarding)
    /settings                    # Storage & Privacy section (export/delete/switch)
/supabase
  /migrations/*.sql              # children, weight_entries, feeding_configs + RLS
```

---

## 7. Environment Variables

```bash
VITE_SUPABASE_URL=        # public: project URL
VITE_SUPABASE_ANON_KEY=   # public anon key (browser) — RLS protects data; NOT the service key
```
Google OAuth client configured in the Supabase dashboard (authorized redirect = the app's callback URL). No secrets in client code.

---

## 8. Key Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **RLS misconfiguration → data leak** | Low | **Critical** | Enable RLS on every table; test that user B cannot read user A's rows before launch; default-deny. |
| OAuth redirect handling in the SPA (Vite, no SSR) | Med | Med | Dedicated callback route + `onAuthStateChange`; test redirect on the deployed URL. |
| Partial migration failure (local→remote) | Med | Med | Idempotent upload, per-record error capture, keep local copy until verified; show a clear result. |
| Online-only remote actions surprise users | Med | Low | Clear copy that sync needs a connection; preserve in-progress input on failure. |
| Anon-key/secret confusion | Low | High | Only the anon key in the client; service-role key never leaves server/dashboard. |
| Cost/quota | Low | Low | Free tier is ample at this scale; monitor. |

---

## 9. Resolved Technical Decisions

- **Project region:** **EU**.
- **local→remote id strategy:** **preserve entity ids** (keeps child↔weight/feeding references intact; idempotent re-upload).
- **Multi-device with local data present:** **prefer the account's remote data**; offer a one-time "also upload this device's local data?".
- **Session expiry in remote mode:** **re-auth prompt** (never show stale/other data).
- **Switch remote→local:** copy cloud data down to the device; keep the cloud copy until explicitly deleted (PRD §10).

---

## Next Steps
1. Confirm the PRD/HLD open questions (region, switch-direction behavior, id strategy).
2. Provision the Supabase project + Google OAuth; run the migrations (children / weight_entries / feeding_configs + RLS).
3. Build behind the existing seams: `supabaseRepository.ts`, real `AuthContext`, `storageMode`, onboarding choice, settings (migrate/export/delete).
4. **Security gate:** verify cross-account isolation (RLS) before any real data.
