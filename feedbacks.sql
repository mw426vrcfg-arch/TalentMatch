-- Feedback-Backup. Jede Nachricht wird gespeichert, auch wenn der Mailversand fehlschlägt.
-- Im Supabase SQL-Editor ausführen. Idempotent.

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text not null,
  user_email text,
  created_at timestamptz not null default now()
);

alter table public.feedbacks
  drop constraint if exists feedbacks_user_id_fkey;

create index if not exists feedbacks_user_id_idx on public.feedbacks (user_id);
create index if not exists feedbacks_created_at_idx on public.feedbacks (created_at desc);

alter table public.feedbacks enable row level security;
alter table public.feedbacks force row level security;

drop policy if exists feedbacks_insert_own on public.feedbacks;
create policy feedbacks_insert_own
  on public.feedbacks for insert
  to authenticated
  with check (user_id = auth.uid());

grant insert, select on table public.feedbacks to authenticated;
grant all on table public.feedbacks to service_role;

notify pgrst, 'reload schema';
