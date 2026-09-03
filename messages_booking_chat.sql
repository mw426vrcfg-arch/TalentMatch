-- Chat-Realtime für die Live-Spalten booking_id / from_user_id / message.
-- Im Supabase SQL Editor ausführen, damit INSERT-Events auf beiden Geräten ankommen.

alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.can_chat_on_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.applications a on a.id = b.application_id
    join public.offers o on o.id = a.offer_id
    left join public.business_profiles bp
      on bp.id = o.business_id
      or bp.user_id = o.business_id
    where b.id = p_booking_id
      and a.status = 'accepted'
      and (
        a.customer_id = auth.uid()
        or bp.user_id = auth.uid()
        or bp.id = auth.uid()
        or o.business_id = auth.uid()
      )
  );
$$;

revoke all on function public.can_chat_on_booking(uuid) from public;
grant execute on function public.can_chat_on_booking(uuid) to authenticated;

alter table public.messages enable row level security;
alter table public.messages force row level security;

drop policy if exists messages_select_booking_participants on public.messages;
create policy messages_select_booking_participants
  on public.messages
  for select
  to authenticated
  using (
    from_user_id = auth.uid()
    or public.is_chat_participant(booking_id)
    or public.can_chat_on_booking(booking_id)
  );

drop policy if exists messages_insert_booking_own on public.messages;
create policy messages_insert_booking_own
  on public.messages
  for insert
  to authenticated
  with check (
    from_user_id = auth.uid()
    and (
      public.is_chat_participant(booking_id)
      or public.can_chat_on_booking(booking_id)
    )
  );
