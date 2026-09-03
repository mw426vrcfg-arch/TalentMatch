-- Digitaler Behandlungs-Pass: strukturierte Haargeschichte im Kundenprofil.
-- Im Supabase SQL Editor ausführen.

alter table public.customer_profiles
  add column if not exists last_bleaching text;

alter table public.customer_profiles
  add column if not exists chemical_treatments text;

alter table public.customer_profiles
  add column if not exists hair_thickness text;
