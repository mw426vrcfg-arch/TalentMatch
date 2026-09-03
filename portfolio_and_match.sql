-- Vorher/Nachher-Portfolio + Smart-Match-Haartags.
-- Im Supabase SQL Editor ausführen.

alter table public.ratings add column if not exists before_url text;
alter table public.ratings add column if not exists after_url text;

create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid references public.ratings (id) on delete cascade,
  salon_user_id uuid not null references public.users (id) on delete cascade,
  before_url text not null,
  after_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_images_salon_user_id_idx
  on public.portfolio_images (salon_user_id, created_at desc);

alter table public.portfolio_images enable row level security;
alter table public.portfolio_images force row level security;

drop policy if exists portfolio_images_select_public on public.portfolio_images;
create policy portfolio_images_select_public
  on public.portfolio_images
  for select
  to anon, authenticated
  using (true);

alter table public.customer_profiles add column if not exists hair_structure text;
alter table public.customer_profiles add column if not exists hair_length text;
alter table public.customer_profiles add column if not exists hair_chemical text;

alter table public.offers add column if not exists wanted_hair_structure text;
alter table public.offers add column if not exists wanted_hair_length text;
alter table public.offers add column if not exists wanted_hair_chemical text;

drop policy if exists portfolio_images_insert_salon on public.portfolio_images;
create policy portfolio_images_insert_salon
  on public.portfolio_images
  for insert
  to authenticated
  with check (salon_user_id = auth.uid());
