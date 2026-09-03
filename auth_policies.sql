-- TalentMatch – Auth-Policies und Trigger-Update
-- Nach dem ersten schema.sql im Supabase SQL Editor ausführen.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.user_role;
begin
  new_role := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'::public.user_role
    when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'::public.user_role
    else 'customer'::public.user_role
  end;

  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new_role
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.users.full_name),
      phone = coalesce(excluded.phone, public.users.phone),
      role = excluded.role;

  if new_role = 'business' then
    insert into public.business_profiles (user_id, business_name, location)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'Mein Salon'),
      coalesce(new.raw_user_meta_data ->> 'location', '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists business_profiles_select_own on public.business_profiles;
create policy business_profiles_select_own
  on public.business_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists business_profiles_insert_own on public.business_profiles;
create policy business_profiles_insert_own
  on public.business_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists business_profiles_update_own on public.business_profiles;
create policy business_profiles_update_own
  on public.business_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists offers_select_own on public.offers;
create policy offers_select_own
  on public.offers for select
  to authenticated
  using (
    business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

drop policy if exists offers_insert_own on public.offers;
create policy offers_insert_own
  on public.offers for insert
  to authenticated
  with check (
    business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "offers_update_policy" on public.offers;
drop policy if exists offers_update_policy on public.offers;
create policy "offers_update_policy"
  on public.offers for update
  to authenticated
  using (
    business_id = auth.uid()
    or business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  )
  with check (
    business_id = auth.uid()
    or business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

drop policy if exists offer_slots_select_own on public.offer_slots;
create policy offer_slots_select_own
  on public.offer_slots for select
  to authenticated
  using (
    offer_id in (
      select offers.id
      from public.offers
      join public.business_profiles on business_profiles.id = offers.business_id
      where business_profiles.user_id = auth.uid()
    )
  );

drop policy if exists offer_slots_insert_own on public.offer_slots;
create policy offer_slots_insert_own
  on public.offer_slots for insert
  to authenticated
  with check (
    offer_id in (
      select offers.id
      from public.offers
      join public.business_profiles on business_profiles.id = offers.business_id
      where business_profiles.user_id = auth.uid()
    )
  );

drop policy if exists offers_select_active on public.offers;
create policy offers_select_active
  on public.offers for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists offer_slots_select_active on public.offer_slots;
create policy offer_slots_select_active
  on public.offer_slots for select
  to anon, authenticated
  using (
    offer_id in (
      select id from public.offers where status = 'active'
    )
  );

drop policy if exists business_profiles_select_public on public.business_profiles;
create policy business_profiles_select_public
  on public.business_profiles for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.offers
      where offers.business_id = business_profiles.id
        and offers.status = 'active'
    )
  );

drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own
  on public.applications for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists applications_select_own on public.applications;
create policy applications_select_own
  on public.applications for select
  to authenticated
  using (customer_id = auth.uid());
