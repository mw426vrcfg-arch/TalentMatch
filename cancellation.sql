-- Kapitel 5.3: Stornierungs-Status + Push-Typ.
-- Im Supabase SQL Editor ausführen.

do $$
begin
  alter type public.application_status add value if not exists 'cancelled_by_customer';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter type public.application_status add value if not exists 'cancelled_by_salon';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter table public.applications drop constraint if exists applications_status_check;
  alter table public.applications add constraint applications_status_check check (
    status::text in (
      'pending',
      'accepted',
      'rejected',
      'cancelled_by_customer',
      'cancelled_by_salon'
    )
  );
exception
  when others then null;
end $$;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'application_received',
    'application_accepted',
    'application_rejected',
    'booking_confirmed',
    'offer_published',
    'booking_cancelled'
  )
);
