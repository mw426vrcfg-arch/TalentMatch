-- Telefon und bevorzugte Sprache auf Kunden- und Salonprofilen.
-- Im Supabase SQL-Editor ausführen. Idempotent.

alter table public.customer_profiles
  add column if not exists phone text;

alter table public.customer_profiles
  add column if not exists hair_chemical text;

alter table public.customer_profiles
  add column if not exists hair_portfolio jsonb default '[]'::jsonb;

alter table public.business_profiles
  add column if not exists preferred_language text;

alter table public.customer_profiles
  drop constraint if exists customer_profiles_preferred_language_check;
alter table public.customer_profiles
  add constraint customer_profiles_preferred_language_check
  check (preferred_language is null or preferred_language in ('de', 'en', 'fr'));

alter table public.business_profiles
  drop constraint if exists business_profiles_preferred_language_check;
alter table public.business_profiles
  add constraint business_profiles_preferred_language_check
  check (preferred_language is null or preferred_language in ('de', 'en', 'fr'));

notify pgrst, 'reload schema';
