-- Geschlecht und In-App-Push-Präferenz auf customer_profiles.
-- Im Supabase SQL-Editor ausführen. Idempotent.

alter table public.customer_profiles
  add column if not exists gender text;

alter table public.customer_profiles
  add column if not exists in_app_push boolean not null default true;

alter table public.customer_profiles
  drop constraint if exists customer_profiles_gender_check;

alter table public.customer_profiles
  add constraint customer_profiles_gender_check
  check (gender is null or gender in ('female', 'male', 'diverse'));

notify pgrst, 'reload schema';
