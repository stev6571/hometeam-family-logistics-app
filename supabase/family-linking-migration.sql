-- HomeTeam: Family linking migration
-- Run this in Supabase SQL Editor AFTER the original migration.sql

-- ── 1. Families table ─────────────────────────────────────────────────────────
create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My Family',
  join_code  text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at timestamptz default now()
);

-- ── 2. Family members ─────────────────────────────────────────────────────────
create table if not exists public.family_members (
  family_id  uuid references public.families(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  role       text not null default 'member',
  joined_at  timestamptz default now(),
  primary key (family_id, user_id)
);

-- ── 3. Drop and recreate user_app_data keyed by family_id ────────────────────
drop table if exists public.user_app_data;

create table public.user_app_data (
  family_id  uuid references public.families(id) on delete cascade primary key,
  state      jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
alter table public.families      enable row level security;
alter table public.family_members enable row level security;
alter table public.user_app_data  enable row level security;

-- Authenticated users can create and look up families
create policy "Authenticated users can read families"
  on public.families for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create families"
  on public.families for insert
  with check (auth.role() = 'authenticated');

create policy "Family members can update their family"
  on public.families for update
  using (
    id in (select family_id from public.family_members where user_id = auth.uid())
  );

-- Users can see their own memberships
create policy "Users can read their memberships"
  on public.family_members for select
  using (auth.uid() = user_id);

-- Users can join a family (insert their own row)
create policy "Users can join families"
  on public.family_members for insert
  with check (auth.uid() = user_id);

-- Family members can read and write their family's app state
create policy "Family members can access app state"
  on public.user_app_data for all
  using (
    family_id in (
      select family_id from public.family_members where user_id = auth.uid()
    )
  )
  with check (
    family_id in (
      select family_id from public.family_members where user_id = auth.uid()
    )
  );

-- ── 5. Re-attach updated_at trigger ──────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists user_app_data_updated_at on public.user_app_data;
create trigger user_app_data_updated_at
  before update on public.user_app_data
  for each row execute function public.handle_updated_at();
