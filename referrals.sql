-- Salon-Empfehlungen. Im Supabase SQL Editor ausführen.

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users (id) on delete cascade,
  referred_user_id uuid not null unique references public.users (id) on delete cascade,
  reward_month text not null,
  created_at timestamptz not null default now(),
  constraint referrals_not_self check (referrer_user_id <> referred_user_id)
);

create index if not exists referrals_referrer_month_idx
  on public.referrals (referrer_user_id, reward_month);

alter table public.referrals enable row level security;
alter table public.referrals force row level security;

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
  on public.referrals
  for select
  to authenticated
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());
