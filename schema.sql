-- =============================================================================
-- TalentMatch – Datenbankschema (Supabase / PostgreSQL)
-- Quelle: master_design.txt, Kapitel 7
--
-- Anwendung: Supabase Dashboard → SQL Editor → gesamtes Skript ausführen
-- Voraussetzung: Auth ist aktiv (auth.users). public.users.id verweist darauf.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums (Statuswerte aus Kapitel 7)
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('customer', 'business', 'admin');

create type public.offer_status as enum ('active', 'inactive', 'full', 'expired');

create type public.application_status as enum ('pending', 'accepted', 'rejected');

create type public.payment_status as enum ('pending', 'paid', 'refunded');

create type public.booking_status as enum (
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

-- -----------------------------------------------------------------------------
-- 7.1 users
-- Profil zur Supabase-Auth. Eine Zeile pro Konto.
-- -----------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'customer',
  full_name text not null default '',
  phone text,
  account_status text not null default 'aktiv',
  created_at timestamptz not null default now()
);

create index users_role_idx on public.users (role);

-- -----------------------------------------------------------------------------
-- 7.2 business_profiles
-- Ein Salon-Profil pro Business-User.
-- -----------------------------------------------------------------------------

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  business_name text not null,
  location text not null,
  address text,
  phone text,
  logo_url text,
  description text,
  gender text,
  contact_gender text,
  instagram text,
  stripe_account_id text,
  subscription_plan text not null default 'free',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index business_profiles_location_idx on public.business_profiles (location);

-- -----------------------------------------------------------------------------
-- 7.3 offers
-- Angebotsseite: Deals eines Salons.
-- -----------------------------------------------------------------------------

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles (id) on delete cascade,
  title text not null,
  description text,
  service_type text not null,
  normal_price numeric(10, 2) not null,
  discount_price numeric(10, 2) not null,
  duration_minutes integer not null,
  requirements text,
  status public.offer_status not null default 'active',
  is_urgent boolean not null default false,
  image_url text,
  created_at timestamptz not null default now(),
  constraint offers_prices_non_negative check (
    normal_price >= 0
    and discount_price >= 0
  ),
  constraint offers_duration_positive check (duration_minutes > 0)
);

create index offers_business_id_idx on public.offers (business_id);
create index offers_status_idx on public.offers (status);
create index offers_is_urgent_idx on public.offers (is_urgent) where is_urgent = true;
create index offers_service_type_idx on public.offers (service_type);

-- -----------------------------------------------------------------------------
-- 7.4 offer_slots
-- Verfügbare Termine zu einem Angebot.
-- -----------------------------------------------------------------------------

create table public.offer_slots (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_booked boolean not null default false,
  constraint offer_slots_time_order check (end_time > start_time)
);

create index offer_slots_offer_id_idx on public.offer_slots (offer_id);
create index offer_slots_start_time_idx on public.offer_slots (start_time);
create index offer_slots_available_idx on public.offer_slots (offer_id)
  where is_booked = false;

-- -----------------------------------------------------------------------------
-- 7.5 applications (Kern-Tabelle)
-- Bewerbung eines Kunden auf ein Angebot (kein Direkt-Booking).
-- uploaded_images: URLs in Supabase Storage.
-- -----------------------------------------------------------------------------

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  uploaded_images text[] not null default '{}',
  notes text,
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index applications_offer_id_idx on public.applications (offer_id);
create index applications_customer_id_idx on public.applications (customer_id);
create index applications_status_idx on public.applications (status);

-- -----------------------------------------------------------------------------
-- 7.6 bookings
-- Entsteht nach Annahme + erfolgreicher Zahlung.
-- -----------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete restrict,
  slot_id uuid not null unique references public.offer_slots (id) on delete restrict,
  payment_status public.payment_status not null default 'pending',
  booking_status public.booking_status not null default 'confirmed',
  deposit_amount numeric(10, 2) not null default 0,
  platform_fee numeric(10, 2) not null default 0,
  salon_payout numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint bookings_amounts_non_negative check (
    deposit_amount >= 0
    and platform_fee >= 0
    and salon_payout >= 0
  )
);

create index bookings_payment_status_idx on public.bookings (payment_status);
create index bookings_booking_status_idx on public.bookings (booking_status);

-- -----------------------------------------------------------------------------
-- 7.7 strikes
-- No-Show / Missbrauch: 1 Warnung, 2 temporärer Block, 3 Ban (App-Logik).
-- -----------------------------------------------------------------------------

create table public.strikes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expired_at timestamptz
);

create index strikes_customer_id_idx on public.strikes (customer_id);
create index strikes_active_idx on public.strikes (customer_id)
  where active = true;

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  reviewee_id uuid not null references public.users (id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint ratings_rating_range check (rating >= 1 and rating <= 5),
  constraint ratings_one_per_from_user unique (booking_id, from_user_id),
  constraint ratings_not_self check (from_user_id <> reviewee_id)
);

create index ratings_booking_id_idx on public.ratings (booking_id);
create index ratings_from_user_id_idx on public.ratings (from_user_id);
create index ratings_reviewee_id_idx on public.ratings (reviewee_id);

-- -----------------------------------------------------------------------------
-- 7.8 reviews
-- Nach completed Booking: Kunde und Salon können je einmal bewerten.
-- -----------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating >= 1 and rating <= 5),
  constraint reviews_one_per_reviewer unique (booking_id, reviewer_id)
);

create index reviews_booking_id_idx on public.reviews (booking_id);
create index reviews_reviewer_id_idx on public.reviews (reviewer_id);

-- -----------------------------------------------------------------------------
-- notifications (In-App, ohne Stripe-Zwischenschritt)
-- -----------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  application_id uuid references public.applications (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  is_read boolean not null default false,
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

create index notifications_user_id_idx
  on public.notifications (user_id, created_at desc);

create index notifications_unread_idx
  on public.notifications (user_id)
  where is_read = false;


-- -----------------------------------------------------------------------------
-- Auth-Hook: Profilzeile anlegen, sobald sich jemand registriert
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.user_role;
begin
  new_role := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'::public.user_role
    when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'::public.user_role
    else 'customer'::public.user_role
  end;

  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new_role
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.users.full_name),
      phone = coalesce(excluded.phone, public.users.phone),
      role = excluded.role;

  if new_role = 'business' then
    insert into public.business_profiles (user_id, business_name, location)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'Mein Salon'),
      coalesce(new.raw_user_meta_data ->> 'location', '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Tabellen sind gesperrt, bis in einem späteren Schritt Policies kommen.
-- Der Service-Role-Key (Server) umgeht RLS weiterhin.
-- -----------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.business_profiles enable row level security;
alter table public.offers enable row level security;
alter table public.offer_slots enable row level security;
alter table public.applications enable row level security;
alter table public.bookings enable row level security;
alter table public.strikes enable row level security;
alter table public.reviews enable row level security;
alter table public.ratings enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists business_profiles_select_own on public.business_profiles;
create policy business_profiles_select_own
  on public.business_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists business_profiles_insert_own on public.business_profiles;
create policy business_profiles_insert_own
  on public.business_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists business_profiles_update_own on public.business_profiles;
create policy business_profiles_update_own
  on public.business_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists offers_select_own on public.offers;
create policy offers_select_own
  on public.offers for select
  to authenticated
  using (
    business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

drop policy if exists offers_insert_own on public.offers;
create policy offers_insert_own
  on public.offers for insert
  to authenticated
  with check (
    business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "offers_update_policy" on public.offers;
drop policy if exists offers_update_policy on public.offers;
create policy "offers_update_policy"
  on public.offers for update
  to authenticated
  using (
    business_id = auth.uid()
    or business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  )
  with check (
    business_id = auth.uid()
    or business_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

drop policy if exists offer_slots_select_own on public.offer_slots;
create policy offer_slots_select_own
  on public.offer_slots for select
  to authenticated
  using (
    offer_id in (
      select offers.id
      from public.offers
      join public.business_profiles on business_profiles.id = offers.business_id
      where business_profiles.user_id = auth.uid()
    )
  );

drop policy if exists offer_slots_insert_own on public.offer_slots;
create policy offer_slots_insert_own
  on public.offer_slots for insert
  to authenticated
  with check (
    offer_id in (
      select offers.id
      from public.offers
      join public.business_profiles on business_profiles.id = offers.business_id
      where business_profiles.user_id = auth.uid()
    )
  );

drop policy if exists offers_select_active on public.offers;
create policy offers_select_active
  on public.offers for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists offer_slots_select_active on public.offer_slots;
create policy offer_slots_select_active
  on public.offer_slots for select
  to anon, authenticated
  using (
    offer_id in (
      select id from public.offers where status = 'active'
    )
  );

drop policy if exists business_profiles_select_public on public.business_profiles;
create policy business_profiles_select_public
  on public.business_profiles for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.offers
      where offers.business_id = business_profiles.id
        and offers.status = 'active'
    )
  );

drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own
  on public.applications for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists applications_select_own on public.applications;
create policy applications_select_own
  on public.applications for select
  to authenticated
  using (customer_id = auth.uid());

alter table public.notifications enable row level security;

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

drop policy if exists strikes_select_own on public.strikes;
create policy strikes_select_own
  on public.strikes
  for select
  to authenticated
  using (customer_id = auth.uid());

