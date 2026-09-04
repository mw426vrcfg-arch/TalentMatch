-- Ansprechpartner-Geschlecht und In-App-Push-Präferenz auf business_profiles.
-- Im Supabase SQL-Editor ausführen. Idempotent.

alter table public.business_profiles
  add column if not exists gender text;

alter table public.business_profiles
  add column if not exists contact_gender text;

alter table public.business_profiles
  add column if not exists in_app_push boolean not null default true;

alter table public.business_profiles
  drop constraint if exists business_profiles_gender_check;

alter table public.business_profiles
  add constraint business_profiles_gender_check
  check (gender is null or gender in ('female', 'male', 'diverse'));

alter table public.business_profiles
  drop constraint if exists business_profiles_contact_gender_check;

alter table public.business_profiles
  add constraint business_profiles_contact_gender_check
  check (contact_gender is null or contact_gender in ('female', 'male', 'diverse'));

notify pgrst, 'reload schema';
