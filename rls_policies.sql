-- =============================================================================
-- TalentMatch – Row Level Security (strikt)
-- In Supabase: SQL Editor → gesamtes Skript ausführen.
--
-- Kapitel 7 / Trust-Layer:
-- 1. Kunden sehen und ändern nur eigene Bewerbungen.
-- 2. Salons sehen nur Bewerbungen auf die eigenen Angebote.
-- 3. Storage: niemand liest fremde Hair Images.
--
-- Hinweis: Der Bucket application-images wird privat. Öffentliche
-- Objekt-URLs funktionieren danach nicht mehr.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Hilfsfunktionen (SECURITY DEFINER, nur auth.uid(), fester search_path)
-- -----------------------------------------------------------------------------

create or replace function public.is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'customer'
  );
$$;

create or replace function public.is_business()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('business', 'admin')
  );
$$;

create or replace function public.owns_offer(p_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.offers o
    join public.business_profiles bp on bp.id = o.business_id
    where o.id = p_offer_id
      and bp.user_id = auth.uid()
  );
$$;

create or replace function public.owns_application_offer(p_application_id uuid)
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
    join public.business_profiles bp on bp.id = o.business_id
    where a.id = p_application_id
      and bp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_customer() from public;
revoke all on function public.is_business() from public;
revoke all on function public.owns_offer(uuid) from public;
revoke all on function public.owns_application_offer(uuid) from public;

grant execute on function public.is_customer() to authenticated;
grant execute on function public.is_business() to authenticated;
grant execute on function public.owns_offer(uuid) to authenticated;
grant execute on function public.owns_application_offer(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 1 + 2  applications
-- -----------------------------------------------------------------------------

alter table public.applications enable row level security;
alter table public.applications force row level security;

drop policy if exists applications_insert_own on public.applications;
drop policy if exists applications_select_own on public.applications;
drop policy if exists applications_select_customer on public.applications;
drop policy if exists applications_select_salon on public.applications;
drop policy if exists applications_insert_customer on public.applications;
drop policy if exists applications_update_customer on public.applications;
drop policy if exists applications_update_salon on public.applications;
drop policy if exists applications_delete_customer on public.applications;

-- Kunde: nur eigene Zeilen lesen
create policy applications_select_customer
  on public.applications
  for select
  to authenticated
  using (customer_id = auth.uid() and public.is_customer());

-- Salon: nur Bewerbungen auf eigene Angebote
create policy applications_select_salon
  on public.applications
  for select
  to authenticated
  using (public.is_business() and public.owns_offer(offer_id));

-- Kunde: nur eigene pending Bewerbung anlegen
create policy applications_insert_customer
  on public.applications
  for insert
  to authenticated
  with check (
    customer_id = auth.uid()
    and public.is_customer()
    and status = 'pending'
  );

-- Kunde: eigene pending Bewerbung bearbeiten (nicht Status/fremdvergabe)
create policy applications_update_customer
  on public.applications
  for update
  to authenticated
  using (
    customer_id = auth.uid()
    and public.is_customer()
    and status = 'pending'
  )
  with check (
    customer_id = auth.uid()
    and public.is_customer()
    and status = 'pending'
  );

-- Salon: Status der Bewerbungen auf eigene Angebote setzen
create policy applications_update_salon
  on public.applications
  for update
  to authenticated
  using (public.is_business() and public.owns_offer(offer_id))
  with check (public.is_business() and public.owns_offer(offer_id));

-- Kunde: eigene pending Bewerbung zurückziehen
create policy applications_delete_customer
  on public.applications
  for delete
  to authenticated
  using (
    customer_id = auth.uid()
    and public.is_customer()
    and status = 'pending'
  );

-- Spalten-Wächter: Kunde ändert keinen Status; Salon ändert keine Bilder/IDs
create or replace function public.enforce_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.customer_id = auth.uid() then
    if new.customer_id is distinct from old.customer_id
       or new.offer_id is distinct from old.offer_id
       or new.status is distinct from old.status then
      raise exception 'Kunden dürfen nur Notizen und Bilder der eigenen pending Bewerbung ändern.';
    end if;
    return new;
  end if;

  if public.owns_offer(old.offer_id) then
    if new.customer_id is distinct from old.customer_id
       or new.offer_id is distinct from old.offer_id
       or new.uploaded_images is distinct from old.uploaded_images then
      raise exception 'Salons dürfen nur den Status der Bewerbung ändern.';
    end if;
    if new.status not in ('pending', 'accepted', 'rejected') then
      raise exception 'Ungültiger Bewerbungsstatus.';
    end if;
    return new;
  end if;

  raise exception 'Keine Berechtigung, diese Bewerbung zu ändern.';
end;
$$;

drop trigger if exists trg_enforce_application_update on public.applications;

create trigger trg_enforce_application_update
  before update on public.applications
  for each row
  execute function public.enforce_application_update();

-- Salon darf Profil der eigenen Bewerber lesen (Name, E-Mail, Telefon)
drop policy if exists users_select_applicants on public.users;

create policy users_select_applicants
  on public.users
  for select
  to authenticated
  using (
    public.is_business()
    and exists (
      select 1
      from public.applications a
      where a.customer_id = users.id
        and public.owns_offer(a.offer_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 3  Storage: application-images
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
drop policy if exists "application_images_select_own" on storage.objects;
drop policy if exists "application_images_select_salon" on storage.objects;
drop policy if exists "application_images_insert_own" on storage.objects;
drop policy if exists "application_images_update_own" on storage.objects;
drop policy if exists "application_images_delete_own" on storage.objects;

-- Kunde: nur den eigenen Ordner lesen
create policy application_images_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'application-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Salon: nur Bilder zu den eigenen Angeboten (2. Ordner = offer_id)
create policy application_images_select_salon
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'application-images'
    and public.is_business()
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_offer(((storage.foldername(name))[2])::uuid)
  );

-- Upload nur in den eigenen Kundenordner
create policy application_images_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'application-images'
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

-- Anon hat keinen Zugriff (kein Policy für anon = kein Zugriff bei aktivem RLS)

-- -----------------------------------------------------------------------------
-- 4  Storage: business-images (öffentliche Salon-Logos)
-- Pfad-Konvention: {business_id}/logo.{ext}
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
    public = excluded.public,
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
    and public.is_business()
    and exists (
      select 1
      from public.business_profiles
      where user_id = auth.uid()
        and id::text = (storage.foldername(name))[1]
    )
  );

create policy business_images_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-images'
    and public.is_business()
    and exists (
      select 1
      from public.business_profiles
      where user_id = auth.uid()
        and id::text = (storage.foldername(name))[1]
    )
  );

create policy business_images_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-images'
    and public.is_business()
    and exists (
      select 1
      from public.business_profiles
      where user_id = auth.uid()
        and id::text = (storage.foldername(name))[1]
    )
  );
