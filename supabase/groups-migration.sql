-- HomeTeam: Groups migration
-- Adds group_type and is_personal columns to the families table
-- Run in Supabase SQL Editor

alter table public.families
  add column if not exists group_type text not null default 'family';

alter table public.families
  add column if not exists is_personal boolean not null default false;
