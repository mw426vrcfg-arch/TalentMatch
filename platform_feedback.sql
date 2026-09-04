-- Feedback an das Admin-Team.
-- Im Supabase SQL-Editor ausführen. Idempotent.

create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  user_email text,
  created_at timestamptz not null default now()
);

alter table public.platform_feedback
  add column if not exists user_email text;

alter table public.platform_feedback enable row level security;
alter table public.platform_feedback force row level security;

drop policy if exists platform_feedback_insert_own on public.platform_feedback;
create policy platform_feedback_insert_own
  on public.platform_feedback for insert
  to authenticated
  with check (user_id = auth.uid());

grant insert, select on table public.platform_feedback to authenticated;
grant all on table public.platform_feedback to service_role;

notify pgrst, 'reload schema';
