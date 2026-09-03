-- Kundenprofil (Supabase: Tabelle customer_profiles bereits vorhanden)
-- Optional ausführen, falls die Tabelle lokal noch fehlt.

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  full_name text not null default '',
  bio text,
  profile_picture_url text,
  hair_portfolio jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
alter table public.customer_profiles force row level security;

drop policy if exists customer_profiles_select_own on public.customer_profiles;
create policy customer_profiles_select_own
  on public.customer_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists customer_profiles_update_own on public.customer_profiles;
create policy customer_profiles_update_own
  on public.customer_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
