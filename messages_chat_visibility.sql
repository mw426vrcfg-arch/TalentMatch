-- =============================================================================
-- TalentMatch – Chat-Sichtbarkeit (beide Seiten des Gesprächs)
-- Im Supabase SQL Editor ausführen.
--
-- Behebt: Jeder sieht nur die eigenen Nachrichten, weil
--   1) SELECT-Policies auf sender_id / from_user_id = auth.uid() beschränkt waren
--   2) booking_id (Live-Thread) bei neuen Nachrichten NULL blieb
-- =============================================================================

-- Teilnehmer = Kunde der Bewerbung oder Inhaber des Salons.
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

-- Thread-ID kann applications.id (Live-Schema in booking_id) oder bookings.id sein.
create or replace function public.can_read_chat_message(p_thread_id uuid, p_sender uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p_sender = auth.uid(), false)
    or (
      p_thread_id is not null
      and (
        public.is_chat_participant(p_thread_id)
        or exists (
          select 1
          from public.bookings b
          where b.id = p_thread_id
            and public.is_chat_participant(b.application_id)
        )
      )
    );
$$;

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
      and a.status::text in (
        'accepted',
        'requested_custom_time',
        'swap_requested',
        'confirmed',
        'completed'
      )
  )
  and public.is_chat_participant(p_application_id);
$$;

revoke all on function public.is_chat_participant(uuid) from public;
revoke all on function public.can_read_chat_message(uuid, uuid) from public;
revoke all on function public.can_chat_on_application(uuid) from public;
grant execute on function public.is_chat_participant(uuid) to authenticated;
grant execute on function public.can_read_chat_message(uuid, uuid) to authenticated;
grant execute on function public.can_chat_on_application(uuid) to authenticated;

alter table public.messages enable row level security;
alter table public.messages force row level security;

drop policy if exists messages_select_participants on public.messages;
drop policy if exists messages_select_booking_participants on public.messages;
drop policy if exists messages_insert_own on public.messages;
drop policy if exists messages_insert_booking_own on public.messages;

do $$
declare
  has_from boolean;
  has_sender boolean;
  has_app boolean;
  has_booking boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'from_user_id'
  ) into has_from;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'sender_id'
  ) into has_sender;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'application_id'
  ) into has_app;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'booking_id'
  ) into has_booking;

  if has_from and has_booking then
    execute $p$
      create policy messages_select_booking_participants
        on public.messages
        for select
        to authenticated
        using (public.can_read_chat_message(booking_id, from_user_id))
    $p$;
    execute $p$
      create policy messages_insert_booking_own
        on public.messages
        for insert
        to authenticated
        with check (
          from_user_id = auth.uid()
          and public.can_read_chat_message(booking_id, from_user_id)
        )
    $p$;
  end if;

  if has_sender and has_app then
    execute $p$
      create policy messages_select_participants
        on public.messages
        for select
        to authenticated
        using (
          sender_id = auth.uid()
          or public.is_chat_participant(application_id)
          or public.can_read_chat_message(booking_id, sender_id)
        )
    $p$;
    execute $p$
      create policy messages_insert_own
        on public.messages
        for insert
        to authenticated
        with check (
          sender_id = auth.uid()
          and (
            public.can_chat_on_application(application_id)
            or public.is_chat_participant(application_id)
          )
        )
    $p$;
  end if;
end $$;

grant select, insert on table public.messages to authenticated;

alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- Orphan-Nachrichten (booking_id IS NULL) der passenden Bewerbung zuordnen.
-- Live-Schema speichert den Chat-Thread in booking_id (= applications.id).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'from_user_id'
  ) then
    update public.messages m
    set booking_id = matched.application_id
    from (
      select distinct on (m2.id)
        m2.id,
        a.id as application_id
      from public.messages m2
      join public.applications a
        on a.customer_id = m2.from_user_id
        or exists (
          select 1
          from public.offers o
          left join public.business_profiles bp
            on bp.id = o.business_id
            or bp.user_id = o.business_id
          where o.id = a.offer_id
            and (
              bp.user_id = m2.from_user_id
              or bp.id = m2.from_user_id
              or o.business_id = m2.from_user_id
            )
        )
      where m2.booking_id is null
      order by m2.id, a.created_at desc
    ) matched
    where m.id = matched.id
      and m.booking_id is null;
  end if;
end $$;
