-- Slot Swap Request: Terminverschiebung auf Anfrage des Modells.
-- Im Supabase SQL Editor ausführen.

alter table public.bookings
  add column if not exists requested_slot_id uuid references public.offer_slots (id) on delete set null;

create index if not exists bookings_requested_slot_id_idx on public.bookings (requested_slot_id);

-- booking_status ist ein Enum: 'swap_requested' ergänzen, falls noch nicht vorhanden.
do $$
begin
  if exists (select 1 from pg_type where typname = 'booking_status') then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'booking_status' and e.enumlabel = 'swap_requested'
    ) then
      alter type public.booking_status add value 'swap_requested';
    end if;
  end if;
end
$$;

-- Neue Notification-Typen für Verschiebungsanfragen zulassen.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'application_received',
    'application_accepted',
    'application_rejected',
    'booking_confirmed',
    'booking_cancelled',
    'offer_published',
    'swap_requested',
    'swap_accepted',
    'swap_rejected'
  )
);
