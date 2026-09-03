-- Favoriten und Salon-Abos für die Kunden-Tab-Bar.
-- In Supabase SQL Editor ausführen.

create table if not exists public.favorite_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);

create index if not exists favorite_offers_user_id_idx on public.favorite_offers (user_id);
create index if not exists favorite_offers_offer_id_idx on public.favorite_offers (offer_id);

create table if not exists public.followed_salons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  salon_id uuid not null references public.business_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, salon_id)
);

create index if not exists followed_salons_user_id_idx on public.followed_salons (user_id);
create index if not exists followed_salons_salon_id_idx on public.followed_salons (salon_id);

alter table public.favorite_offers enable row level security;
alter table public.favorite_offers force row level security;
alter table public.followed_salons enable row level security;
alter table public.followed_salons force row level security;

drop policy if exists favorite_offers_select_own on public.favorite_offers;
create policy favorite_offers_select_own
  on public.favorite_offers for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists favorite_offers_insert_own on public.favorite_offers;
create policy favorite_offers_insert_own
  on public.favorite_offers for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists favorite_offers_delete_own on public.favorite_offers;
create policy favorite_offers_delete_own
  on public.favorite_offers for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists followed_salons_select_own on public.followed_salons;
create policy followed_salons_select_own
  on public.followed_salons for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists followed_salons_insert_own on public.followed_salons;
create policy followed_salons_insert_own
  on public.followed_salons for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists followed_salons_delete_own on public.followed_salons;
create policy followed_salons_delete_own
  on public.followed_salons for delete
  to authenticated
  using (user_id = auth.uid());

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'application_received',
    'application_accepted',
    'application_rejected',
    'booking_confirmed',
    'offer_published'
  )
);
