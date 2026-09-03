-- Angebotsbilder: öffentliche URL in offers.image_url, Dateien im Bucket business-images.
alter table public.offers add column if not exists image_url text;
