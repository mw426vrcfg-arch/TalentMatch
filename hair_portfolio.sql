-- Haar-Portfolio: bis zu 6 öffentliche Bild-URLs (Bucket customer-images).
-- In Supabase SQL Editor ausführen, falls die Spalte noch fehlt.

alter table public.customer_profiles
  add column if not exists hair_portfolio jsonb not null default '[]'::jsonb;
