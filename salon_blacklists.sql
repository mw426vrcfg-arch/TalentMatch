-- Private Blacklist: Salons sperren einzelne Modelle nur für den eigenen Salon.
-- Im Supabase SQL Editor ausführen.

create table if not exists public.salon_blacklists (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.business_profiles (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (salon_id, customer_id)
);

create index if not exists salon_blacklists_salon_id_idx on public.salon_blacklists (salon_id);
create index if not exists salon_blacklists_customer_id_idx on public.salon_blacklists (customer_id);

alter table public.salon_blacklists enable row level security;
alter table public.salon_blacklists force row level security;

-- Nur der Salon selbst sieht und pflegt seine Sperrliste. Kunden sehen sie nie.
drop policy if exists salon_blacklists_select_own on public.salon_blacklists;
create policy salon_blacklists_select_own
  on public.salon_blacklists for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_profiles bp
      where bp.id = salon_blacklists.salon_id
        and bp.user_id = auth.uid()
    )
  );

drop policy if exists salon_blacklists_insert_own on public.salon_blacklists;
create policy salon_blacklists_insert_own
  on public.salon_blacklists for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.business_profiles bp
      where bp.id = salon_blacklists.salon_id
        and bp.user_id = auth.uid()
    )
  );

drop policy if exists salon_blacklists_delete_own on public.salon_blacklists;
create policy salon_blacklists_delete_own
  on public.salon_blacklists for delete
  to authenticated
  using (
    exists (
      select 1
      from public.business_profiles bp
      where bp.id = salon_blacklists.salon_id
        and bp.user_id = auth.uid()
    )
  );
