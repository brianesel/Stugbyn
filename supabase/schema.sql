-- Stugbyn: one row of saved progress per user. Run once in the Supabase SQL editor.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row level security: every user can only see and change their own row.
alter table public.progress enable row level security;

drop policy if exists "progress: read own" on public.progress;
drop policy if exists "progress: insert own" on public.progress;
drop policy if exists "progress: update own" on public.progress;
drop policy if exists "progress: delete own" on public.progress;

create policy "progress: read own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress: insert own" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress: update own" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress: delete own" on public.progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Lets a signed-in user delete their own account (and, through the cascade, their progress).
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
