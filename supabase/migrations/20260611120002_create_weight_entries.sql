-- GrowUp remote sync schema — weight_entries
-- One weight measurement (integer grams) on a date for a child. Owner-only RLS.

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  date_measured date not null,
  weight_grams integer not null check (weight_grams > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weight_entries enable row level security;

drop policy if exists "weight_entries_owner_all" on public.weight_entries;
create policy "weight_entries_owner_all" on public.weight_entries
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create index if not exists weight_entries_owner_id_idx on public.weight_entries(owner_id);
create index if not exists weight_entries_child_id_idx on public.weight_entries(child_id);

drop trigger if exists weight_entries_set_updated_at on public.weight_entries;
create trigger weight_entries_set_updated_at
  before update on public.weight_entries
  for each row execute function public.set_updated_at();
