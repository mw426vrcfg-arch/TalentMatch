-- Telefonnummer auf business_profiles.
-- Im Supabase SQL-Editor ausführen. Idempotent.
-- Behebt: Could not find the 'phone' column of 'business_profiles'
-- Die App speichert die Nummer zusätzlich in public.users.phone, damit sie
-- auch ohne diese Migration nach dem Speichern wieder angezeigt wird.

alter table public.business_profiles
  add column if not exists phone text;

notify pgrst, 'reload schema';
