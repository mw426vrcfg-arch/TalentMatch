-- Salon-Profil: Adresse, Telefon, Logo (einmal im Supabase SQL Editor ausführen)

alter table public.business_profiles
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images',
  'business-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
