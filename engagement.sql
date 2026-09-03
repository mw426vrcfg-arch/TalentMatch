-- Engagement: Beauty-Punkte, Member-Level, VIP Early Access.
-- Im Supabase SQL Editor ausführen.

alter table public.customer_profiles
  add column if not exists beauty_points integer not null default 0;

alter table public.customer_profiles
  add column if not exists member_level text not null default 'Bronze';

alter table public.offers
  add column if not exists vip_early_access boolean not null default false;
