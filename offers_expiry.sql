-- Automatische Bereinigung: abgelaufene Angebote bekommen den Status 'expired'.
-- Im Supabase SQL Editor ausführen.

-- offer_status ist ein Enum: 'expired' ergänzen, falls noch nicht vorhanden.
do $$
begin
  if exists (select 1 from pg_type where typname = 'offer_status') then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'offer_status' and e.enumlabel = 'expired'
    ) then
      alter type public.offer_status add value 'expired';
    end if;
  end if;
end
$$;

-- Der Cleanup-Job liest Angebote zusammen mit ihren Slots. Der Index auf
-- offer_slots.start_time hält die Abfrage auch bei vielen Terminen schnell.
create index if not exists offer_slots_start_time_idx on public.offer_slots (start_time);

-- Optional in der Datenbank: dieselbe Regel wie der Next.js-Job.
-- Alle Termine in der Vergangenheit und mindestens ein ungebuchter Slot.
create or replace function public.expire_unbooked_past_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  begin
    update public.offers o
    set status = 'expired'
    where o.status::text in ('active', 'full', 'fully_booked')
      and exists (
        select 1 from public.offer_slots s where s.offer_id = o.id
      )
      and not exists (
        select 1
        from public.offer_slots s
        where s.offer_id = o.id
          and s.start_time >= timezone('utc', now())
      )
      and exists (
        select 1
        from public.offer_slots s
        where s.offer_id = o.id
          and coalesce(s.is_booked, false) = false
      );
  exception
    when invalid_text_representation then
      update public.offers o
      set status = 'inactive'
      where o.status::text in ('active', 'full', 'fully_booked')
        and exists (
          select 1 from public.offer_slots s where s.offer_id = o.id
        )
        and not exists (
          select 1
          from public.offer_slots s
          where s.offer_id = o.id
            and s.start_time >= timezone('utc', now())
        )
        and exists (
          select 1
          from public.offer_slots s
          where s.offer_id = o.id
            and coalesce(s.is_booked, false) = false
        );
  end;

  get diagnostics n = row_count;
  return n;
end;
$$;
