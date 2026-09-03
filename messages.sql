-- =============================================================================
-- TalentMatch – In-App Messaging (Kapitel 4.5.1)
-- Im Supabase SQL Editor ausführen.
-- Danach Realtime für public.messages in Database → Replication prüfen.
-- =============================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (
    char_length(trim(body)) between 1 and 2000
  )
);

create index if not exists messages_application_id_idx
  on public.messages (application_id, created_at asc);

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

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
    join public.offers o on o.id = a.offer_id
    left join public.business_profiles bp
      on bp.id = o.business_id
      or bp.user_id = o.business_id
    where a.id = p_application_id
      and a.status = 'accepted'
      and (
        a.customer_id = auth.uid()
        or bp.user_id = auth.uid()
        or o.business_id = auth.uid()
      )
  );
$$;

revoke all on function public.can_chat_on_application(uuid) from public;
grant execute on function public.can_chat_on_application(uuid) to authenticated;

alter table public.messages enable row level security;
alter table public.messages force row level security;

drop policy if exists messages_select_participants on public.messages;
create policy messages_select_participants
  on public.messages
  for select
  to authenticated
  using (public.can_chat_on_application(application_id));

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_chat_on_application(application_id)
  );

grant select, insert on table public.messages to authenticated;

alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;
