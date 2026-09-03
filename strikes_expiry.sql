-- Strike-Verjährung nach exakt 6 Monaten (Kapitel 5).
-- In Supabase SQL Editor ausführen. Die Auth-Freischaltung macht zusätzlich
-- der Next.js-Cron `/api/cron/expire-strikes` (ban_duration = none).

alter table public.users
  add column if not exists account_status text not null default 'aktiv';

alter table public.strikes
  add column if not exists expired_at timestamptz;

update public.users
set account_status = 'aktiv'
where account_status is null or account_status = '';

-- Optional: per pg_cron täglich ausführen.
create or replace function public.expire_strikes_after_six_months()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.strikes
  set
    active = false,
    expired_at = coalesce(expired_at, now())
  where active = true
    and created_at <= (now() - interval '6 months');

  get diagnostics expired_count = row_count;

  update public.users
  set account_status = 'aktiv'
  where id in (
    select customer_id
    from public.strikes
    group by customer_id
    having count(*) filter (where active) < 3
  )
  and coalesce(account_status, '') in ('gesperrt', 'banned', 'restricted', '');

  return expired_count;
end;
$$;
