-- =============================================================================
-- TalentMatch – Security & Privacy Hardening
-- Im Supabase SQL-Editor komplett ausführen (idempotent, beliebig oft wiederholbar).
--
-- Reihenfolge: schema.sql → rls_policies.sql → messages.sql → dieses Skript.
--
-- Was dieses Skript absichert:
--   A  messages        – lesen/schreiben nur für die zwei Beteiligten des Termins
--   B  *_profiles      – Schreibrechte ausschliesslich für den Zeilen-Besitzer
--   C  storage.objects – Upload nur eingeloggt, Bewerbungsbilder nur für
--                        Kunde + zuständigen Salon
--
-- WICHTIG – Spaltennamen:
--   public.messages heisst die Absenderspalte `sender_id` (nicht `from_user_id`;
--   `from_user_id` existiert nur in public.ratings). Die Policies unten nutzen
--   den real vorhandenen Namen.
--
-- WICHTIG – Service-Role:
--   Die Next.js Server Actions arbeiten mit dem Service-Role-Key und umgehen RLS
--   bewusst (Autorisierung passiert dort im Code). Diese Policies sind der
--   zweite Riegel: Sie greifen für jeden, der mit dem öffentlichen anon-Key
--   direkt gegen die REST-/Realtime-API geht – also für den Browser und für
--   Angreifer, die den anon-Key aus dem Bundle ziehen.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0  Hilfsfunktionen
-- -----------------------------------------------------------------------------

-- Ist der aktuelle User Besitzer dieses Salon-Profils?
-- Deckt beide Konventionen ab: id = auth.uid() (aktuell) und user_id = auth.uid()
-- (Altbestand mit zufälliger id).
create or replace function public.owns_business_profile(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_profiles bp
    where bp.id = p_business_id
      and (bp.user_id = auth.uid() or bp.id = auth.uid())
  );
$$;

-- Gehört der aktuelle User zu den zwei Beteiligten einer Bewerbung?
-- Beteiligte = der bewerbende Kunde und der Salon, dem das Angebot gehört.
create or replace function public.is_chat_participant(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.offers o on o.id = a.offer_id
    left join public.business_profiles bp
      on bp.id = o.business_id
      or bp.user_id = o.business_id
    where a.id = p_application_id
      and (
        a.customer_id = auth.uid()
        or bp.user_id = auth.uid()
        or bp.id = auth.uid()
        or o.business_id = auth.uid()
      )
  );
$$;

-- Bestehende Funktion aus messages.sql auf dieselbe Logik ziehen, damit alte und
-- neue Policies nicht auseinanderlaufen. Chat bleibt an eine Zusage gebunden.
create or replace function public.can_chat_on_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = p_application_id
      and a.status = 'accepted'
  )
  and public.is_chat_participant(p_application_id);
$$;

revoke all on function public.owns_business_profile(uuid) from public;
revoke all on function public.is_chat_participant(uuid) from public;
revoke all on function public.can_chat_on_application(uuid) from public;

grant execute on function public.owns_business_profile(uuid) to authenticated;
grant execute on function public.is_chat_participant(uuid) to authenticated;
grant execute on function public.can_chat_on_application(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- A  messages – Chat ist strikt bilateral und append-only
-- -----------------------------------------------------------------------------

alter table public.messages add column if not exists booking_id uuid
  references public.bookings (id) on delete set null;

alter table public.messages enable row level security;
alter table public.messages force row level security;

drop policy if exists messages_select_participants on public.messages;
drop policy if exists messages_insert_own on public.messages;
drop policy if exists messages_update_none on public.messages;
drop policy if exists messages_delete_none on public.messages;

-- Lesen: nur wer Absender oder Gegenseite des verknüpften Termins ist.
create policy messages_select_participants
  on public.messages
  for select
  to authenticated
  using (
    sender_id = auth.uid()
    or public.can_chat_on_application(application_id)
  );

-- Schreiben: nur im eigenen Namen, nur in einen Chat, an dem man beteiligt ist,
-- und ein mitgeschicktes booking_id muss zur selben Bewerbung gehören.
create policy messages_insert_own
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_chat_on_application(application_id)
    and (
      booking_id is null
      or exists (
        select 1
        from public.bookings b
        where b.id = booking_id
          and b.application_id = messages.application_id
      )
    )
  );

-- Kein UPDATE, kein DELETE: Chatverlauf ist Beweismittel bei Disputes.
revoke update, delete, truncate on table public.messages from authenticated;
grant select, insert on table public.messages to authenticated;

-- -----------------------------------------------------------------------------
-- B1  customer_profiles – Schreibrechte nur für den Besitzer
-- -----------------------------------------------------------------------------

alter table public.customer_profiles enable row level security;
alter table public.customer_profiles force row level security;

drop policy if exists customer_profiles_select_own on public.customer_profiles;
drop policy if exists customer_profiles_select_salon on public.customer_profiles;
drop policy if exists customer_profiles_insert_own on public.customer_profiles;
drop policy if exists customer_profiles_update_own on public.customer_profiles;
drop policy if exists customer_profiles_delete_own on public.customer_profiles;

create policy customer_profiles_select_own
  on public.customer_profiles
  for select
  to authenticated
  using (id = auth.uid() or user_id = auth.uid());

-- Salon darf das Profil (Behandlungs-Pass, Haardaten) nur von Kunden lesen,
-- die sich tatsächlich auf ein eigenes Angebot beworben haben.
create policy customer_profiles_select_salon
  on public.customer_profiles
  for select
  to authenticated
  using (
    public.is_business()
    and exists (
      select 1
      from public.applications a
      where a.customer_id = coalesce(customer_profiles.user_id, customer_profiles.id)
        and public.owns_offer(a.offer_id)
    )
  );

create policy customer_profiles_insert_own
  on public.customer_profiles
  for insert
  to authenticated
  with check (id = auth.uid() and user_id = auth.uid());

-- Kern der Anforderung: UPDATE ausschliesslich durch den authentifizierten
-- Besitzer – und der Besitz darf per UPDATE auch nicht umgeschrieben werden
-- (deshalb dieselbe Bedingung in USING und WITH CHECK).
create policy customer_profiles_update_own
  on public.customer_profiles
  for update
  to authenticated
  using (id = auth.uid() or user_id = auth.uid())
  with check (id = auth.uid() and user_id = auth.uid());

revoke delete, truncate on table public.customer_profiles from authenticated;
grant select, insert on table public.customer_profiles to authenticated;

-- Gamification darf sich niemand selbst gutschreiben: UPDATE wird spaltenweise
-- vergeben, beauty_points und member_level bleiben aussen vor. Dynamisch, weil
-- je nach ausgeführten Migrationen unterschiedliche Spalten existieren.
do $$
declare
  editable text;
begin
  select string_agg(quote_ident(column_name), ', ')
  into editable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'customer_profiles'
    and column_name not in ('id', 'user_id', 'created_at', 'beauty_points', 'member_level');

  execute 'revoke update on table public.customer_profiles from authenticated';

  if editable is not null then
    execute format(
      'grant update (%s) on table public.customer_profiles to authenticated',
      editable
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- B2  business_profiles – Schreibrechte nur für den Besitzer
-- -----------------------------------------------------------------------------

alter table public.business_profiles enable row level security;
alter table public.business_profiles force row level security;

drop policy if exists business_profiles_select_own on public.business_profiles;
drop policy if exists business_profiles_select_public on public.business_profiles;
drop policy if exists business_profiles_insert_own on public.business_profiles;
drop policy if exists business_profiles_update_own on public.business_profiles;
drop policy if exists business_profiles_delete_own on public.business_profiles;

-- Salonname, Ort und Logo sind Teil jedes öffentlichen Angebots und bleiben
-- lesbar. Sensible Felder (stripe_account_id, phone) gehören nicht in Client-
-- Selects – die Server Actions holen sie über die Service-Role.
create policy business_profiles_select_public
  on public.business_profiles
  for select
  to anon, authenticated
  using (true);

create policy business_profiles_insert_own
  on public.business_profiles
  for insert
  to authenticated
  with check (
    (id = auth.uid() or user_id = auth.uid())
    and user_id = auth.uid()
    and public.is_business()
  );

create policy business_profiles_update_own
  on public.business_profiles
  for update
  to authenticated
  using (id = auth.uid() or user_id = auth.uid())
  with check (user_id = auth.uid());

revoke delete, truncate on table public.business_profiles from authenticated;
grant select, insert on table public.business_profiles to authenticated;

-- Abo-, Zahlungs- und Verifizierungsfelder darf niemand per Client-Update
-- anfassen – deshalb UPDATE nur spaltenweise auf die Profilfelder.
do $$
declare
  editable text;
begin
  select string_agg(quote_ident(column_name), ', ')
  into editable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'business_profiles'
    and column_name not in (
      'id', 'user_id', 'created_at',
      'stripe_account_id', 'subscription_plan', 'verified'
    );

  execute 'revoke update on table public.business_profiles from authenticated';

  if editable is not null then
    execute format(
      'grant update (%s) on table public.business_profiles to authenticated',
      editable
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- C1  Storage: application-images (privat)
-- Pfad-Konvention: {customer_id}/{offer_id}/{datei}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-images',
  'application-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists application_images_select_own on storage.objects;
drop policy if exists application_images_select_salon on storage.objects;
drop policy if exists application_images_insert_own on storage.objects;
drop policy if exists application_images_update_own on storage.objects;
drop policy if exists application_images_delete_own on storage.objects;

-- Kunde: nur der eigene Ordner.
create policy application_images_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'application-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Salon: nur Bilder zu Angeboten, die ihm gehören, und nur solange dafür
-- wirklich eine Bewerbung dieses Kunden vorliegt.
create policy application_images_select_salon
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'application-images'
    and public.is_business()
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_offer(((storage.foldername(name))[2])::uuid)
    and exists (
      select 1
      from public.applications a
      where a.offer_id = ((storage.foldername(name))[2])::uuid
        and a.customer_id = ((storage.foldername(name))[1])::uuid
    )
  );

-- Upload nur eingeloggt und nur in den eigenen Kundenordner.
create policy application_images_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'application-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_customer()
  );

create policy application_images_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'application-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'application-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy application_images_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'application-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- C2  Storage: customer-images (Avatare + Haar-Portfolio)
-- Pfad-Konvention: {user_id}/avatar.{ext} und {user_id}/portfolio/{datei}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-images',
  'customer-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists customer_images_select_public on storage.objects;
drop policy if exists customer_images_insert_own on storage.objects;
drop policy if exists customer_images_update_own on storage.objects;
drop policy if exists customer_images_delete_own on storage.objects;

-- Bucket ist public, weil Avatare und Portfolio-Bilder über öffentliche URLs
-- gerendert werden. Lesen ist damit bewusst offen, Schreiben nicht.
create policy customer_images_select_public
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'customer-images');

create policy customer_images_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'customer-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy customer_images_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'customer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'customer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy customer_images_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'customer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- C3  Storage: business-images (Logos + Vorher-Nachher-Portfolio)
-- Pfad-Konvention: {business_profile_id}/logo.{ext} und {salon_id}/portfolio/…
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images',
  'business-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists business_images_select_public on storage.objects;
drop policy if exists business_images_insert_own on storage.objects;
drop policy if exists business_images_update_own on storage.objects;
drop policy if exists business_images_delete_own on storage.objects;

create policy business_images_select_public
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'business-images');

create policy business_images_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-images'
    and auth.uid() is not null
    and public.is_business()
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_business_profile(((storage.foldername(name))[1])::uuid)
  );

create policy business_images_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-images'
    and public.is_business()
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_business_profile(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_business_profile(((storage.foldername(name))[1])::uuid)
  );

create policy business_images_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-images'
    and public.is_business()
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_business_profile(((storage.foldername(name))[1])::uuid)
  );

-- -----------------------------------------------------------------------------
-- D  Kontrolle – nach dem Ausführen kurz prüfen
-- -----------------------------------------------------------------------------

-- Tabellen ohne aktives RLS aufspüren (Ergebnis sollte leer sein):
--   select tablename
--   from pg_tables
--   where schemaname = 'public' and rowsecurity = false;

-- Alle gesetzten Policies auf einen Blick:
--   select tablename, policyname, cmd, roles
--   from pg_policies
--   where schemaname in ('public', 'storage')
--   order by tablename, policyname;

-- Bucket-Sichtbarkeit prüfen (application-images muss public = false sein):
--   select id, public from storage.buckets order by id;
