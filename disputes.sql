-- Multi-Modell-Slots, Good-Behavior-Reset, Reaktivierung, Streitfälle.
-- Im Supabase SQL Editor ausführen.

alter table public.offers add column if not exists available_slots integer;

update public.offers
set available_slots = (
  select count(*)::int
  from public.offer_slots
  where offer_slots.offer_id = offers.id
    and offer_slots.is_booked = false
)
where available_slots is null;

alter table public.users add column if not exists good_behavior_reset_at timestamptz;
alter table public.strikes add column if not exists cleared_reason text;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_user_id uuid not null references public.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists disputes_reporter_id_idx on public.disputes (reporter_id, created_at desc);
create index if not exists disputes_status_idx on public.disputes (status);

alter table public.disputes enable row level security;
alter table public.disputes force row level security;

drop policy if exists disputes_select_own on public.disputes;
create policy disputes_select_own
  on public.disputes
  for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists disputes_insert_own on public.disputes;
create policy disputes_insert_own
  on public.disputes
  for insert
  to authenticated
  with check (reporter_id = auth.uid());
