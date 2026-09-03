-- Automatische Bereinigung: abgelaufene Angebote bekommen den Status 'expired'.
-- Im Supabase SQL Editor ausführen.

-- offer_status ist ein Enum: 'expired' ergänzen, falls noch nicht vorhanden.
do $$
begin
  if exists (select 1 from pg_type where typname = 'offer_status') then
    if not exists (
      select 1
    10|      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'offer_status' and e.enumlabel = 'expired'
    ) then
      alter type public.offer_status add value 'expired';
    end if;
  end if;
end
$$;

    20|-- Der Cleanup-Job liest Angebote zusammen mit ihren Slots. Der Index auf
-- offer_slots.start_time hält die Abfrage auch bei vielen Terminen schnell.
create index if not exists offer_slots_start_time_idx on public.offer_slots (start_time);
