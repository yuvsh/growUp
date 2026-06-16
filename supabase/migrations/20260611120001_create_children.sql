-- GrowUp remote sync schema — children
-- Owner-only Row-Level Security: a user can only read/write their own children.
-- Applied to the EU Supabase project (mkpjgoabisswoinuyuqy) on 2026-06-11.

-- Shared trigger to auto-touch updated_at on any row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- children: one row per tracked infant, owned by an auth user.
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sex text not null check (sex in ('male','female')),
  date_of_birth date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.children enable row level security;

drop policy if exists "children_owner_all" on public.children;
create policy "children_owner_all" on public.children
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create index if not exists children_owner_id_idx on public.children(owner_id);

drop trigger if exists children_set_updated_at on public.children;
create trigger children_set_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();
