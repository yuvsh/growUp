-- GrowUp remote sync schema — feeding_configs
-- Per-child feeding preferences (one row per child). Owner-only RLS.

create table if not exists public.feeding_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  feeds_per_day integer not null default 8 check (feeds_per_day >= 1),
  use_high_calorie boolean not null default false,
  kcal_per_ml numeric not null default 0.67 check (kcal_per_ml > 0),
  ml_per_kg_min numeric not null default 120 check (ml_per_kg_min > 0),
  ml_per_kg_max numeric not null default 200 check (ml_per_kg_max >= ml_per_kg_min),
  avg_intake_ml_per_day numeric check (avg_intake_ml_per_day is null or avg_intake_ml_per_day > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id)
);

alter table public.feeding_configs enable row level security;

drop policy if exists "feeding_configs_owner_all" on public.feeding_configs;
create policy "feeding_configs_owner_all" on public.feeding_configs
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create index if not exists feeding_configs_owner_id_idx on public.feeding_configs(owner_id);

drop trigger if exists feeding_configs_set_updated_at on public.feeding_configs;
create trigger feeding_configs_set_updated_at
  before update on public.feeding_configs
  for each row execute function public.set_updated_at();
