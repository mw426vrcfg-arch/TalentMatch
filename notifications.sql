-- =============================================================================
-- TalentMatch – notifications
-- Im Supabase SQL Editor ausführen.
-- =============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  application_id uuid references public.applications (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'application_received',
      'application_accepted',
      'application_rejected',
      'booking_confirmed'
    )
  )
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts nur über Service Role / Server (kein Policy für INSERT = kein Client-Insert)

alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;

drop policy if exists strikes_select_own on public.strikes;
create policy strikes_select_own
  on public.strikes
  for select
  to authenticated
  using (customer_id = auth.uid());

alter table public.strikes replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.strikes;
exception
  when duplicate_object then null;
end;
$$;
