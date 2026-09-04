-- Urgent Match / Last-Minute: in Supabase SQL Editor ausführen, falls die Spalte fehlt.

alter table public.offers
  add column if not exists is_urgent boolean not null default false;

create index if not exists offers_is_urgent_idx
  on public.offers (is_urgent)
  where is_urgent = true;

notify pgrst, 'reload schema';
