-- HomeTeam: Supabase schema
-- Run this in your Supabase project → SQL Editor → New query

-- ── 1. App data table ─────────────────────────────────────────────────────────
-- Each row is one family's entire app state stored as JSONB.
-- Keyed by auth.users.id so one row = one account = one family.

create table if not exists public.user_app_data (
  id          uuid        references auth.users on delete cascade primary key,
  state       jsonb       not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 2. Row Level Security ─────────────────────────────────────────────────────
-- Each family can only read and write their own row.

alter table public.user_app_data enable row level security;

create policy "Users can manage their own family data"
  on public.user_app_data
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 3. Auto-update updated_at on every save ───────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_app_data_updated_at on public.user_app_data;

create trigger user_app_data_updated_at
  before update on public.user_app_data
  for each row execute function public.handle_updated_at();
