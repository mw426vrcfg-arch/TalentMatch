-- Ratings-Spalten (vereinheitlicht)
-- booking_id, from_user_id, reviewee_id, rating, comment

alter table public.ratings add column if not exists from_user_id uuid references public.users (id) on delete cascade;
alter table public.ratings add column if not exists reviewee_id uuid references public.users (id) on delete cascade;
alter table public.ratings add column if not exists rating integer;
alter table public.ratings add column if not exists comment text;
alter table public.ratings add column if not exists booking_id uuid references public.bookings (id) on delete cascade;

create index if not exists ratings_from_user_id_idx on public.ratings (from_user_id);
create index if not exists ratings_reviewee_id_idx on public.ratings (reviewee_id);
create index if not exists ratings_booking_id_idx on public.ratings (booking_id);

alter table public.ratings enable row level security;
alter table public.ratings force row level security;

drop policy if exists ratings_select_public on public.ratings;
create policy ratings_select_public
  on public.ratings
  for select
  to anon, authenticated
  using (true);

drop policy if exists ratings_insert_own on public.ratings;
create policy ratings_insert_own
  on public.ratings
  for insert
  to authenticated
  with check (from_user_id = auth.uid());
