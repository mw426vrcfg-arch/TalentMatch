-- Wunschtermin anfragen: Status + Freitext-Zeitfenster + Chat vor der Zusage.
-- Im Supabase SQL Editor ausführen.

do $$
begin
  alter type public.application_status add value if not exists 'requested_custom_time';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table public.applications
  add column if not exists custom_time_notes text;

do $$
begin
  alter table public.applications drop constraint if exists applications_status_check;
  alter table public.applications add constraint applications_status_check check (
    status::text in (
      'pending',
      'accepted',
      'rejected',
      'cancelled_by_customer',
      'cancelled_by_salon',
      'requested_custom_time'
    )
  );
exception
  when others then null;
end $$;

-- Chat zwischen Kunde und Salon schon bei Wunschanfragen (ohne Booking).
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
      and a.status::text in (
        'accepted',
        'requested_custom_time',
        'swap_requested'
      )
      and (
        a.customer_id = auth.uid()
        or bp.user_id = auth.uid()
        or bp.id = auth.uid()
        or o.business_id = auth.uid()
      )
  );
$$;

do $$
begin
  alter table public.messages alter column booking_id drop not null;
exception
  when undefined_column then null;
  when others then null;
end $$;
