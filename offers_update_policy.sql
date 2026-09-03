-- =============================================================================
-- TalentMatch – RLS: Angebote dürfen nur vom besitzenden Salon geändert werden
-- Supabase → SQL Editor → gesamtes Skript ausführen.
--
-- Spec: auth.uid() = salon_id
-- Live-Schema: die Besitzer-Spalte auf public.offers heisst business_id
-- (UUID von business_profiles). auth.uid() ist der Login-User, nicht das
-- Salonprofil. Deshalb gilt die Regel über den Join:
--   auth.uid() = business_profiles.user_id  AND  offers.business_id = business_profiles.id
-- Zusätzlich: ältere Zeilen, in denen business_id direkt auth.uid() speichert.
-- =============================================================================

drop policy if exists "offers_update_policy" on public.offers;
drop policy if exists offers_update_policy on public.offers;

create policy "offers_update_policy"
  on public.offers
  for update
  to authenticated
  using (
    business_id = auth.uid()
    or business_id in (
      select id
      from public.business_profiles
      where user_id = auth.uid()
    )
  )
  with check (
    business_id = auth.uid()
    or business_id in (
      select id
      from public.business_profiles
      where user_id = auth.uid()
    )
  );
