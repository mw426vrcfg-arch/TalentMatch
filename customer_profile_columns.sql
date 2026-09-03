-- =============================================================================
-- TalentMatch – fehlende Spalten in public.customer_profiles nachziehen
-- Im Supabase SQL-Editor ausführen. Idempotent, beliebig oft wiederholbar.
--
-- Warum nötig:
-- Die Tabelle hatte in der Datenbank nur id, user_id, full_name, bio,
-- profile_picture_url und updated_at. Haarprofil, Behandlungs-Pass,
-- Haar-Portfolio und die Loyalty-Felder wurden zwar von der App geschrieben,
-- von Postgres aber verworfen – die App hat den fehlenden Spalten-Fehler
-- stillschweigend abgefangen und trotzdem "gespeichert" gemeldet.
--
-- Dieses Skript fasst zusammen, was bisher auf portfolio_and_match.sql,
-- treatment_pass.sql, hair_portfolio.sql und engagement.sql verteilt war.
-- =============================================================================

-- Haarprofil (Buttons "Glatt / Wellig / Lockig" usw.)
alter table public.customer_profiles add column if not exists hair_structure text;
alter table public.customer_profiles add column if not exists hair_length text;
alter table public.customer_profiles add column if not exists hair_chemical text;

-- Digitaler Behandlungs-Pass
alter table public.customer_profiles add column if not exists last_bleaching text;
alter table public.customer_profiles add column if not exists chemical_treatments text;
alter table public.customer_profiles add column if not exists hair_thickness text;

-- Haar-Portfolio: bis zu 6 Bild-URLs aus dem Bucket customer-images
alter table public.customer_profiles
  add column if not exists hair_portfolio jsonb not null default '[]'::jsonb;

-- Gamification (Beauty Points / Member Level)
alter table public.customer_profiles
  add column if not exists beauty_points integer not null default 0;
alter table public.customer_profiles
  add column if not exists member_level text not null default 'Bronze';

-- Nur die in der App definierten Werte zulassen, damit kein Freitext in den
-- Auswahlfeldern landet und die Buttons zuverlässig wieder aktiv markiert werden.
alter table public.customer_profiles
  drop constraint if exists customer_profiles_hair_structure_check;
alter table public.customer_profiles
  add constraint customer_profiles_hair_structure_check
  check (hair_structure is null or hair_structure in ('glatt', 'wellig', 'lockig'));

alter table public.customer_profiles
  drop constraint if exists customer_profiles_hair_length_check;
alter table public.customer_profiles
  add constraint customer_profiles_hair_length_check
  check (hair_length is null or hair_length in ('kurz', 'mittellang', 'lang'));

alter table public.customer_profiles
  drop constraint if exists customer_profiles_hair_chemical_check;
alter table public.customer_profiles
  add constraint customer_profiles_hair_chemical_check
  check (hair_chemical is null or hair_chemical in ('natur', 'gefaerbt', 'blondiert'));

alter table public.customer_profiles
  drop constraint if exists customer_profiles_hair_thickness_check;
alter table public.customer_profiles
  add constraint customer_profiles_hair_thickness_check
  check (hair_thickness is null or hair_thickness in ('fein', 'mittel', 'dick'));

-- Kontrolle: sollte alle oben genannten Spalten auflisten.
--   select column_name, data_type
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'customer_profiles'
--   order by column_name;
